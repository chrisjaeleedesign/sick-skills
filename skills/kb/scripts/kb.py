#!/usr/bin/env python3
"""KB skill — Google Drive knowledge base via gws CLI."""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
SKILL_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = Path(".agents/kb")
CONFIG_FILE = CONFIG_DIR / "config.json"

# ---------------------------------------------------------------------------
# gws helpers
# ---------------------------------------------------------------------------


def _run_gws(args: list[str]) -> dict:
    """Run a gws command, parse JSON stdout, return structured result."""
    gws_path = shutil.which("gws")
    if not gws_path:
        return {"ok": False, "error": "not_installed", "message": "gws CLI is not installed"}

    try:
        result = subprocess.run(
            [gws_path] + args,
            capture_output=True,
            text=True,
            timeout=120,
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "timeout", "message": "gws command timed out after 120s"}

    # Filter known noise from stderr
    stderr_lines = [
        line for line in result.stderr.strip().splitlines()
        if not line.startswith("Using keyring backend:")
    ]
    stderr_clean = "\n".join(stderr_lines).strip()

    if result.returncode == 2:
        return {"ok": False, "error": "auth_expired", "message": "gws authentication has expired"}
    if result.returncode != 0:
        return {
            "ok": False,
            "error": "gws_error",
            "command": f"gws {' '.join(args)}",
            "message": stderr_clean or f"gws exited with code {result.returncode}",
        }

    stdout = result.stdout.strip()
    if not stdout:
        return {"ok": True, "data": None}

    try:
        data = json.loads(stdout)
    except json.JSONDecodeError:
        # Some gws commands return plain text
        data = stdout

    return {"ok": True, "data": data}


def check_gws() -> dict:
    """Check if gws is installed, authenticated, and if gcloud is available."""
    installed = shutil.which("gws") is not None
    gcloud_installed = shutil.which("gcloud") is not None
    if not installed:
        return {"installed": False, "authenticated": False, "gcloud": gcloud_installed}

    result = _run_gws(["auth", "status"])
    # gws auth status returns exit 0 even when not authenticated,
    # so check the auth_method field in the response
    authenticated = (
        result["ok"]
        and isinstance(result.get("data"), dict)
        and result["data"].get("auth_method", "none") != "none"
    )
    return {"installed": True, "authenticated": authenticated, "gcloud": gcloud_installed}


# ---------------------------------------------------------------------------
# Config management
# ---------------------------------------------------------------------------


