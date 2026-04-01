"""Flask server for the prompt-tester skill.

Provides a REST API for managing prompts, scenarios, test runs,
AI-scored evaluation, and prompt improvement.
"""

import json
import os
import sys
import time
import uuid
from pathlib import Path
from threading import Thread

from flask import Flask, Response, jsonify, request

# ---------------------------------------------------------------------------
# Path setup -- import shared infrastructure
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
REPO_ROOT = SKILL_DIR.parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))
sys.path.insert(0, str(SCRIPT_DIR))

from core import load_config, resolve_model, call_model, call_model_streaming, load_env, PROVIDERS  # noqa: E402
from messages import build_messages_for_api  # noqa: E402
from updater import improve_prompt  # noqa: E402

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
load_env(REPO_ROOT)

app = Flask(__name__)
CONFIG = load_config(SKILL_DIR / "config.yaml")

# Storage root -- .agents/prompt-tester/ in the working directory
STORAGE_ROOT = Path(os.getcwd()) / ".agents" / "prompt-tester"
PROMPTS_DIR = STORAGE_ROOT / "prompts"
SCENARIOS_DIR = STORAGE_ROOT / "scenarios"
RUNS_DIR = STORAGE_ROOT / "runs"

for d in (PROMPTS_DIR, SCENARIOS_DIR, RUNS_DIR):
    d.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _new_id():
    return str(uuid.uuid4())[:8]


def _read_json(path):
    if path.exists():
        return json.loads(path.read_text())
    return None


def _write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))


def _latest_version(meta):
    """Return the latest version number from a prompt meta."""
    versions = meta.get("versions", [])
    if not versions:
        return 0
    return max(v["number"] for v in versions)


def _prompt_dir(prompt_id):
    return PROMPTS_DIR / prompt_id


def _version_file(prompt_id, version):
    return _prompt_dir(prompt_id) / f"v{version}.md"


def _meta_path(prompt_id):
    return _prompt_dir(prompt_id) / "meta.json"


# ---------------------------------------------------------------------------
# AI Eval scoring
# ---------------------------------------------------------------------------

EVAL_SYSTEM_PROMPT = """Score this response on a 1-5 scale for each dimension. Return JSON only.

System prompt being tested:
{prompt_text}

Scenario input:
{scenario_input}

Model response:
{model_output}

Eval rules to check:
{eval_rules}

Score these dimensions:
- instruction_following: Did it follow the system prompt's instructions?
- eval_rules: Did it comply with the specific eval rules? (list which passed/failed)
- quality: Overall response quality and helpfulness?

Return format:
{{"instruction_following": {{"score": N, "explanation": "..."}}, "eval_rules": {{"score": N, "explanation": "...", "details": [{{"rule": "...", "passed": true}}]}}, "quality": {{"score": N, "explanation": "..."}}}}"""


def _score_response(prompt_text, scenario_input, model_output, eval_rules):
    """Call the AI evaluator to score a model response."""
    rules_text = "\n".join(f"- {r}" for r in eval_rules) if eval_rules else "- (no specific rules)"

    scoring_prompt = EVAL_SYSTEM_PROMPT.format(
        prompt_text=prompt_text,
        scenario_input=scenario_input,
        model_output=model_output,
        eval_rules=rules_text,
    )

    messages = [
        {"role": "system", "content": scoring_prompt},
        {"role": "user", "content": "Score the response above. Return JSON only."},
    ]

    try:
        raw = call_model("spark", CONFIG, messages)
        # Strip markdown fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = lines[1:]  # remove opening fence
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            cleaned = "\n".join(lines)
        return json.loads(cleaned)
    except (json.JSONDecodeError, Exception) as e:
        return {
            "instruction_following": {"score": 0, "explanation": f"Scoring failed: {e}"},
            "eval_rules": {"score": 0, "explanation": f"Scoring failed: {e}", "details": []},
            "quality": {"score": 0, "explanation": f"Scoring failed: {e}"},
        }


# ---------------------------------------------------------------------------
# Routes: Prompts
# ---------------------------------------------------------------------------

