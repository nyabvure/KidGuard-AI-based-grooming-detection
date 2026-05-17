#!/usr/bin/env python3
"""
KidGuard Backend API Testing Suite
Tests all API endpoints including authentication and security checks
"""

import requests
import sys
from datetime import datetime, timezone
import uuid

BASE_URL = "http://127.0.0.1:8000/api"

class KidGuardAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.tests_run = 0
        self.tests_passed = 0
        self.token = None
        self.parent_id = None
        self.incident_id = None
        self.test_email = f"testuser_{uuid.uuid4().hex[:6]}@test.com"
        self.test_password = "testpassword123"

    def log(self, name, success, details=""):
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"       {details}")

    def req(self, method, endpoint, data=None, params=None, auth=True, expected=200):
        url = f"{self.base_url}/{endpoint}"
        headers = {"Content-Type": "application/json"}
        if auth and self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        try:
            r = getattr(requests, method)(url, json=data, headers=headers, params=params, timeout=10)
            return r.status_code, r.json() if r.text else {}
        except Exception as e:
            return 0, {"error": str(e)}

    # ── Tests ──────────────────────────────────────────────────────────────────

    def test_health(self):
        status, data = self.req("get", "", auth=False)
        ok = status == 200 and "version" in data
        self.log("Health check", ok, f"Version: {data.get('version', 'N/A')}")

    def test_register(self):
        status, data = self.req("post", "auth/register", auth=False, data={
            "name": "Test Parent",
            "phone": "+1234567890",
            "email": self.test_email,
            "password": self.test_password
        })
        ok = status == 200 and "token" in data
        if ok:
            self.token = data["token"]
            self.parent_id = data["parentId"]
        self.log("Register new user", ok, f"ParentId: {self.parent_id}")

    def test_duplicate_register(self):
        status, data = self.req("post", "auth/register", auth=False, data={
            "name": "Test Parent",
            "phone": "+1234567890",
            "email": self.test_email,
            "password": self.test_password
        })
        ok = status == 400
        self.log("Duplicate registration blocked", ok, data.get("detail", ""))

    def test_login(self):
        status, data = self.req("post", "auth/login", auth=False, data={
            "email": self.test_email,
            "password": self.test_password
        })
        ok = status == 200 and "token" in data
        self.log("Login with correct credentials", ok)

    def test_login_wrong_password(self):
        status, data = self.req("post", "auth/login", auth=False, data={
            "email": self.test_email,
            "password": "wrongpassword"
        })
        ok = status == 401
        self.log("Login with wrong password blocked", ok, data.get("detail", ""))

    def test_no_auth_rejected(self):
        status, _ = self.req("get", "incidents", auth=False)
        ok = status == 401 or status == 403
        self.log("Unauthenticated request blocked", ok, f"Status: {status}")

    def test_fake_token_rejected(self):
        headers = {"Authorization": "Bearer faketoken123", "Content-Type": "application/json"}
        r = requests.get(f"{self.base_url}/incidents", headers=headers)
        ok = r.status_code == 401 or r.status_code == 403
        self.log("Fake token rejected", ok, f"Status: {r.status_code}")

    def test_get_own_profile(self):
        status, data = self.req("get", f"parents/{self.parent_id}")
        ok = status == 200 and data.get("id") == self.parent_id
        self.log("Get own parent profile", ok)

    def test_access_other_profile(self):
        status, data = self.req("get", f"parents/{uuid.uuid4()}")
        ok = status == 403 or status == 404
        self.log("Access to other parent's profile blocked", ok, f"Status: {status}")

    def test_create_incident(self):
        status, data = self.req("post", "incidents", auth=False, data={
            "message": "don't tell your parents, how old are you",
            "username": "suspicious_user",
            "platform": "Roblox",
            "url": "https://www.roblox.com/games/123",
            "riskLevel": "high",
            "riskScore": 8,
            "detectedPatterns": [
                {"category": "Age Probing", "score": 3, "pattern": "/how old are you/i"},
                {"category": "Isolation Attempts", "score": 5, "pattern": "/don't tell your parents/i"}
            ],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "parentId": self.parent_id,
            "childName": "Test Child"
        })
        ok = status == 200 and "id" in data
        if ok:
            self.incident_id = data["id"]
        self.log("Create incident (extension flow)", ok, f"IncidentId: {self.incident_id}")

    def test_fake_parent_incident(self):
        status, data = self.req("post", "incidents", auth=False, data={
            "message": "test",
            "username": "user",
            "platform": "Roblox",
            "url": "https://www.roblox.com",
            "riskLevel": "low",
            "riskScore": 2,
            "detectedPatterns": [],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "parentId": "fake-parent-id-000",
            "childName": "Child"
        })
        ok = status == 400
        self.log("Fake parentId on incident rejected", ok, data.get("detail", ""))

    def test_get_incidents(self):
        status, data = self.req("get", "incidents", params={"parentId": self.parent_id})
        ok = status == 200 and isinstance(data, list)
        self.log("Get own incidents", ok, f"Count: {len(data) if ok else 'N/A'}")

    def test_get_stats(self):
        status, data = self.req("get", "stats", params={"parentId": self.parent_id})
        ok = status == 200 and "totalIncidents" in data
        self.log("Get stats", ok, f"Total: {data.get('totalIncidents', 'N/A')}")

    def test_review_incident(self):
        if not self.incident_id:
            self.log("Mark incident reviewed", False, "No incident ID")
            return
        status, data = self.req("patch", f"incidents/{self.incident_id}/review")
        ok = status == 200
        self.log("Mark incident reviewed", ok, data.get("message", ""))

    def test_delete_incident(self):
        if not self.incident_id:
            self.log("Delete incident", False, "No incident ID")
            return
        status, data = self.req("delete", f"incidents/{self.incident_id}")
        ok = status == 200
        self.log("Delete own incident", ok, data.get("message", ""))

    def test_delete_nonexistent(self):
        status, _ = self.req("delete", f"incidents/{uuid.uuid4()}")
        ok = status == 404
        self.log("Delete non-existent incident blocked", ok, f"Status: {status}")

    def test_rate_limit(self):
        # Submit 61 rapid requests and expect 429 on the last
        hit_limit = False
        for i in range(65):
            status, _ = self.req("post", "incidents", auth=False, data={
                "message": "test",
                "username": "u",
                "platform": "Roblox",
                "url": "https://roblox.com",
                "riskLevel": "low",
                "riskScore": 2,
                "detectedPatterns": [],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "parentId": None,
                "childName": "Child"
            })
            if status == 429:
                hit_limit = True
                self.log("Rate limiting triggers at threshold", True, f"Triggered at request {i+1}")
                break
        if not hit_limit:
            self.log("Rate limiting triggers at threshold", False, "429 never returned")

    def run_all(self):
        print("\n🚀 KidGuard API Test Suite")
        print(f"   Target: {self.base_url}")
        print("=" * 55)

        print("\n── Health ──────────────────────────────────────────")
        self.test_health()

        print("\n── Authentication ──────────────────────────────────")
        self.test_register()
        self.test_duplicate_register()
        self.test_login()
        self.test_login_wrong_password()

        print("\n── Security ────────────────────────────────────────")
        self.test_no_auth_rejected()
        self.test_fake_token_rejected()
        self.test_access_other_profile()

        print("\n── Parent Profile ──────────────────────────────────")
        self.test_get_own_profile()

        print("\n── Incidents ───────────────────────────────────────")
        self.test_create_incident()
        self.test_fake_parent_incident()
        self.test_get_incidents()
        self.test_review_incident()
        self.test_delete_incident()
        self.test_delete_nonexistent()

        print("\n── Stats ───────────────────────────────────────────")
        self.test_get_stats()

        print("\n── Rate Limiting ───────────────────────────────────")
        self.test_rate_limit()

        print("\n" + "=" * 55)
        print(f"📊 Results: {self.tests_passed}/{self.tests_run} passed")
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} test(s) failed")
            return 1

if __name__ == "__main__":
    sys.exit(KidGuardAPITester().run_all())
