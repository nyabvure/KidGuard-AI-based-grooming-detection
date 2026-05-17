"""
pytest tests for incident_logic.py — the pure business logic
extracted from server.py (AI adjustment + timestamp sorting).

Run:  cd backend && ..\venv\Scripts\python.exe -m pytest test_incident_logic.py -v
"""
import pytest
from datetime import datetime, timezone, timedelta
from incident_logic import apply_ai_adjustment, normalize_and_sort_incidents


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_incident(risk_level: str, risk_score: int) -> dict:
    return {'riskLevel': risk_level, 'riskScore': risk_score}

def ai(label: str, confidence: float) -> dict:
    return {'label': label, 'confidence': confidence, 'reason': 'test'}


# ── apply_ai_adjustment — grooming upgrades ────────────────────────────────────

class TestGroomingUpgrade:
    def test_high_confidence_grooming_upgrades_low_to_high(self):
        inc = make_incident('low', 3)
        apply_ai_adjustment(inc, ai('grooming', 0.95))
        assert inc['riskLevel'] == 'high'
        assert inc['riskScore'] == 8

    def test_high_confidence_grooming_upgrades_medium_to_high(self):
        inc = make_incident('medium', 5)
        apply_ai_adjustment(inc, ai('grooming', 0.90))
        assert inc['riskLevel'] == 'high'
        assert inc['riskScore'] == 8

    def test_high_confidence_grooming_preserves_higher_existing_score(self):
        # If the rule engine already scored it 10, AI shouldn't lower it to 8
        inc = make_incident('medium', 10)
        apply_ai_adjustment(inc, ai('grooming', 0.92))
        assert inc['riskScore'] == 10

    def test_high_confidence_grooming_does_not_change_already_high(self):
        # Already high — no-op
        inc = make_incident('high', 9)
        apply_ai_adjustment(inc, ai('grooming', 0.95))
        assert inc['riskLevel'] == 'high'
        assert inc['riskScore'] == 9

    def test_medium_confidence_grooming_upgrades_low_to_medium(self):
        inc = make_incident('low', 2)
        apply_ai_adjustment(inc, ai('grooming', 0.85))
        assert inc['riskLevel'] == 'medium'
        assert inc['riskScore'] == 5

    def test_medium_confidence_grooming_preserves_higher_existing_score(self):
        inc = make_incident('low', 7)
        apply_ai_adjustment(inc, ai('grooming', 0.82))
        assert inc['riskScore'] == 7

    def test_medium_confidence_grooming_does_not_change_medium_or_high(self):
        # Only upgrades low → medium; medium/high stay unchanged
        inc = make_incident('medium', 5)
        apply_ai_adjustment(inc, ai('grooming', 0.85))
        assert inc['riskLevel'] == 'medium'

    def test_low_confidence_grooming_makes_no_change(self):
        inc = make_incident('low', 3)
        apply_ai_adjustment(inc, ai('grooming', 0.75))
        assert inc['riskLevel'] == 'low'
        assert inc['riskScore'] == 3

    def test_boundary_confidence_0_9_triggers_high_upgrade(self):
        inc = make_incident('low', 2)
        apply_ai_adjustment(inc, ai('grooming', 0.9))
        assert inc['riskLevel'] == 'high'

    def test_boundary_confidence_0_8_triggers_medium_upgrade_from_low(self):
        inc = make_incident('low', 1)
        apply_ai_adjustment(inc, ai('grooming', 0.8))
        assert inc['riskLevel'] == 'medium'

    def test_just_below_0_8_makes_no_change(self):
        inc = make_incident('low', 3)
        apply_ai_adjustment(inc, ai('grooming', 0.79))
        assert inc['riskLevel'] == 'low'


# ── apply_ai_adjustment — safe downgrades ─────────────────────────────────────

