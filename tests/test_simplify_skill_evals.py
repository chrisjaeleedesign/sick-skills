import re
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
CURRENT_SKILL = REPO_ROOT / "skills" / "simplify-and-test-code" / "SKILL.md"
LEGACY_SKILL = REPO_ROOT / "tests" / "fixtures" / "simplify_skill_before_antineutering.md"


def normalize(text):
    return re.sub(r"\s+", " ", text.casefold())


def has_all(text, words):
    return all(word.casefold() in text for word in words)


def has_any(text, words):
    return any(word.casefold() in text for word in words)


def score_skill(raw_text):
    text = normalize(raw_text)

    return {
        "removes_real_complexity": has_all(
            text,
            [
                "unused abstractions",
                "dead code",
                "duplicated pathways",
                "unnecessary indirection",
                "speculative extensibility",
            ],
        ),
        "maps_behavior": has_all(
            text,
            ["map the current behavior", "entry points", "callers", "expected outputs"],
        ),
        "captures_baseline": has_all(text, ["capture a baseline", "before editing"]),
        "verifies_integrations": has_all(text, ["integration tests", "live smoke tests"]),
        "keeps_safety": has_all(
            text,
            ["validation", "permission", "retries", "logging", "compatibility"],
        )
        and has_any(text, ["auth", "security checks"]),
        "keeps_production_contracts": has_all(
            text,
            ["public apis", "stored data compatibility", "secrets handling", "deployment"],
        )
        and has_any(text, ["migration plan", "migrations"]),
        "requires_complexity_triage": has_all(
            text,
            ["accidental", "essential", "unknown"],
        )
        and has_any(text, ["classify", "triage"]),
        "preserves_unknown_complexity": has_all(text, ["unknown", "investigate"])
        and has_any(text, ["leave it", "preserve"]),
        "does_not_treat_missing_tests_as_unused": has_all(
            text,
            ["missing tests", "not evidence", "unused"],
        ),
        "requires_evidence_before_deletion": has_any(
            text,
            ["before deleting", "before removing", "deletion requires"],
        )
        and has_all(text, ["concrete evidence"]),
        "avoids_line_count_goal": "ideally less code" not in text
        and has_any(text, ["line count is secondary", "fewer concepts"]),
    }


SCENARIOS = {
    "untested_security_or_permission_checks": [
        "removes_real_complexity",
        "maps_behavior",
        "keeps_safety",
        "keeps_production_contracts",
        "requires_complexity_triage",
        "preserves_unknown_complexity",
        "does_not_treat_missing_tests_as_unused",
        "requires_evidence_before_deletion",
    ],
    "legacy_storage_or_api_compatibility": [
        "removes_real_complexity",
        "maps_behavior",
        "captures_baseline",
        "keeps_safety",
        "keeps_production_contracts",
        "requires_complexity_triage",
        "preserves_unknown_complexity",
        "requires_evidence_before_deletion",
    ],
    "external_service_retries_logging_and_smoke_tests": [
        "removes_real_complexity",
        "captures_baseline",
        "verifies_integrations",
        "keeps_safety",
        "requires_complexity_triage",
        "preserves_unknown_complexity",
        "does_not_treat_missing_tests_as_unused",
    ],
    "novice_readable_without_sanding_off_domain_behavior": [
        "removes_real_complexity",
        "maps_behavior",
        "requires_complexity_triage",
        "preserves_unknown_complexity",
        "avoids_line_count_goal",
    ],
}


class SimplifySkillABTests(unittest.TestCase):
    def test_legacy_skill_keeps_core_simplify_contract(self):
        legacy_scores = score_skill(LEGACY_SKILL.read_text())

        self.assertTrue(legacy_scores["removes_real_complexity"])
        self.assertTrue(legacy_scores["maps_behavior"])
        self.assertTrue(legacy_scores["captures_baseline"])
        self.assertTrue(legacy_scores["verifies_integrations"])
        self.assertTrue(legacy_scores["keeps_safety"])
        self.assertTrue(legacy_scores["keeps_production_contracts"])

    def test_current_skill_passes_anti_neutering_scenarios(self):
        scores = score_skill(CURRENT_SKILL.read_text())

        missing = {
            scenario: [rule for rule in rules if not scores[rule]]
            for scenario, rules in SCENARIOS.items()
        }
        missing = {scenario: rules for scenario, rules in missing.items() if rules}

        self.assertEqual(missing, {})

    def test_anti_neutering_patch_improves_over_frozen_legacy_skill(self):
        legacy_scores = score_skill(LEGACY_SKILL.read_text())
        current_scores = score_skill(CURRENT_SKILL.read_text())

        newly_passing_rules = [
            rule
            for rule, current_value in current_scores.items()
            if current_value and not legacy_scores[rule]
        ]

        self.assertEqual(
            sorted(newly_passing_rules),
            [
                "avoids_line_count_goal",
                "does_not_treat_missing_tests_as_unused",
                "preserves_unknown_complexity",
                "requires_complexity_triage",
                "requires_evidence_before_deletion",
            ],
        )

        legacy_failures = {
            scenario: [rule for rule in rules if not legacy_scores[rule]]
            for scenario, rules in SCENARIOS.items()
        }

        self.assertTrue(
            all(legacy_failures[scenario] for scenario in SCENARIOS),
            legacy_failures,
        )

    def test_patch_does_not_weaken_legacy_contract(self):
        legacy_scores = score_skill(LEGACY_SKILL.read_text())
        current_scores = score_skill(CURRENT_SKILL.read_text())

        regressions = [
            rule
            for rule, legacy_value in legacy_scores.items()
            if legacy_value and not current_scores[rule]
        ]

        self.assertEqual(regressions, [])

    def test_skill_stays_lightweight(self):
        current = CURRENT_SKILL.read_text()
        lines = current.splitlines()

        self.assertLessEqual(len(lines), 90)
        self.assertFalse((CURRENT_SKILL.parent / "scripts").exists())
        self.assertFalse((CURRENT_SKILL.parent / "references").exists())
        self.assertFalse((CURRENT_SKILL.parent / "assets").exists())


if __name__ == "__main__":
    unittest.main()
