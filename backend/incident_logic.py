"""
Pure business-logic functions extracted from server.py.
No database, network, or framework dependencies — safe to import in tests.
"""
from datetime import datetime, timezone
import logging


def apply_ai_adjustment(incident_dict: dict, ai_result: dict | None) -> dict:
    """
    Apply an AI classification result to an incident dict in-place.

    Rules (mirrors create_incident in server.py):
    - grooming ≥ 0.9  + currently low/medium  → upgrade to high  (score ≥ 8)
    - grooming ≥ 0.8  + currently low          → upgrade to medium (score ≥ 5)
    - grooming < 0.8                           → no change
    - safe     ≥ 0.8                           → downgrade to low  (score ≤ 2)
    - safe     < 0.8                           → no change
    - ai_result is None                        → no change
    """
    if not ai_result:
        return incident_dict

    ai_label = ai_result.get('label', '').lower()
    ai_confidence = float(ai_result.get('confidence', 0.0))

    if ai_label == 'grooming':
        if ai_confidence >= 0.9 and incident_dict['riskLevel'] in ('low', 'medium'):
            incident_dict['riskLevel'] = 'high'
            incident_dict['riskScore'] = max(incident_dict['riskScore'], 8)
            logging.info(f"AI upgraded incident risk to high (confidence: {ai_confidence:.2f})")
        elif ai_confidence >= 0.8 and incident_dict['riskLevel'] == 'low':
            incident_dict['riskLevel'] = 'medium'
            incident_dict['riskScore'] = max(incident_dict['riskScore'], 5)
            logging.info(f"AI upgraded incident risk to medium (confidence: {ai_confidence:.2f})")
    elif ai_label == 'safe' and ai_confidence >= 0.8:
        incident_dict['riskLevel'] = 'low'
        incident_dict['riskScore'] = min(incident_dict['riskScore'], 2)
        logging.info(f"AI downgraded incident to low/safe (confidence: {ai_confidence:.2f})")

    return incident_dict


def normalize_and_sort_incidents(incidents: list[dict]) -> list[dict]:
    """
    Normalise mixed timestamp types (ISO string or naive datetime) to
    UTC-aware datetimes, then return incidents sorted newest-first.
    """
    for inc in incidents:
        ts = inc['timestamp']
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        inc['timestamp'] = ts
    return sorted(incidents, key=lambda x: x['timestamp'], reverse=True)