def get_config() -> dict | None:
    """Read .agents/kb/config.json, return dict or None."""
    if not CONFIG_FILE.exists():
        return None
    try:
        return json.loads(CONFIG_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def save_config(folder_id: str, manifest_sheet_id: str, folder_url: str) -> None:
    """Write config to .agents/kb/config.json."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    config = {
        "folder_id": folder_id,
        "manifest_sheet_id": manifest_sheet_id,
        "folder_url": folder_url,
    }
    CONFIG_FILE.write_text(json.dumps(config, indent=2) + "\n")


# ---------------------------------------------------------------------------
# Drive / folder operations
# ---------------------------------------------------------------------------

# Map Google MIME types to short names
MIME_TYPE_MAP = {
    "application/vnd.google-apps.document": "doc",
    "application/vnd.google-apps.spreadsheet": "sheet",
    "application/vnd.google-apps.presentation": "slides",
    "application/pdf": "pdf",
}


def list_folder(folder_id: str) -> dict:
    """List files in a Drive folder."""
    query = f"'{folder_id}' in parents and trashed = false"
    result = _run_gws([
        "drive", "files", "list",
        "--params", json.dumps({
            "q": query,
            "fields": "files(id,name,mimeType,modifiedTime)",
            "pageSize": 1000,
        }),
    ])
    if not result["ok"]:
        return result

    files = result["data"].get("files", []) if isinstance(result["data"], dict) else []
    # Enrich with short type
    for f in files:
        f["type"] = MIME_TYPE_MAP.get(f.get("mimeType", ""), "other")
    return {"ok": True, "data": files}


# ---------------------------------------------------------------------------
# Manifest operations
# ---------------------------------------------------------------------------

MANIFEST_NAME = "_kb_manifest"
MANIFEST_HEADERS = ["Title", "Type", "Doc ID", "Summary", "Tags", "Last Modified", "Status"]


def create_manifest(folder_id: str) -> dict:
    """Create a new _kb_manifest Sheet in the given folder."""
    # Create the spreadsheet
    result = _run_gws([
        "sheets", "spreadsheets", "create",
        "--json", json.dumps({
            "properties": {"title": MANIFEST_NAME},
        }),
    ])
    if not result["ok"]:
        return result

    sheet_id = result["data"].get("spreadsheetId", "")
    if not sheet_id:
        return {"ok": False, "error": "no_sheet_id", "message": "Failed to get spreadsheet ID"}

    # Move into the target folder
    move_result = _run_gws([
        "drive", "files", "update",
        "--params", json.dumps({
            "fileId": sheet_id,
            "addParents": folder_id,
        }),
    ])
    if not move_result["ok"]:
        return move_result

    # Write header row
    header_result = _run_gws([
        "sheets", "spreadsheets", "values", "update",
        "--params", json.dumps({
            "spreadsheetId": sheet_id,
            "range": "Sheet1!A1:G1",
            "valueInputOption": "RAW",
        }),
        "--json", json.dumps({
            "values": [MANIFEST_HEADERS],
        }),
    ])
    if not header_result["ok"]:
        return header_result

    return {"ok": True, "data": {"spreadsheet_id": sheet_id}}


def read_manifest(sheet_id: str) -> dict:
    """Read the manifest sheet and return rows as list of dicts."""
    result = _run_gws([
        "sheets", "spreadsheets", "values", "get",
        "--params", json.dumps({
            "spreadsheetId": sheet_id,
            "range": "Sheet1!A:G",
        }),
    ])
    if not result["ok"]:
        return result

    values = result["data"].get("values", []) if isinstance(result["data"], dict) else []
    if not values:
        return {"ok": True, "data": []}

    headers = values[0]
    # If headers don't match expected format, treat as empty manifest
    if not headers or "Doc ID" not in headers:
        return {"ok": True, "data": []}

    rows = []
    for row in values[1:]:
        # Pad short rows
        padded = row + [""] * (len(headers) - len(row))
        rows.append(dict(zip(headers, padded)))
    return {"ok": True, "data": rows}


def write_manifest(sheet_id: str, rows: list[dict]) -> dict:
    """Write rows to the manifest sheet (overwrites data rows, keeps headers)."""
    values = []
    for row in rows:
        values.append([row.get(h, "") for h in MANIFEST_HEADERS])

    # Write headers + data together (overwrites entire sheet)
    all_values = [MANIFEST_HEADERS] + values

    result = _run_gws([
        "sheets", "spreadsheets", "values", "update",
        "--params", json.dumps({
            "spreadsheetId": sheet_id,
            "range": "Sheet1!A1:G",
            "valueInputOption": "RAW",
        }),
        "--json", json.dumps({"values": all_values}),
    ])
    return result


# ---------------------------------------------------------------------------
# Doc reading + commenting
# ---------------------------------------------------------------------------


def _extract_text_from_doc(doc_json: dict) -> str:
    """Extract plain text from Google Docs API JSON structure."""
    text_parts = []
    body = doc_json.get("body", {})
    for element in body.get("content", []):
        paragraph = element.get("paragraph", {})
        for pe in paragraph.get("elements", []):
            text_run = pe.get("textRun", {})
            content = text_run.get("content", "")
            if content:
                text_parts.append(content)
    return "".join(text_parts).strip()


def read_doc(doc_id: str) -> dict:
    """Read a Google Doc and return its plain text content."""
    result = _run_gws([
        "docs", "documents", "get",
        "--params", json.dumps({"documentId": doc_id}),
    ])
    if not result["ok"]:
        return result

    if isinstance(result["data"], dict):
        text = _extract_text_from_doc(result["data"])
        title = result["data"].get("title", "")
        return {"ok": True, "data": {"title": title, "content": text}}

    return {"ok": True, "data": {"title": "", "content": str(result["data"])}}


AI_COMMENT_PREFIX = "<<AI: "
AI_COMMENT_SUFFIX = ">>"

# Purple styling for inline AI comments
AI_COMMENT_STYLE = {
    "backgroundColor": {
        "color": {"rgbColor": {"red": 0.9, "green": 0.82, "blue": 1.0}}
    },
    "foregroundColor": {
        "color": {"rgbColor": {"red": 0.4, "green": 0.2, "blue": 0.6}}
    },
    "italic": True,
    "fontSize": {"magnitude": 9, "unit": "PT"},
}
AI_COMMENT_STYLE_FIELDS = "backgroundColor,foregroundColor,italic,fontSize"


def _get_doc_raw(doc_id: str) -> dict:
    """Get the raw Docs API JSON for a document (with element indexes)."""
    result = _run_gws([
        "docs", "documents", "get",
        "--params", json.dumps({"documentId": doc_id}),
    ])
    return result


def _find_text_index(doc_json: dict, search_text: str) -> int | None:
    """Find the end index of a text passage in a doc. Returns insertion point."""
    body = doc_json.get("body", {})
    # Build full text with index mapping
    full_text = ""
    index_map = []  # (text_offset, doc_index) pairs
    for element in body.get("content", []):
        if "paragraph" in element:
            for pe in element["paragraph"].get("elements", []):
                tr = pe.get("textRun", {})
                content = tr.get("content", "")
                if content:
                    start_idx = pe.get("startIndex", 0)
                    text_offset = len(full_text)
                    index_map.append((text_offset, start_idx))
                    full_text += content

    # Find the search text
    pos = full_text.find(search_text)
    if pos == -1:
        return None

    # Map text position back to doc index
    target_pos = pos + len(search_text)
    doc_index = 0
    for text_offset, di in index_map:
        if text_offset <= target_pos:
            doc_index = di + (target_pos - text_offset)
    return doc_index


def add_inline_comment(doc_id: str, comment: str, after_text: str | None = None) -> dict:
    """Insert an inline <<AI: comment>> into a Google Doc.

    If after_text is provided, inserts after that text passage.
    Otherwise inserts at the end of the document.
    """
    # Get the raw doc to find indexes
    doc_result = _get_doc_raw(doc_id)
    if not doc_result["ok"]:
        return doc_result

    doc_json = doc_result["data"]
    if not isinstance(doc_json, dict):
        return {"ok": False, "error": "invalid_doc", "message": "Could not parse document"}

    # Find insertion point
    if after_text:
        insert_at = _find_text_index(doc_json, after_text)
        if insert_at is None:
            return {
                "ok": False,
                "error": "text_not_found",
                "message": f"Could not find text: {after_text[:100]}",
            }
    else:
        # Insert at end of doc
        body = doc_json.get("body", {})
        content = body.get("content", [])
        if content:
            insert_at = content[-1].get("endIndex", 1) - 1
        else:
            insert_at = 1

    # Build the comment text
    comment_text = f"\n{AI_COMMENT_PREFIX}{comment}{AI_COMMENT_SUFFIX}\n"

    # Insert text then style it
    requests = [
        {
            "insertText": {
                "location": {"index": insert_at},
                "text": comment_text,
            }
        },
        {
            "updateTextStyle": {
                "range": {
                    "startIndex": insert_at,
                    "endIndex": insert_at + len(comment_text),
                },
                "textStyle": AI_COMMENT_STYLE,
                "fields": AI_COMMENT_STYLE_FIELDS,
            }
        },
    ]

    result = _run_gws([
        "docs", "documents", "batchUpdate",
        "--params", json.dumps({"documentId": doc_id}),
        "--json", json.dumps({"requests": requests}),
    ])
    return result


def cleanup_doc(doc_id: str) -> dict:
    """Remove all <<AI: ...>> inline comments from a Google Doc."""
    import re

    doc_result = _get_doc_raw(doc_id)
    if not doc_result["ok"]:
        return doc_result

    doc_json = doc_result["data"]
    if not isinstance(doc_json, dict):
        return {"ok": False, "error": "invalid_doc", "message": "Could not parse document"}

    # Build full text with index mapping
    body = doc_json.get("body", {})
    full_text = ""
    index_map = []
    for element in body.get("content", []):
        if "paragraph" in element:
            for pe in element["paragraph"].get("elements", []):
                tr = pe.get("textRun", {})
                content = tr.get("content", "")
                if content:
                    start_idx = pe.get("startIndex", 0)
                    text_offset = len(full_text)
                    index_map.append((text_offset, start_idx))
                    full_text += content

    # Find all <<AI: ...>> blocks with surrounding newlines
    pattern = r"\n?" + re.escape(AI_COMMENT_PREFIX) + r".*?" + re.escape(AI_COMMENT_SUFFIX) + r"\n?"
    matches = list(re.finditer(pattern, full_text, re.DOTALL))
    if not matches:
        return {"ok": True, "data": {"removed": 0}}

    # Convert text positions to doc indexes
    def text_pos_to_doc_index(pos):
        doc_idx = 0
        for text_offset, di in index_map:
            if text_offset <= pos:
                doc_idx = di + (pos - text_offset)
        return doc_idx

    # Build delete requests in reverse order (so indexes don't shift)
    requests = []
    for m in reversed(matches):
        start = text_pos_to_doc_index(m.start())
        end = text_pos_to_doc_index(m.end())
        requests.append({
            "deleteContentRange": {
                "range": {"startIndex": start, "endIndex": end}
            }
        })

    result = _run_gws([
        "docs", "documents", "batchUpdate",
        "--params", json.dumps({"documentId": doc_id}),
        "--json", json.dumps({"requests": requests}),
    ])

    if result["ok"]:
        return {"ok": True, "data": {"removed": len(matches)}}
    return result


# ---------------------------------------------------------------------------
# Summary generation
# ---------------------------------------------------------------------------

SUMMARY_SYSTEM_PROMPT = (
    "Summarize this document in 2-3 sentences. Focus on: "
    "(1) what knowledge or information it contains, "
    "(2) what decisions, guidelines, or rules it defines, "
    "(3) when an agent should reference this document — be specific about trigger conditions. "
    "Be concrete: instead of 'contains information about pricing' say "
    "'defines the three pricing tiers with feature breakdowns and upgrade prompt logic.'"
)


def generate_summary(doc_id: str, title: str) -> dict:
    """Read a doc and generate an AI summary."""
    # Read the doc first
    doc_result = read_doc(doc_id)
    if not doc_result["ok"]:
        return doc_result

    doc_content = doc_result["data"]["content"]
    if not doc_content.strip():
        return {"ok": True, "data": {"summary": f"Empty document: {title}"}}

    # Load model config and call
    sys.path.insert(0, str(REPO_ROOT / "scripts"))
    from core import call_model, load_config, load_env

    load_env(REPO_ROOT)
    config = load_config(SKILL_DIR / "config.yaml")

    messages = [
        {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
        {"role": "user", "content": f"Document title: {title}\n\n{doc_content}"},
    ]

    try:
        summary = call_model(config.get("default_model", "mini"), config, messages)
        return {"ok": True, "data": {"summary": summary.strip()}}
    except Exception as e:
        return {"ok": False, "error": "model_error", "message": str(e)}


# ---------------------------------------------------------------------------
# Update manifest (full flow)
# ---------------------------------------------------------------------------


def update_manifest() -> dict:
    """Full update flow: list folder, diff against manifest, generate summaries."""
    config = get_config()
    if not config:
        return {"ok": False, "error": "no_config", "message": "No KB config found. Run setup first."}

    folder_id = config["folder_id"]
    manifest_sheet_id = config.get("manifest_sheet_id")

    # List folder contents
    folder_result = list_folder(folder_id)
    if not folder_result["ok"]:
        return folder_result

    folder_files = folder_result["data"]

    # Check if manifest exists in folder
    manifest_exists = False
    if manifest_sheet_id:
        # Verify it still exists
        check = read_manifest(manifest_sheet_id)
        manifest_exists = check["ok"]

    if not manifest_exists:
        # Look for existing manifest by name
        for f in folder_files:
            if f["name"] == MANIFEST_NAME and f["type"] == "sheet":
                manifest_sheet_id = f["id"]
                manifest_exists = True
                # Persist the discovered manifest ID
                save_config(folder_id, manifest_sheet_id, config.get("folder_url", ""))
                break

    if not manifest_exists:
        # Create new manifest
        create_result = create_manifest(folder_id)
        if not create_result["ok"]:
            return create_result
        manifest_sheet_id = create_result["data"]["spreadsheet_id"]
        # Update config with new manifest ID
        save_config(folder_id, manifest_sheet_id, config.get("folder_url", ""))

    # Read existing manifest rows
    existing_result = read_manifest(manifest_sheet_id)
    existing_rows = existing_result["data"] if existing_result["ok"] else []
    existing_by_id = {row["Doc ID"]: row for row in existing_rows}

    # Filter out the manifest itself from folder files
    folder_files = [f for f in folder_files if f["name"] != MANIFEST_NAME]
    folder_ids = {f["id"] for f in folder_files}

    added = 0
    updated = 0
    removed = 0
    new_rows = []

    # Process folder files
    for f in folder_files:
        doc_id = f["id"]
        existing = existing_by_id.get(doc_id)

        if existing:
            # Check if modified
            if existing.get("Last Modified") != f.get("modifiedTime", ""):
                # Re-generate summary
                print(f"  Updating summary for: {f['name']}", file=sys.stderr)
                summary_result = generate_summary(doc_id, f["name"])
                summary = summary_result["data"]["summary"] if summary_result["ok"] else existing.get("Summary", "")
                new_rows.append({
                    "Title": f["name"],
                    "Type": f["type"],
                    "Doc ID": doc_id,
                    "Summary": summary,
                    "Tags": existing.get("Tags", ""),
                    "Last Modified": f.get("modifiedTime", ""),
                    "Status": "active",
                })
                updated += 1
            else:
                # Keep existing row as-is
                existing["Status"] = "active"
                new_rows.append(existing)
        else:
            # New file — generate summary
            print(f"  Generating summary for: {f['name']}", file=sys.stderr)
            summary_result = generate_summary(doc_id, f["name"])
            summary = summary_result["data"]["summary"] if summary_result["ok"] else f"Summary unavailable for {f['name']}"
            new_rows.append({
                "Title": f["name"],
                "Type": f["type"],
                "Doc ID": doc_id,
                "Summary": summary,
                "Tags": "",
                "Last Modified": f.get("modifiedTime", ""),
                "Status": "active",
            })
            added += 1

    # Mark removed docs
    for doc_id, row in existing_by_id.items():
        if doc_id not in folder_ids and row.get("Status") != "removed":
            row["Status"] = "removed"
            new_rows.append(row)
            removed += 1

    # Write back
    write_result = write_manifest(manifest_sheet_id, new_rows)
    if not write_result["ok"]:
        return write_result

    # Ensure config always has the current manifest ID
    if config.get("manifest_sheet_id") != manifest_sheet_id:
        save_config(folder_id, manifest_sheet_id, config.get("folder_url", ""))

    return {
        "ok": True,
        "data": {
            "added": added,
            "updated": updated,
            "removed": removed,
            "total": len(new_rows),
            "manifest_sheet_id": manifest_sheet_id,
        },
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description="KB skill — Google Drive knowledge base")
    sub = parser.add_subparsers(dest="command")

    # check
    sub.add_parser("check", help="Check gws installation and auth")

    # config
    cfg = sub.add_parser("config", help="Get or set config")
    cfg.add_argument("--folder-id", help="Drive folder ID")
    cfg.add_argument("--manifest-id", help="Manifest sheet ID")
    cfg.add_argument("--folder-url", help="Drive folder URL")

    # list-folder
    lf = sub.add_parser("list-folder", help="List files in a Drive folder")
    lf.add_argument("--folder-id", required=True, help="Drive folder ID")

    # read-manifest
    sub.add_parser("read-manifest", help="Read the manifest sheet")

    # update-manifest
    sub.add_parser("update-manifest", help="Update the manifest (full flow)")

    # read-doc
    rd = sub.add_parser("read-doc", help="Read a Google Doc")
    rd.add_argument("--doc-id", required=True, help="Document ID")

    # inline-comment
    ic = sub.add_parser("inline-comment", help="Add an inline <<AI: >> comment to a doc")
    ic.add_argument("--doc-id", required=True, help="Document ID")
    ic.add_argument("--content", required=True, help="Comment text")
    ic.add_argument("--after", help="Insert after this text passage (otherwise appends to end)")

    # cleanup
    cl = sub.add_parser("cleanup", help="Remove all <<AI: >> comments from a doc")
    cl.add_argument("--doc-id", required=True, help="Document ID")

    # generate-summary
    gs = sub.add_parser("generate-summary", help="Generate AI summary for a doc")
    gs.add_argument("--doc-id", required=True, help="Document ID")
    gs.add_argument("--title", required=True, help="Document title")

    args = parser.parse_args()

    if args.command == "check":
        print(json.dumps(check_gws()))

    elif args.command == "config":
        if args.folder_id:
            save_config(args.folder_id, args.manifest_id or "", args.folder_url or "")
            print(json.dumps({"ok": True, "message": "Config saved"}))
        else:
            config = get_config()
            print(json.dumps(config or {"error": "No config found"}))

    elif args.command == "list-folder":
        print(json.dumps(list_folder(args.folder_id)))

    elif args.command == "read-manifest":
        config = get_config()
        if not config or not config.get("manifest_sheet_id"):
            print(json.dumps({"ok": False, "error": "no_config", "message": "No manifest configured"}))
        else:
            print(json.dumps(read_manifest(config["manifest_sheet_id"])))

    elif args.command == "update-manifest":
        result = update_manifest()
        print(json.dumps(result))

    elif args.command == "read-doc":
        print(json.dumps(read_doc(args.doc_id)))

    elif args.command == "inline-comment":
        print(json.dumps(add_inline_comment(args.doc_id, args.content, args.after)))

    elif args.command == "cleanup":
        print(json.dumps(cleanup_doc(args.doc_id)))

    elif args.command == "generate-summary":
        print(json.dumps(generate_summary(args.doc_id, args.title)))

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
