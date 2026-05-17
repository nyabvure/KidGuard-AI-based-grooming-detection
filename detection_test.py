#!/usr/bin/env python3
"""
KidGuard Grooming Detection Engine Test
Tests the detection logic and scoring system
"""

import json
import sys

class GroomingDetectorTest:
    def __init__(self):
        # Replicate the detection rules from detector.js
        self.rules = {
            'ageProbing': {
                'patterns': [
                    'how old are you',
                    'what grade are you in',
                    "what's your age",
                    'how old r u',
                    'ur age',
                    'your age'
                ],
                'score': 3,
                'category': 'Age Probing'
            },
            'isolationAttempts': {
                'patterns': [
                    "don't tell your parents",
                    'keep this secret',
                    "don't tell anyone",
                    'this is between us',
                    'our secret',
                    "don't say anything",
                    'just between you and me'
                ],
                'score': 5,
                'category': 'Isolation Attempts'
            },
            'offPlatformMigration': {
                'patterns': [
                    'add me on discord',
                    'add me on whatsapp',
                    'add me on telegram',
                    'my discord is',
                    'my whatsapp',
                    'text me at',
                    'dm me',
                    'message me on',
                    'snapchat'
                ],
                'score': 4,
                'category': 'Off-Platform Migration'
            },
            'emotionalManipulation': {
                'patterns': [
                    "you're special",
                    'i understand you',
                    "you're different",
                    "you're mature for your age",
                    'we have a connection',
                    "you're not like other",
                    'i really like you'
                ],
                'score': 2,
                'category': 'Emotional Manipulation'
            },
            'schedulingPrivacy': {
                'patterns': [
                    'when are you alone',
                    'are your parents home',
                    'when will they leave',
                    'do you have privacy',
                    'are you by yourself',
                    'when can we talk privately',
                    'when no one is around'
                ],
                'score': 4,
                'category': 'Scheduling/Privacy'
            }
        }
        
        self.thresholds = {
            'low': {'min': 0, 'max': 3},
            'medium': {'min': 4, 'max': 6},
            'high': {'min': 7, 'max': float('inf')}
        }
        
        self.tests_run = 0
        self.tests_passed = 0

    def analyze_message(self, message):
        """Analyze a message for grooming patterns"""
        total_score = 0
        detected_patterns = []
        message_lower = message.lower()
        
        # Check message against all rule categories
        for rule_key, rule in self.rules.items():
            for pattern in rule['patterns']:
                if pattern.lower() in message_lower:
                    total_score += rule['score']
                    detected_patterns.append({
                        'category': rule['category'],
                        'score': rule['score'],
                        'pattern': pattern
                    })
                    break  # Only count once per category
        
        # Determine risk level
        risk_level = 'low'
        if total_score >= self.thresholds['high']['min']:
            risk_level = 'high'
        elif total_score >= self.thresholds['medium']['min']:
            risk_level = 'medium'
        
        return {
            'riskLevel': risk_level,
            'totalScore': total_score,
            'detectedPatterns': detected_patterns,
            'message': message
        }

    def test_detection(self, test_name, message, expected_risk, expected_min_score=None):
        """Test a specific message for detection accuracy"""
        self.tests_run += 1
        
        result = self.analyze_message(message)
        
        success = result['riskLevel'] == expected_risk
        if expected_min_score is not None:
            success = success and result['totalScore'] >= expected_min_score
        
        if success:
            self.tests_passed += 1
            print(f"✅ PASS - {test_name}")
        else:
            print(f"❌ FAIL - {test_name}")
            print(f"    Expected: {expected_risk} (score >= {expected_min_score or 'any'})")
            print(f"    Got: {result['riskLevel']} (score: {result['totalScore']})")
        
        print(f"    Message: '{message}'")
        print(f"    Score: {result['totalScore']}, Risk: {result['riskLevel']}")
        if result['detectedPatterns']:
            patterns = [p['category'] for p in result['detectedPatterns']]
            print(f"    Patterns: {', '.join(patterns)}")
        print()
        
        return success, result

    def run_all_tests(self):
        """Run comprehensive detection tests"""
        print("🔍 Testing KidGuard Grooming Detection Engine")
        print("=" * 60)
        
        # Test individual pattern categories
        print("📋 Testing Individual Pattern Categories:")
        
        # Age Probing (3 points)
        self.test_detection("Age Probing", "how old are you?", "low", 3)
        self.test_detection("Age Probing Variant", "what's your age kid", "low", 3)
        
        # Isolation Attempts (5 points) 
        self.test_detection("Isolation Attempt", "don't tell your parents about this", "medium", 5)
        self.test_detection("Secret Keeping", "keep this secret between us", "medium", 5)
        
        # Off-Platform Migration (4 points)
        self.test_detection("Platform Migration", "add me on discord", "medium", 4)
        self.test_detection("Contact Exchange", "my whatsapp is 123456", "medium", 4)
        
        # Emotional Manipulation (2 points)
        self.test_detection("Emotional Manipulation", "you're special and different", "low", 2)
        self.test_detection("False Connection", "i understand you better than others", "low", 2)
        
        # Scheduling/Privacy (4 points)
        self.test_detection("Privacy Probing", "when are you alone at home?", "medium", 4)
        self.test_detection("Parent Schedule", "are your parents home right now?", "medium", 4)
        
        print("📋 Testing Combined Patterns (High Risk):")
        
        # High-risk combinations (7+ points)
        self.test_detection(
            "Age + Isolation", 
            "how old are you? don't tell your parents we talked", 
            "high", 7
        )
        
        self.test_detection(
            "Multiple High-Risk", 
            "you're mature for your age, add me on discord, don't tell anyone", 
            "high", 7
        )
        
        self.test_detection(
            "Complex Grooming", 
            "how old are you? when are you alone? keep this secret", 
            "high", 7
        )
        
        print("📋 Testing Safe Messages:")
        
        # Safe messages (should be low risk)
        self.test_detection("Normal Gaming", "want to play roblox together?", "low")
        self.test_detection("Friendly Chat", "that was a fun game!", "low")
        self.test_detection("School Talk", "what school do you go to?", "low")
        
        print("📋 Testing Edge Cases:")
        
        # Edge cases
        self.test_detection("Empty Message", "", "low")
        self.test_detection("Numbers Only", "123456", "low")
        self.test_detection("Partial Match", "how are you doing?", "low")  # Should not match "how old are you"
        
        # Print summary
        print("=" * 60)
        print(f"📊 Detection Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All detection tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} detection tests failed")
            return 1

def main():
    tester = GroomingDetectorTest()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())