@app.route("/api/prompts", methods=["GET"])
def list_prompts():
    results = []
    if PROMPTS_DIR.exists():
        for d in sorted(PROMPTS_DIR.iterdir()):
            meta = _read_json(d / "meta.json")
            if meta:
                meta["id"] = d.name
                results.append(meta)
    return jsonify(results)


@app.route("/api/prompts/<prompt_id>", methods=["GET"])
def get_prompt(prompt_id):
    meta = _read_json(_meta_path(prompt_id))
    if not meta:
        return jsonify({"error": "Prompt not found"}), 404

    meta["id"] = prompt_id

    # Latest version content
    latest = _latest_version(meta)
    latest_file = _version_file(prompt_id, latest)
    meta["latest_content"] = latest_file.read_text() if latest_file.exists() else ""

    # All version contents
    version_contents = {}
    for v in meta.get("versions", []):
        vf = _version_file(prompt_id, v["number"])
        if vf.exists():
            version_contents[v["number"]] = vf.read_text()
    meta["version_contents"] = version_contents

    return jsonify(meta)


@app.route("/api/prompts", methods=["POST"])
def create_prompt():
    data = request.get_json()
    title = data.get("title", "Untitled")
    description = data.get("description", "")
    content = data.get("content", "")

    prompt_id = _new_id()
    prompt_dir = _prompt_dir(prompt_id)
    prompt_dir.mkdir(parents=True, exist_ok=True)

    # Write v1
    _version_file(prompt_id, 1).write_text(content)

    # Write meta
    meta = {
        "title": title,
        "description": description,
        "created_at": time.time(),
        "versions": [{"number": 1, "created_at": time.time()}],
    }
    _write_json(_meta_path(prompt_id), meta)

    meta["id"] = prompt_id
    return jsonify(meta), 201


@app.route("/api/prompts/<prompt_id>", methods=["PUT"])
def update_prompt(prompt_id):
    meta = _read_json(_meta_path(prompt_id))
    if not meta:
        return jsonify({"error": "Prompt not found"}), 404

    data = request.get_json()
    content = data.get("content", "")

    next_version = _latest_version(meta) + 1
    _version_file(prompt_id, next_version).write_text(content)

    meta["versions"].append({"number": next_version, "created_at": time.time()})
    _write_json(_meta_path(prompt_id), meta)

    return jsonify({"id": prompt_id, "version": next_version})


@app.route("/api/prompts/<prompt_id>/versions/<int:version>", methods=["GET"])
def get_prompt_version(prompt_id, version):
    vf = _version_file(prompt_id, version)
    if not vf.exists():
        return jsonify({"error": "Version not found"}), 404
    return jsonify({"version": version, "content": vf.read_text()})


# ---------------------------------------------------------------------------
# Routes: Scenarios
# ---------------------------------------------------------------------------

@app.route("/api/scenarios", methods=["GET"])
def list_scenarios():
    results = []
    if SCENARIOS_DIR.exists():
        for f in sorted(SCENARIOS_DIR.glob("*.json")):
            data = _read_json(f)
            if data:
                data["id"] = f.stem
                results.append(data)
    return jsonify(results)


@app.route("/api/scenarios", methods=["POST"])
def create_scenario():
    data = request.get_json()
    scenario_id = _new_id()

    scenario = {
        "title": data.get("title", "Untitled"),
        "input": data.get("input", ""),
        "expected_behavior": data.get("expected_behavior", ""),
        "tags": data.get("tags", []),
        "eval_rules": data.get("eval_rules", []),
        "created_at": time.time(),
    }
    _write_json(SCENARIOS_DIR / f"{scenario_id}.json", scenario)

    scenario["id"] = scenario_id
    return jsonify(scenario), 201


@app.route("/api/scenarios/<scenario_id>", methods=["DELETE"])
def delete_scenario(scenario_id):
    path = SCENARIOS_DIR / f"{scenario_id}.json"
    if not path.exists():
        return jsonify({"error": "Scenario not found"}), 404
    path.unlink()
    return jsonify({"deleted": scenario_id})


# ---------------------------------------------------------------------------
# Routes: Runs (SSE streaming)
# ---------------------------------------------------------------------------

