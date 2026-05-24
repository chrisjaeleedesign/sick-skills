import base64
import importlib
import importlib.util
import io
import json
import os
import sys
import tempfile
import unittest
import warnings
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = REPO_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

warnings.filterwarnings(
    "ignore",
    message="urllib3 v2 only supports OpenSSL.*",
)

from model_runtime import (
    call_model_normalized,
    collect_attachments,
    default_model_for_role,
    load_config,
    model_has_capability,
    resolve_content,
    resolve_model_info,
)
from model_runtime.artifacts import save_data_url_images
from model_runtime.messages import build_messages_for_api


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class ChangeDir:
    def __init__(self, path):
        self.path = path
        self.previous = None

    def __enter__(self):
        self.previous = Path.cwd()
        os.chdir(self.path)

    def __exit__(self, exc_type, exc, tb):
        os.chdir(self.previous)


class ModelRegistryTests(unittest.TestCase):
    def test_aliases_defaults_capabilities_and_fallback(self):
        config = load_config()

        self.assertEqual(default_model_for_role(config), "gpt5")
        self.assertEqual(default_model_for_role(config, "summarizer"), "mini")
        self.assertEqual(default_model_for_role(config, "image"), "nanobanana")

        gpt5 = resolve_model_info("gpt5", config)
        self.assertEqual(gpt5.provider, "openai")
        self.assertEqual(gpt5.model_id, "gpt-5.4")
        self.assertIn("text", gpt5.capabilities)

        sonnet = resolve_model_info("anthropic/claude-sonnet-4-6", config)
        self.assertEqual(sonnet.provider, "openrouter")
        self.assertEqual(sonnet.model_id, "anthropic/claude-sonnet-4-6")

        self.assertTrue(model_has_capability("nanobanana", config, "image"))
        self.assertFalse(model_has_capability("nanobanana", config, "text"))


class MessageAndAttachmentTests(unittest.TestCase):
    def test_content_attachments_and_message_assembly(self):
        config = load_config()
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            text_file = tmp_path / "context.txt"
            text_file.write_text("file context")

            self.assertEqual(resolve_content(str(text_file)), "file context")
            self.assertEqual(resolve_content("literal prompt"), "literal prompt")

            with patch("sys.stderr", io.StringIO()):
                attachments = collect_attachments(
                    [str(text_file), str(tmp_path / "missing.txt")]
                )
            self.assertEqual(len(attachments), 1)
            self.assertEqual(attachments[0]["mime"], "text/plain")

            messages = build_messages_for_api(
                [
                    {"type": "user", "content": "previous question", "attachments": []},
                    {"type": "assistant", "content": "previous answer", "attachments": []},
                ],
                "system instructions",
                "current question",
                attachments,
                config=config,
            )

            self.assertEqual(messages[0], {"role": "system", "content": "system instructions"})
            self.assertEqual(messages[1], {"role": "user", "content": "previous question"})
            self.assertEqual(messages[2], {"role": "assistant", "content": "previous answer"})
            self.assertEqual(messages[3]["role"], "user")
            self.assertEqual(messages[3]["content"][0], {"type": "text", "text": "current question"})
            self.assertEqual(messages[3]["content"][1]["type"], "text")
            self.assertIn("file context", messages[3]["content"][1]["text"])


class ArtifactTests(unittest.TestCase):
    def test_save_data_url_images_creates_paths_and_skips_invalid_payloads(self):
        with tempfile.TemporaryDirectory() as tmp:
            data = base64.b64encode(b"png-bytes").decode("ascii")
            saved = save_data_url_images(
                [
                    {"image_url": {"url": f"data:image/png;base64,{data}"}},
                    {"image_url": {"url": "https://example.com/not-inline.png"}},
                    {},
                ],
                artifact_dir=tmp,
            )

            self.assertEqual(len(saved), 1)
            self.assertTrue(saved[0].endswith(".png"))
            self.assertEqual(Path(saved[0]).read_bytes(), b"png-bytes")


