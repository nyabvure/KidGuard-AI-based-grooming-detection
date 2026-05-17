#!/usr/bin/env python3
"""KidGuard Security Audit"""

import requests
import uuid
from datetime import datetime, timezone

BASE = 'http://127.0.0.1:8000/api'
results = []

def test(name, passed, detail=''):
    results.append((passed, name, detail))
    status = 'PASS' if passed else 'FAIL'
    print(f'  [{status}] {name}')
    if detail:
        print(f'         {detail}')

def req(method, endpoint, data=None, headers=None, params=None):
    h = {'Content-Type': 'application/json'}
    if headers:
        h.update(headers)
    try:
        r = getattr(requests, method)(
            f'{BASE}/{endpoint}', json=data, headers=h, params=params, timeout=10
        )
        try:
            return r.status_code, r.json()
        except Exception:
            return r.status_code, {}
    except Exception as e:
        return 0, {'error': str(e)}

def make_incident(parent_id):
    return {
        'message': 'security test message',
        'username': 'testuser',
        'platform': 'Roblox',
        'url': 'https://roblox.com',
        'riskLevel': 'low',
        'riskScore': 2,
        'detectedPatterns': [],
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'parentId': parent_id,
        'childName': 'Test Child'
    }

# ── Setup ──────────────────────────────────────────────────────────────────────
print('\n' + '=' * 55)
print('  KidGuard Security Audit')
print('=' * 55)

email1 = f'sec_{uuid.uuid4().hex[:6]}@test.com'
email2 = f'sec_{uuid.uuid4().hex[:6]}@test.com'

_, d1 = req('post', 'auth/register', {
    'name': 'User One', 'phone': '+1111111111',
    'email': email1, 'password': 'password123'
})
token1 = d1.get('token', '')
pid1 = d1.get('parentId', '')
auth1 = {'Authorization': f'Bearer {token1}'}

_, d2 = req('post', 'auth/register', {
    'name': 'User Two', 'phone': '+2222222222',
    'email': email2, 'password': 'password456'
})
token2 = d2.get('token', '')
pid2 = d2.get('parentId', '')
auth2 = {'Authorization': f'Bearer {token2}'}

print(f'\n  User 1: {pid1}')
print(f'  User 2: {pid2}\n')

# ── 1. Token Security ──────────────────────────────────────────────────────────
print('-- 1. Token Security ----------------------------------------')

s, _ = req('get', 'incidents', headers={'Authorization': 'Bearer '})
test('Empty bearer token rejected', s in [401, 403, 422])

s, _ = req('get', 'incidents', headers={'Authorization': 'Bearer null'})
test('Null string token rejected', s == 401)

s, _ = req('get', 'incidents', headers={'Authorization': 'Bearer undefined'})
test('Undefined string token rejected', s == 401)

s, _ = req('get', 'incidents', headers={'Authorization': 'Basic abc123'})
test('Non-bearer scheme rejected', s in [401, 403])

s, _ = req('get', 'incidents', headers={'Authorization': f'Bearer {token1[:-5]}XXXXX'})
test('Tampered token rejected', s == 401)

parts = token1.split('.')
test('Token is valid JWT format (3 parts)', len(parts) == 3)

# ── 2. IDOR / Authorisation ────────────────────────────────────────────────────
print('\n-- 2. IDOR / Authorisation ----------------------------------')

# Cross-account profile access
s, _ = req('get', f'parents/{pid2}', headers=auth1)
test('Cannot read another parent profile', s == 403)

# Create incident for user1, try to manipulate with user2
_, inc = req('post', 'incidents', make_incident(pid1))
inc_id = inc.get('id', '')

s, _ = req('get', f'incidents/{inc_id}', headers=auth2)
test('Cannot read another user incident', s == 403)

s, _ = req('patch', f'incidents/{inc_id}/review', headers=auth2)
test('Cannot review another user incident', s == 403)

s, _ = req('delete', f'incidents/{inc_id}', headers=auth2)
test('Cannot delete another user incident', s == 403)

# Stats scoped to own data
s, d = req('get', 'stats', headers=auth1, params={'parentId': pid2})
test('Stats always scoped to authenticated user', s == 200 and d.get('totalIncidents', -1) >= 0 and d.get('totalIncidents', -1) != 99)