@app.route("/api/runs", methods=["POST"])
def create_run():
    data = request.get_json()
    prompt_id = data.get("prompt_id")
    prompt_version = data.get("prompt_version")
    model = data.get("model", CONFIG.get("default_model", "gpt5"))
    scenario_ids = data.get("scenario_ids", [])
    thinking = data.get("thinking")

    # Validate prompt
    meta = _read_json(_meta_path(prompt_id))
    if not meta:
        return jsonify({"error": "Prompt not found"}), 404

    if prompt_version is None:
        prompt_version = _latest_version(meta)

    vf = _version_file(prompt_id, prompt_version)
    if not vf.exists():
        return jsonify({"error": f"Version {prompt_version} not found"}), 404

    prompt_text = vf.read_text()

    # Load scenarios
    scenarios = []
    for sid in scenario_ids:
        s = _read_json(SCENARIOS_DIR / f"{sid}.json")
        if s:
            s["id"] = sid
            scenarios.append(s)

    if not scenarios:
        return jsonify({"error": "No valid scenarios found"}), 400

    run_id = _new_id()
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    # Save run meta
    run_meta = {
        "run_id": run_id,
        "prompt_id": prompt_id,
        "prompt_version": prompt_version,
        "model": model,
        "scenario_ids": scenario_ids,
        "thinking": thinking,
        "created_at": time.time(),
    }
    _write_json(run_dir / "meta.json", run_meta)

    def generate():
        all_results = []

        for scenario in scenarios:
            sid = scenario["id"]

            # Signal progress
            yield f"data: {json.dumps({'type': 'progress', 'scenario_id': sid, 'status': 'running'})}\n\n"

            # Build messages
            messages = [
                {"role": "system", "content": prompt_text},
                {"role": "user", "content": scenario["input"]},
            ]

            # Call model
            try:
                output = call_model(model, CONFIG, messages, thinking=thinking)
            except Exception as e:
                output = f"[ERROR] {e}"

            # Score the response
            scores = _score_response(
                prompt_text,
                scenario["input"],
                output,
                scenario.get("eval_rules", []),
            )

            result = {
                "scenario_id": sid,
                "scenario_title": scenario.get("title", sid),
                "input": scenario["input"],
                "output": output,
                "scores": scores,
                "eval_rules": scenario.get("eval_rules", []),
            }
            all_results.append(result)

            yield f"data: {json.dumps({'type': 'result', 'scenario_id': sid, 'output': output, 'scores': scores})}\n\n"

        # Save results
        _write_json(run_dir / "results.json", all_results)

        yield f"data: {json.dumps({'type': 'done', 'run_id': run_id})}\n\n"

    return Response(generate(), mimetype="text/event-stream")


@app.route("/api/runs", methods=["GET"])
def list_runs():
    results = []
    if RUNS_DIR.exists():
        for d in sorted(RUNS_DIR.iterdir()):
            meta = _read_json(d / "meta.json")
            if meta:
                results.append(meta)
    return jsonify(results)


@app.route("/api/runs/<run_id>", methods=["GET"])
def get_run(run_id):
    run_dir = RUNS_DIR / run_id
    meta = _read_json(run_dir / "meta.json")
    if not meta:
        return jsonify({"error": "Run not found"}), 404

    result = dict(meta)
    result["results"] = _read_json(run_dir / "results.json") or []
    result["review"] = _read_json(run_dir / "review.json")
    return jsonify(result)


@app.route("/api/runs/<run_id>/review", methods=["POST"])
def review_run(run_id):
    run_dir = RUNS_DIR / run_id
    if not (run_dir / "meta.json").exists():
        return jsonify({"error": "Run not found"}), 404

    data = request.get_json()
    reviews = data.get("reviews", [])

    review_data = {"reviews": reviews, "created_at": time.time()}
    _write_json(run_dir / "review.json", review_data)

    return jsonify(review_data)


