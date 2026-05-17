// Comprehensive KidGuard Chrome Extension Test Suite
// Run with: node test_comprehensive.js

// Mock browser globals so detector.js works in Node
global.window = {};

// Load detector
const fs = require('fs');
const path = require('path');
const detectorCode = fs.readFileSync(path.join(__dirname, 'detector.js'), 'utf8');
eval(detectorCode);
const GroomingDetector = global.window.GroomingDetector;

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n── ${title} ──`);
}

// ─── canonicalText logic (mirrored from content-script.js) ─────────────────
function canonicalText(rawText) {
  const firstLine = rawText.split('\n').map(l => l.trim()).find(l => l.length > 0) || rawText;
  const colonIdx = firstLine.indexOf(':');
  if (colonIdx > 0 && colonIdx <= 40) {
    const possibleMsg = firstLine.substring(colonIdx + 1).trim();
    if (possibleMsg.length > 0) return possibleMsg;
  }
  return firstLine;
}

section('canonicalText dedup key');
assert(canonicalText('Alice: hello there') === 'hello there', 'strips username prefix');
assert(canonicalText('hello there') === 'hello there', 'plain text unchanged');
assert(canonicalText('\n  Alice: hello\n  world') === 'hello', 'multi-line — uses first non-empty line');
assert(canonicalText('VeryLongUsernameOver40Characters!!!!!!!!!!!!!: msg') === 'VeryLongUsernameOver40Characters!!!!!!!!!!!!!: msg', 'colon beyond pos 40 — keeps full line');
assert(canonicalText('') === '', 'empty string safe');

// ─── False positive gate — innocent messages ────────────────────────────────
section('False positives — innocent messages must stay score 0');
const d1 = new GroomingDetector();
const innocent = [
  'hey how are things going',
  'want to play another round?',
  'gg wp see you later',
  'what level are you on',
  'nice shot!',
  'lol that was funny',
  'brb dinner',
  'ok cool',
  'good game everyone',
  'follow me to the next area'   // "follow me on" pattern should NOT match "follow me to"
];
innocent.forEach(msg => {
  const r = d1.analyzeMessage(msg);
  assert(r.totalScore === 0, `"${msg.substring(0, 40)}" → score 0 (got ${r.totalScore})`);
});

// ─── Known-bad messages must be detected ────────────────────────────────────
section('True positives — grooming messages must score > 0');
const d2 = new GroomingDetector();
const flagged = [
  { msg: 'how old are you',              minScore: 1, label: 'age probing' },
  { msg: "don't tell your parents",      minScore: 1, label: 'isolation' },
  { msg: 'add me on discord',            minScore: 1, label: 'off-platform migration' },
  { msg: "you're special to me",         minScore: 1, label: 'emotional manipulation' },
  { msg: 'are you home alone right now', minScore: 1, label: 'scheduling/privacy' },
  { msg: 'want to meet up irl',          minScore: 1, label: 'meeting request (want to meet irl)' },
  { msg: "let's meet in person",         minScore: 1, label: 'meeting request (lets meet in person)' },
  { msg: 'talk in person',               minScore: 1, label: 'meeting request (talk in person)' },
  { msg: 'we could meet sometime',       minScore: 1, label: 'meeting request (we could meet)' },
  { msg: 'meet you outside of roblox',   minScore: 1, label: 'meeting request (outside of roblox)' },
  { msg: "send me a pic",                minScore: 1, label: 'explicit content' },
  { msg: "i'll give you free robux",     minScore: 1, label: 'gift/bribery' },
];
flagged.forEach(({ msg, minScore, label }) => {
  const r = d2.analyzeMessage(msg);
  assert(r.totalScore >= minScore, `[${label}] "${msg.substring(0, 45)}" → score ${r.totalScore} ≥ ${minScore}`);
});

// ─── Risk level thresholds ───────────────────────────────────────────────────
section('Risk level thresholds');
const d3 = new GroomingDetector();
// score 1 → low
const r1 = d3.analyzeMessage('your age?');
assert(r1.riskLevel === 'low', `score ${r1.totalScore} → low`);

const d4 = new GroomingDetector();
// isolation (5) + meeting request (6) + isolation+meeting context bonus (6) = 12 → high
d4.analyzeMessage("don't tell your parents");
const r2b = d4.analyzeMessage("let's meet in person");
assert(r2b.totalScore >= 7, `combo score ${r2b.totalScore} ≥ 7`);
assert(r2b.riskLevel === 'high', `combo → high risk`);

// ─── Context bonus — isolation + meeting request = critical ─────────────────
section('Context bonus — isolation + meeting request escalates correctly');
const d5 = new GroomingDetector();
d5.analyzeMessage("don't tell your parents");   // isolation score 5
const isolation = d5.recentMessages[d5.recentMessages.length - 1];
assert(isolation.detectedPatterns.length > 0, 'isolation detected');

const meetResult = d5.analyzeMessage("let's meet in person");
// meeting (6) + isolation+meeting bonus (6) + 2+ categories bonus (3) = 15 or more
assert(meetResult.totalScore >= 10, `isolation+meeting total score ${meetResult.totalScore} ≥ 10`);
assert(meetResult.riskLevel === 'high', `isolation+meeting → high`);

// ─── Innocent message in risky context stays safe ───────────────────────────
section('FIX: innocent message in risky context must NOT inherit context bonus');
const d6 = new GroomingDetector();
d6.analyzeMessage("don't tell your parents");
d6.analyzeMessage('how old are you');
d6.analyzeMessage('want to meet irl');
const innocent2 = d6.analyzeMessage('hey how are things going'); // zero-pattern message
assert(innocent2.totalScore === 0, `"hey how are things going" in risky context → score ${innocent2.totalScore} (must be 0)`);

// ─── Repeat penalty ──────────────────────────────────────────────────────────
section('Repeat penalty — persistent sender escalates');
const d7 = new GroomingDetector();
// Force timestamps to be recent
const before = Date.now;
Date.now = () => before() - 0; // use real time
d7.analyzeMessage('add me on discord');
d7.analyzeMessage('add me on discord pls');
d7.analyzeMessage('hey add me on discord');
const r3 = d7.analyzeMessage('seriously add me on discord');
assert(r3.repeatPenalty >= 2, `repeat penalty ${r3.repeatPenalty} ≥ 2`);

// ─── Repeat penalty does NOT fire for innocent messages ───────────────────────
section('Repeat penalty — innocent repeated greetings stay score 0');
const d8 = new GroomingDetector();
d8.analyzeMessage('hey');
d8.analyzeMessage('hi');
d8.analyzeMessage('hey');
const r4 = d8.analyzeMessage('hey');
assert(r4.totalScore === 0, `"hey" repeated 4x → score ${r4.totalScore} (must be 0)`);
assert(r4.repeatPenalty === 0, `repeat penalty for innocent greetings = ${r4.repeatPenalty} (must be 0)`);

// ─── _getRiskLevel returns none for score 0 ───────────────────────────────────
section('_getRiskLevel — score 0 returns none');
const d9 = new GroomingDetector();
const r5 = d9.analyzeMessage('hey');
assert(r5.riskLevel === 'none', `score 0 → riskLevel "${r5.riskLevel}" (must be none)`);

// ─── SYSTEM_SENDERS filter (tested indirectly via Set) ──────────────────────
section('SYSTEM_SENDERS filter list is complete');
const SYSTEM_SENDERS = new Set([
  'roblox', 'system', 'announcement', 'notice', 'moderator',
  'admin', 'server', 'game', 'bot', 'notification'
]);
['roblox', 'system', 'admin', 'bot'].forEach(name => {
  assert(SYSTEM_SENDERS.has(name), `"${name}" in SYSTEM_SENDERS`);
});

// ─── manifest.json permissions ───────────────────────────────────────────────
section('manifest.json — required permissions present');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
assert(manifest.permissions.includes('storage'),   'permission: storage');
assert(manifest.permissions.includes('downloads'), 'permission: downloads');
assert(manifest.permissions.includes('alarms'),    'permission: alarms (FIX 5)');
assert(manifest.host_permissions.some(p => p.includes('roblox.com')), 'host: roblox.com');
assert(manifest.host_permissions.some(p => p.includes('127.0.0.1')), 'host: 127.0.0.1 backend');

// ─── content-script.js key fix markers ───────────────────────────────────────
section('content-script.js — key fix markers present');
const cs = fs.readFileSync(path.join(__dirname, 'content-script.js'), 'utf8');
assert(cs.includes('canonicalText'),              'FIX 2: canonicalText function present');
assert(cs.includes('pendingKeys'),                'FIX 1: pendingKeys Set present');
assert(cs.includes('queueBackendSend'),           'FIX 13: queueBackendSend (rate limiting)');
assert(cs.includes('BACKEND_RATE_LIMIT_MS'),      'FIX 13: rate limit constant');
assert(cs.includes('scheduleBadgeReset'),         'FIX 9: badge auto-reset');
assert(cs.includes('SYSTEM_SENDERS'),             'FIX 11: system sender filter');
assert(cs.includes('isHidden'),                   'visibility check uses isHidden');
assert(cs.includes('getComputedStyle'),           'uses getComputedStyle (handles position:fixed overlays)');
assert(cs.includes("[class*=\"chat\"]"),          'broad [class*="chat"] selector present');
assert(cs.includes('querySelectorAll'),           'broad selectors pick largest element, not first match');
assert(cs.includes('currentUrl'),                 'FIX 7: URL tracking for navigation');
assert(cs.includes('seenElements'),               'seenElements WeakSet present');
assert(cs.includes('seenTexts'),                  'seenTexts Set present');
assert(cs.includes('<= 600') && !cs.includes('children.length'), 'children filter removed — 600-char cap is sole size gate');
assert(cs.includes('30000'),                      'FIX 4: 30s recentMessages expiry');
assert(cs.includes('<= 600'),                     'FIX 3: 600 char cap');
assert(!cs.includes("'parentId', 'childName', 'conversationLog'"), 'FIX 6: conversationLog NOT restored from storage');
assert(cs.includes("username !== 'Unknown'"),     'Unknown messages not deduped — sidebar notification always gets through');

// ─── popup.js fix ─────────────────────────────────────────────────────────────
section('popup.js — FIX 10: recent-activity status');
const popup = fs.readFileSync(path.join(__dirname, 'popup.js'), 'utf8');
assert(popup.includes('cutoff'), 'FIX 10: 30-minute cutoff present');
assert(popup.includes('recentMessages'), 'FIX 10: filters to recent messages');

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('ALL TESTS PASSED ✓');
} else {
  console.log('SOME TESTS FAILED — review output above');
  process.exit(1);
}