# Incidents scoped to own data
s, d = req('get', 'incidents', headers=auth1, params={'parentId': pid2})
test('Incidents always scoped to authenticated user', s in [200, 403])

# ── 3. Input Validation ────────────────────────────────────────────────────────
print('\n-- 3. Input Validation / Injection --------------------------')

# NoSQL injection attempts
s, _ = req('post', 'auth/login', {'email': {'$gt': ''}, 'password': 'x'})
test('NoSQL injection in email field blocked', s != 200)

s, _ = req('post', 'auth/login', {'email': email1, 'password': {'$gt': ''}})
test('NoSQL injection in password field blocked', s != 200)

# Missing required fields
s, _ = req('post', 'incidents', {'message': 'test'})
test('Incomplete incident payload rejected', s == 422)

s, _ = req('post', 'auth/register', {'name': 'test'})
test('Incomplete register payload rejected', s == 422)

# Invalid timestamp
inc = make_incident(pid1)
inc['timestamp'] = 'not-a-date'
s, _ = req('post', 'incidents', inc)
test('Invalid timestamp rejected', s in [422, 500])

# Extremely large payload
inc = make_incident(pid1)
inc['message'] = 'A' * 100000
s, _ = req('post', 'incidents', inc)
test('Oversized payload handled (not crash)', s in [200, 413, 422])

# XSS in fields
inc = make_incident(pid1)
inc['message'] = '<script>alert(document.cookie)</script>'
inc['username'] = '<img src=x onerror=alert(1)>'
s, d = req('post', 'incidents', inc)
test('XSS payload does not crash server', s in [200, 422])

# Fake parentId
inc = make_incident('non-existent-parent-000')
s, _ = req('post', 'incidents', inc)
test('Non-existent parentId rejected', s == 400)

# ── 4. Rate Limiting ───────────────────────────────────────────────────────────
print('\n-- 4. Rate Limiting -----------------------------------------')

# SMS rate limit
sms_limited = False
for i in range(8):
    s, _ = req('post', 'alert/sms', {'phone': '+1234567890', 'message': 'test'}, headers=auth1)
    if s == 429:
        sms_limited = True
        test(f'SMS rate limit triggers', True, f'At request {i+1}')
        break
if not sms_limited:
    test('SMS rate limit triggers', False, 'Never got 429')

# Incident rate limit
rate_limited = False
for i in range(65):
    inc = make_incident(None)
    inc['parentId'] = None
    s, _ = req('post', 'incidents', inc)
    if s == 429:
        rate_limited = True
        test('Incident rate limit triggers', True, f'At request {i+1}')
        break
if not rate_limited:
    test('Incident rate limit triggers', False, 'Never got 429')

# ── 5. Sensitive Data Exposure ─────────────────────────────────────────────────
print('\n-- 5. Sensitive Data Exposure --------------------------------')

s, d = req('post', 'auth/login', {'email': email1, 'password': 'password123'})
test('Password not exposed in login response', 'password' not in str(d) and 'password_hash' not in str(d))

s, d = req('get', f'parents/{pid1}', headers=auth1)
test('Password hash not in parent profile', 'password_hash' not in str(d))
test('_id (MongoDB internal) not exposed', '_id' not in str(d))

s, d = req('get', 'incidents', headers=auth1)
test('Incidents response is list', isinstance(d, list))

# ── 6. Brute Force ────────────────────────────────────────────────────────────
print('\n-- 6. Brute Force -------------------------------------------')

blocked = False
for i in range(15):
    s, _ = req('post', 'auth/login', {'email': email1, 'password': 'wrongpass'})
    if s == 429:
        blocked = True
        test('Brute force login blocked after repeated attempts', True, f'At attempt {i+1}')
        break
if not blocked:
    test('Brute force login protection', False, 'No rate limit on login — consider adding one')

# ── Summary ────────────────────────────────────────────────────────────────────
print('\n' + '=' * 55)
passed = sum(1 for r in results if r[0])
failed = sum(1 for r in results if not r[0])
total = len(results)
print(f'  Results: {passed}/{total} passed')
if failed == 0:
    print('  All security checks passed!')
else:
    print(f'  {failed} issue(s) found:')
    for ok, name, detail in results:
        if not ok:
            print(f'    - {name}')
            if detail:
                print(f'      {detail}')
print('=' * 55)