@app.route("/api/runs/<run_id>/improve", methods=["POST"])
def improve_run(run_id):
    run_dir = RUNS_DIR / run_id
    meta = _read_json(run_dir / "meta.json")
    if not meta:
        return jsonify({"error": "Run not found"}), 404

    data = request.get_json() or {}
    model = data.get("model", "gpt5")

    # Load current prompt
    prompt_id = meta["prompt_id"]
    prompt_version = meta["prompt_version"]
    vf = _version_file(prompt_id, prompt_version)
    if not vf.exists():
        return jsonify({"error": "Prompt version not found"}), 404
    current_prompt = vf.read_text()

    # Load results and reviews
    results = _read_json(run_dir / "results.json") or []
    review_data = _read_json(run_dir / "review.json")
    reviews = review_data.get("reviews", []) if review_data else []

    # Call the updater
    improved = improve_prompt(current_prompt, results, reviews, CONFIG, model=model)

    # Save as new version
    prompt_meta = _read_json(_meta_path(prompt_id))
    next_version = _latest_version(prompt_meta) + 1
    _version_file(prompt_id, next_version).write_text(improved)
    prompt_meta["versions"].append({"number": next_version, "created_at": time.time()})
    _write_json(_meta_path(prompt_id), prompt_meta)

    return jsonify({
        "prompt_id": prompt_id,
        "version": next_version,
        "content": improved,
    })


# ---------------------------------------------------------------------------
# Routes: Config
# ---------------------------------------------------------------------------

@app.route("/api/config", methods=["GET"])
def get_config():
    return jsonify(CONFIG)


# ---------------------------------------------------------------------------
# Routes: Compare
# ---------------------------------------------------------------------------

@app.route("/api/compare", methods=["POST"])
def compare_versions():
    data = request.get_json()
    prompt_id = data.get("prompt_id")
    version_a = data.get("version_a")
    version_b = data.get("version_b")
    scenario_ids = data.get("scenario_ids", [])
    model = data.get("model", CONFIG.get("default_model", "gpt5"))

    # Load both prompt versions
    vf_a = _version_file(prompt_id, version_a)
    vf_b = _version_file(prompt_id, version_b)
    if not vf_a.exists() or not vf_b.exists():
        return jsonify({"error": "One or both versions not found"}), 404

    prompt_a = vf_a.read_text()
    prompt_b = vf_b.read_text()

    # Load scenarios
    scenarios = []
    for sid in scenario_ids:
        s = _read_json(SCENARIOS_DIR / f"{sid}.json")
        if s:
            s["id"] = sid
            scenarios.append(s)

    if not scenarios:
        return jsonify({"error": "No valid scenarios found"}), 400

    def generate():
        paired_results = []

        for scenario in scenarios:
            sid = scenario["id"]

            yield f"data: {json.dumps({'type': 'progress', 'scenario_id': sid, 'status': 'running_a'})}\n\n"

            # Run version A
            messages_a = [
                {"role": "system", "content": prompt_a},
                {"role": "user", "content": scenario["input"]},
            ]
            try:
                output_a = call_model(model, CONFIG, messages_a)
            except Exception as e:
                output_a = f"[ERROR] {e}"

            scores_a = _score_response(prompt_a, scenario["input"], output_a, scenario.get("eval_rules", []))

            yield f"data: {json.dumps({'type': 'progress', 'scenario_id': sid, 'status': 'running_b'})}\n\n"

            # Run version B
            messages_b = [
                {"role": "system", "content": prompt_b},
                {"role": "user", "content": scenario["input"]},
            ]
            try:
                output_b = call_model(model, CONFIG, messages_b)
            except Exception as e:
                output_b = f"[ERROR] {e}"

            scores_b = _score_response(prompt_b, scenario["input"], output_b, scenario.get("eval_rules", []))

            pair = {
                "scenario_id": sid,
                "scenario_title": scenario.get("title", sid),
                "input": scenario["input"],
                "version_a": {"output": output_a, "scores": scores_a},
                "version_b": {"output": output_b, "scores": scores_b},
            }
            paired_results.append(pair)

            yield f"data: {json.dumps({'type': 'result', 'scenario_id': sid, 'version_a': {'output': output_a, 'scores': scores_a}, 'version_b': {'output': output_b, 'scores': scores_b}})}\n\n"

        yield f"data: {json.dumps({'type': 'done', 'results': paired_results})}\n\n"

    return Response(generate(), mimetype="text/event-stream")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3200, debug=True)