class ProviderDispatchTests(unittest.TestCase):
    def test_call_model_normalized_uses_resolved_provider(self):
        config = load_config()
        fake_provider = SimpleNamespace(
            call=lambda messages, model, thinking=None: {
                "text": f"{model}:{messages[0]['content']}:{thinking}",
                "images": ["/tmp/result.png"],
            }
        )

        with patch("model_runtime.client._import_provider", return_value=fake_provider):
            result = call_model_normalized(
                "nanobanana",
                config,
                [{"role": "user", "content": "draw"}],
                thinking="low",
            )

        self.assertEqual(result["provider"], "openrouter")
        self.assertEqual(result["model"], "google/gemini-3.1-flash-image-preview")
        self.assertEqual(result["images"], ["/tmp/result.png"])
        self.assertIn("draw", result["text"])


class ProviderAdapterTests(unittest.TestCase):
    def test_openrouter_text_request_and_error(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            openrouter = importlib.import_module("providers.openrouter")

        captured = {}

        class Response:
            status_code = 200
            text = "ok"

            def json(self):
                return {"choices": [{"message": {"content": "answer"}}]}

        def fake_post(url, headers, json, timeout, **kwargs):
            captured["url"] = url
            captured["headers"] = headers
            captured["json"] = json
            captured["timeout"] = timeout
            return Response()

        with patch.dict(os.environ, {"OPENROUTER_API_KEY": "key"}):
            with patch("providers.openrouter.requests.post", side_effect=fake_post):
                text = openrouter.call(
                    [{"role": "user", "content": "hi"}],
                    "anthropic/test",
                    thinking="high",
                )

        self.assertEqual(text, "answer")
        self.assertEqual(captured["json"]["model"], "anthropic/test")
        self.assertEqual(captured["json"]["reasoning"], {"effort": "high"})
        self.assertIn("Bearer key", captured["headers"]["Authorization"])

        class ErrorResponse:
            status_code = 429
            text = "rate limited"

        with patch.dict(os.environ, {"OPENROUTER_API_KEY": "key"}):
            with patch("providers.openrouter.requests.post", return_value=ErrorResponse()):
                with patch("sys.stderr", io.StringIO()):
                    with self.assertRaises(RuntimeError):
                        openrouter.call(
                            [{"role": "user", "content": "hi"}],
                            "anthropic/test",
                        )

    def test_openrouter_image_response_saves_artifact(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            openrouter = importlib.import_module("providers.openrouter")

        class Response:
            status_code = 200
            text = "ok"

            def json(self):
                data = base64.b64encode(b"image").decode("ascii")
                return {
                    "choices": [
                        {
                            "message": {
                                "content": "caption",
                                "images": [
                                    {"image_url": {"url": f"data:image/png;base64,{data}"}}
                                ],
                            }
                        }
                    ]
                }

        with tempfile.TemporaryDirectory() as tmp:
            with patch.dict(
                os.environ,
                {"OPENROUTER_API_KEY": "key", "MODEL_RUNTIME_IMAGE_DIR": tmp},
            ):
                with patch("providers.openrouter.requests.post", return_value=Response()):
                    result = openrouter.call(
                        [{"role": "user", "content": "draw"}],
                        "google/image",
                    )

            self.assertEqual(result["text"], "caption")
            self.assertEqual(len(result["images"]), 1)
            self.assertEqual(Path(result["images"][0]).read_bytes(), b"image")

    def test_openai_codex_auth_request(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            openai_provider = importlib.import_module("providers.openai_provider")

        captured = {}

        class Response:
            status_code = 200

            def iter_lines(self):
                event = json.dumps(
                    {"type": "response.output_text.delta", "delta": "hello"}
                )
                yield f"data: {event}".encode()
                yield b"data: [DONE]"

        def fake_request(headers, payload):
            captured["headers"] = headers
            captured["payload"] = payload
            return Response()

        with patch(
            "providers.openai_provider._get_valid_tokens",
            return_value={"access_token": "token", "account_id": "acct"},
        ):
            with patch("providers.openai_provider._make_request", side_effect=fake_request):
                text = openai_provider.call(
                    [
                        {"role": "system", "content": "instructions"},
                        {"role": "user", "content": "hi"},
                    ],
                    "gpt-test",
                    thinking="medium",
                )

        self.assertEqual(text, "hello")
        self.assertEqual(captured["payload"]["model"], "gpt-test")
        self.assertEqual(captured["payload"]["instructions"], "instructions")
        self.assertEqual(captured["payload"]["reasoning"]["effort"], "medium")
        self.assertEqual(captured["headers"]["Authorization"], "Bearer token")
        self.assertEqual(captured["headers"]["chatgpt-account-id"], "acct")


class CliBoundaryTests(unittest.TestCase):
    def test_model_call_plain_and_json_outputs(self):
        model_call = load_module("test_model_call_module", SCRIPTS_DIR / "model_call.py")

        with patch.object(
            model_call,
            "call_model",
            return_value={"text": "caption", "images": ["/tmp/image.png"]},
        ):
            with patch.object(
                sys,
                "argv",
                ["model_call.py", "--role", "image", "--content", "draw", "--json"],
            ):
                out = io.StringIO()
                with patch("sys.stdout", out):
                    model_call.main()

        data = json.loads(out.getvalue())
        self.assertEqual(data["text"], "caption")
        self.assertEqual(data["images"], ["/tmp/image.png"])
        self.assertEqual(data["provider"], "openrouter")

        with patch.object(model_call, "call_model", return_value="plain answer"):
            with patch.object(sys, "argv", ["model_call.py", "--content", "ask"]):
                out = io.StringIO()
                with patch("sys.stdout", out):
                    model_call.main()

        self.assertIn("plain answer", out.getvalue())

    def test_ask_new_continue_branch_and_show(self):
        ask = load_module(
            "test_ask_module",
            REPO_ROOT / "skills" / "ask" / "scripts" / "ask.py",
        )

        with ChangeDir(REPO_ROOT):
            with patch.object(
                sys,
                "argv",
                ["ask.py", "--content", "question"],
            ):
                with patch("sys.stderr", io.StringIO()):
                    with self.assertRaises(SystemExit) as cm:
                        ask.main()
        self.assertEqual(cm.exception.code, 2)

        with tempfile.TemporaryDirectory() as tmp:
            with ChangeDir(tmp):
                with patch.object(ask, "call_model", return_value="first"):
                    with patch.object(
                        sys,
                        "argv",
                        [
                            "ask.py",
                            "--model",
                            "gpt5",
                            "--content",
                            "question",
                            "--id",
                            "unit",
                            "--tag",
                            "runtime",
                            "--flow",
                            "wide",
                            "--persona",
                            "pragmatist",
                        ],
                    ):
                        with patch("sys.stdout", io.StringIO()):
                            ask.main()

                conv_path = next((Path(tmp) / ".agents" / "model-calls").glob("*_unit.jsonl"))
                lines = conv_path.read_text().strip().splitlines()
                meta = json.loads(lines[0])
                first_assistant = json.loads(lines[2])
                self.assertEqual(meta["flow"], "wide")
                self.assertEqual(meta["tags"], ["runtime"])
                self.assertEqual(meta["exchanges"], 1)
                self.assertEqual(first_assistant["persona"], "pragmatist")
                self.assertEqual(first_assistant["content"], "first")

                with patch.object(ask, "call_model", return_value="second"):
                    with patch.object(
                        sys,
                        "argv",
                        [
                            "ask.py",
                            "--continue",
                            str(conv_path),
                            "--content",
                            "follow up",
                        ],
                    ):
                        with patch("sys.stdout", io.StringIO()):
                            ask.main()

                continued_meta = json.loads(conv_path.read_text().splitlines()[0])
                self.assertEqual(continued_meta["exchanges"], 2)

                with patch.object(ask, "call_model", return_value="branch"):
                    with patch.object(
                        sys,
                        "argv",
                        [
                            "ask.py",
                            "--branch",
                            str(conv_path),
                            "--from",
                            "1",
                            "--id",
                            "branch",
                            "--content",
                            "alternate",
                        ],
                    ):
                        with patch("sys.stdout", io.StringIO()):
                            ask.main()

                branch_path = next((Path(tmp) / ".agents" / "model-calls").glob("*_branch.jsonl"))
                branch_meta = json.loads(branch_path.read_text().splitlines()[0])
                self.assertIn("#exchange-1", branch_meta["parent"])
                self.assertEqual(branch_meta["exchanges"], 2)

                with patch.object(sys, "argv", ["ask.py", "--show", str(branch_path)]):
                    out = io.StringIO()
                    with patch("sys.stdout", out):
                        with self.assertRaises(SystemExit) as cm:
                            ask.main()
                self.assertEqual(cm.exception.code, 0)
                self.assertIn("Exchange 1", out.getvalue())

    def test_openrouter_image_json_output_and_model_guard(self):
        image_cli = load_module(
            "test_openrouter_image_module",
            REPO_ROOT
            / "skills"
            / "openrouter-image"
            / "scripts"
            / "openrouter_image.py",
        )

        with patch.object(
            image_cli,
            "call_model",
            return_value={"text": "caption", "images": ["/tmp/image.png"]},
        ):
            with tempfile.TemporaryDirectory() as tmp:
                with ChangeDir(tmp):
                    with patch.object(
                        sys,
                        "argv",
                        ["openrouter_image.py", "--content", "draw", "--json"],
                    ):
                        out = io.StringIO()
                        with patch("sys.stdout", out):
                            image_cli.main()

        data = json.loads(out.getvalue())
        self.assertEqual(data["provider"], "openrouter")
        self.assertEqual(data["requested_model"], "nanobanana")
        self.assertEqual(data["images"], ["/tmp/image.png"])

        with ChangeDir(REPO_ROOT):
            with patch.object(
                sys,
                "argv",
                ["openrouter_image.py", "--content", "draw"],
            ):
                with patch("sys.stderr", io.StringIO()):
                    with self.assertRaises(SystemExit) as cm:
                        image_cli.main()
        self.assertEqual(cm.exception.code, 2)

        with tempfile.TemporaryDirectory() as tmp:
            with ChangeDir(tmp):
                with patch.object(
                    image_cli,
                    "call_model",
                    return_value={"text": "", "images": [str(Path(tmp) / "image.png")]},
                ):
                    with patch.object(
                        sys,
                        "argv",
                        ["openrouter_image.py", "--content", "draw"],
                    ):
                        with patch("sys.stdout", io.StringIO()):
                            image_cli.main()

                self.assertEqual(
                    Path(os.environ["MODEL_RUNTIME_IMAGE_DIR"]),
                    (Path(tmp) / ".agents" / "model-calls" / "images").resolve(),
                )

        with patch.object(
            sys,
            "argv",
            ["openrouter_image.py", "--model", "gpt5", "--content", "draw"],
        ):
            with patch("sys.stderr", io.StringIO()):
                with self.assertRaises(SystemExit) as cm:
                    image_cli.main()
        self.assertEqual(cm.exception.code, 2)


class CleanupTests(unittest.TestCase):
    def test_deleted_skill_and_stale_scaffold_paths_are_absent(self):
        self.assertFalse((REPO_ROOT / "skills" / "prompt-tester").exists())
        self.assertFalse((REPO_ROOT / ".agents" / "prompt-tester").exists())
        self.assertFalse((REPO_ROOT / ".agents" / "workbench").exists())
        self.assertFalse((REPO_ROOT / "skills" / "ask" / "scaffold").exists())
        self.assertFalse((REPO_ROOT / "skills" / "ask" / "prompts").exists())
        self.assertFalse((REPO_ROOT / "skills" / "ask" / "config.yaml").exists())

        node_module_skills = list(REPO_ROOT.glob("skills/**/node_modules/**/SKILL.md"))
        self.assertEqual(node_module_skills, [])


if __name__ == "__main__":
    unittest.main()
