"""Prompt improvement engine for the prompt-tester skill.

Analyzes test run results and human feedback, then generates an improved
version of the system prompt using AI-assisted prompt engineering.
"""

import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
REPO_ROOT = SKILL_DIR.parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from core import load_config, call_model, load_env


def _load_principles():
    """Load the prompt engineering principles reference."""
    principles_path = SKILL_DIR / "references" / "prompt-principles.md"
    if principles_path.exists():
        return principles_path.read_text()
    return "(Prompt principles file not found.)"


def _format_results(results, reviews):
    """Format test results and human reviews into a readable block."""
    review_map = {}
    if reviews:
        for r in reviews:
            review_map[r["scenario_id"]] = r

    parts = []
    for i, result in enumerate(results, 1):
        scenario_id = result.get("scenario_id", f"scenario-{i}")
        section = f"### Scenario: {result.get('scenario_title', scenario_id)}\n"
        section += f"**Input:** {result.get('input', '(none)')}\n\n"
        section += f"**Model response:**\n{result.get('output', '(none)')}\n\n"

        scores = result.get("scores", {})
        if scores:
            section += "**AI Scores:**\n"
            for dim, detail in scores.items():
                if isinstance(detail, dict):
                    section += f"- {dim}: {detail.get('score', '?')}/5 -- {detail.get('explanation', '')}\n"
                else:
                    section += f"- {dim}: {detail}\n"
            section += "\n"

        review = review_map.get(scenario_id)
        if review:
            section += f"**Human rating:** {review.get('rating', 'skip')}\n"
            if review.get("note"):
                section += f"**Human note:** {review['note']}\n"
        else:
            section += "**Human rating:** (not reviewed)\n"

        parts.append(section)

    return "\n---\n\n".join(parts)


UPDATER_SYSTEM_PROMPT = """You are an expert prompt engineer. Your job is to improve a system prompt based on test results and human feedback.

{principles}

## Your task

Here is the current system prompt being tested:
<current_prompt>
{current_prompt}
</current_prompt>

Here are the test results. Each scenario shows the input, the model's response, AI scores, and human feedback:
<test_results>
{test_results}
</test_results>

## Instructions

1. Analyze the patterns across ALL results -- what's working and what isn't.
2. Focus especially on scenarios where the human marked "bad" or left critical notes.
3. Also note what's working well in "good" scenarios -- preserve those qualities.
4. Improve the prompt by restructuring it, not by appending rules.
5. Generalize from the specific failures -- don't hardcode solutions for individual test cases.
6. Keep the prompt concise. Remove instructions that aren't pulling their weight.
7. If contradictions exist in the current prompt, resolve them.

Return ONLY the improved prompt text. No explanation, no commentary -- just the new prompt."""


def improve_prompt(current_prompt, results, reviews, config, model="gpt5"):
    """Improve a prompt based on run results and human feedback.

    Args:
        current_prompt: The current system prompt text.
        results: List of result dicts from a test run.
        reviews: List of review dicts with scenario_id, rating, note.
        config: Loaded config.yaml dict.
        model: Model alias or full ID to use for improvement.

    Returns:
        The improved prompt text.
    """
    principles = _load_principles()
    formatted_results = _format_results(results, reviews)

    system_prompt = UPDATER_SYSTEM_PROMPT.format(
        principles=principles,
        current_prompt=current_prompt,
        test_results=formatted_results,
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": "Improve this prompt based on the test results and feedback above.",
        },
    ]

    response = call_model(model, config, messages)
    return response.strip()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Improve a prompt from run results")
    parser.add_argument("--prompt-file", required=True, help="Path to current prompt")
    parser.add_argument("--results-file", required=True, help="Path to results.json")
    parser.add_argument("--review-file", help="Path to review.json")
    parser.add_argument("--model", default="gpt5", help="Model to use")
    parser.add_argument("--config", help="Path to config.yaml")
    args = parser.parse_args()

    load_env(REPO_ROOT)

    config_path = args.config or (SKILL_DIR / "config.yaml")
    config = load_config(config_path)

    current_prompt = Path(args.prompt_file).read_text()
    results_data = json.loads(Path(args.results_file).read_text())

    reviews = []
    if args.review_file:
        review_path = Path(args.review_file)
        if review_path.exists():
            reviews = json.loads(review_path.read_text()).get("reviews", [])

    improved = improve_prompt(current_prompt, results_data, reviews, config, args.model)
    print(improved)