class TestSafeDowngrade:
    def test_confident_safe_downgrades_high_to_low(self):
        inc = make_incident('high', 9)
        apply_ai_adjustment(inc, ai('safe', 0.90))
        assert inc['riskLevel'] == 'low'
        assert inc['riskScore'] == 2

    def test_confident_safe_downgrades_medium_to_low(self):
        inc = make_incident('medium', 5)
        apply_ai_adjustment(inc, ai('safe', 0.85))
        assert inc['riskLevel'] == 'low'
        assert inc['riskScore'] == 2

    def test_confident_safe_preserves_lower_existing_score(self):
        # Score was already 1 — safe shouldn't raise it to 2
        inc = make_incident('low', 1)
        apply_ai_adjustment(inc, ai('safe', 0.90))
        assert inc['riskScore'] == 1

    def test_low_confidence_safe_makes_no_change(self):
        inc = make_incident('high', 8)
        apply_ai_adjustment(inc, ai('safe', 0.75))
        assert inc['riskLevel'] == 'high'
        assert inc['riskScore'] == 8

    def test_boundary_confidence_0_8_triggers_downgrade(self):
        inc = make_incident('high', 9)
        apply_ai_adjustment(inc, ai('safe', 0.8))
        assert inc['riskLevel'] == 'low'

    def test_just_below_0_8_makes_no_change(self):
        inc = make_incident('high', 9)
        apply_ai_adjustment(inc, ai('safe', 0.79))
        assert inc['riskLevel'] == 'high'


# ── apply_ai_adjustment — no AI result ────────────────────────────────────────

class TestNoAiResult:
    def test_none_result_leaves_incident_unchanged(self):
        inc = make_incident('high', 9)
        apply_ai_adjustment(inc, None)
        assert inc['riskLevel'] == 'high'
        assert inc['riskScore'] == 9

    def test_empty_dict_leaves_incident_unchanged(self):
        inc = make_incident('medium', 5)
        apply_ai_adjustment(inc, {})
        assert inc['riskLevel'] == 'medium'


# ── normalize_and_sort_incidents ───────────────────────────────────────────────

def ts(offset_hours: int, aware: bool = True) -> datetime:
    """Create a UTC-aware (or naive) datetime offset_hours from now."""
    dt = datetime.now(timezone.utc) + timedelta(hours=offset_hours)
    return dt if aware else dt.replace(tzinfo=None)


class TestNormalizeAndSort:
    def test_sorts_newest_first(self):
        incidents = [
            {'timestamp': ts(-3), 'id': 'old'},
            {'timestamp': ts(-1), 'id': 'new'},
            {'timestamp': ts(-2), 'id': 'mid'},
        ]
        result = normalize_and_sort_incidents(incidents)
        assert [r['id'] for r in result] == ['new', 'mid', 'old']

    def test_iso_string_timestamps_are_parsed(self):
        incidents = [
            {'timestamp': ts(-2).isoformat(), 'id': 'old'},
            {'timestamp': ts(-1).isoformat(), 'id': 'new'},
        ]
        result = normalize_and_sort_incidents(incidents)
        assert result[0]['id'] == 'new'

    def test_naive_datetimes_treated_as_utc(self):
        aware   = ts(-1, aware=True)
        naive   = ts(-2, aware=False)   # stored without tzinfo
        incidents = [
            {'timestamp': naive, 'id': 'old'},
            {'timestamp': aware, 'id': 'new'},
        ]
        result = normalize_and_sort_incidents(incidents)
        assert result[0]['id'] == 'new'

    def test_mixed_string_and_datetime_types(self):
        incidents = [
            {'timestamp': ts(-3).isoformat(), 'id': 'oldest'},
            {'timestamp': ts(-1),             'id': 'newest'},
            {'timestamp': ts(-2, aware=False), 'id': 'middle'},
        ]
        result = normalize_and_sort_incidents(incidents)
        assert [r['id'] for r in result] == ['newest', 'middle', 'oldest']

    def test_all_timestamps_become_utc_aware(self):
        incidents = [{'timestamp': ts(-1, aware=False), 'id': 'x'}]
        result = normalize_and_sort_incidents(incidents)
        assert result[0]['timestamp'].tzinfo is not None

    def test_empty_list_returns_empty(self):
        assert normalize_and_sort_incidents([]) == []

    def test_single_incident_returned_as_is(self):
        incidents = [{'timestamp': ts(-1), 'id': 'only'}]
        result = normalize_and_sort_incidents(incidents)
        assert len(result) == 1
        assert result[0]['id'] == 'only'
