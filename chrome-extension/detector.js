// Grooming Detection Rule Engine
class GroomingDetector {
  constructor() {
    this.rules = {
      ageProbing: {
        patterns: [
          /how old are you/i,
          /what('?s| is) your age/i,
          /what grade are you in/i,
          /how old r u/i,
          /ur age/i,
          /your age/i,
          /are you \d+/i,
          /hw old/i,
          /h0w old/i,
          /age\?/i,
          /wuts ur age/i,
          /wat is ur age/i,
          /u \d+ yet/i,
          /still in school/i,
          /what year are you in/i,
          /how young are you/i,
          /r u \d+/i,
          /you look young/i,
          /you seem young/i
        ],
        score: 3,
        category: 'Age Probing'
      },

      isolationAttempts: {
        patterns: [
          /don'?t tell your parents/i,
          /keep this (between us|secret|quiet)/i,
          /don'?t tell anyone/i,
          /this is between us/i,
          /our (little )?secret/i,
          /don'?t say anything/i,
          /just between (you and me|us)/i,
          /no one (needs to|has to|should) know/i,
          /keep it quiet/i,
          /don'?t mention/i,
          /without telling/i,
          /without anyone knowing/i,
          /promise not to tell/i,
          /pinky (promise|swear)/i,
          /between me and you/i,
          /dnt tell/i,
          /dont tell/i,
          /ur parents don'?t need to know/i,
          /parents (can'?t|won'?t) find out/i
        ],
        score: 5,
        category: 'Isolation Attempts'
      },

      offPlatformMigration: {
        patterns: [
          /add me on (discord|whatsapp|telegram|snapchat|instagram|tiktok)/i,
          /my (discord|whatsapp|snap|ig|insta|telegram) is/i,
          /text me (at|on)/i,
          /dm me/i,
          /message me on/i,
          /add me:/i,
          /discord:/i,
          /snap(chat)?:/i,
          /kik:/i,
          /we can talk on/i,
          /lets move to/i,
          /let'?s chat on/i,
          /hit me up on/i,
          /find me on/i,
          /follow me on/i,
          /give me your (number|phone|contact)/i,
          /whats your (number|phone)/i,
          /what'?s ur (number|phone)/i,
          /call me/i,
          /facetime/i,
          /video call/i,
          /send me your number/i
        ],
        score: 4,
        category: 'Off-Platform Migration'
      },

      emotionalManipulation: {
        patterns: [
          /you'?re special/i,
          /i (really )?understand you/i,
          /you'?re different (from|than)/i,
          /you'?re mature for your age/i,
          /we have a (real )?connection/i,
          /you'?re not like (the )?other/i,
          /i really like you/i,
          /you'?re the only one/i,
          /i (really )?care about you/i,
          /i love you/i,
          /you'?re so (smart|beautiful|handsome|cute|pretty)/i,
          /no one (understands|gets) you like i do/i,
          /i'?ve never felt this way/i,
          /you mean (so much|everything) to me/i,
          /i (always|will always) be here for you/i,
          /your (friends|family) don'?t understand/i,
          /i'?m the only one who (gets|understands) you/i,
          /you can trust me/i,
          /we'?re (so )?alike/i,
          /you'?re so (grown up|adult|wise)/i
        ],
        score: 2,
        category: 'Emotional Manipulation'
      },

      schedulingPrivacy: {
        patterns: [
          /when are you (alone|by yourself|home alone)/i,
          /are your parents home/i,
          /when will (they|your parents) leave/i,
          /do you have privacy/i,
          /are you by yourself/i,
          /when can we talk (privately|alone)/i,
          /when (no one|nobody) is around/i,
          /when are you free/i,
          /are you alone (right now|now|tonight)/i,
          /is anyone (home|there|around)/i,
          /when do (you get home|your parents leave)/i,
          /when (will you be|are you) alone/i,
          /home alone/i,
          /ur alone/i,
          /r u alone/i,
          /anyone (watching|around|home)/i
        ],
        score: 4,
        category: 'Scheduling/Privacy'
      },

      meetingRequests: {
        patterns: [
          /want to meet (up|in person|irl)/i,
          /let'?s meet (up|in person|irl|somewhere)/i,
          /meet me (at|in|near)/i,
          /can we meet/i,
          /hang out (in person|irl|together)/i,
          /come (over|to my place|to my house)/i,
          /i'?ll pick you up/i,
          /where do you live/i,
          /what'?s your (address|location)/i,
          /near me\?/i,
          /you live (near|close|around)/i,
          /meet irl/i,
          /irl meet/i,
          /in real life/i,
          /wanna meet/i,
          /wanna hang/i,
          /meet (in|at) the (park|mall|school|place|spot)/i,
          /meet (up )?somewhere/i,
          /talk in person/i,
          /see (you|u) in person/i,
          /meet (you|u) (in person|outside|somewhere|soon)/i,
          /we (could|should|can) meet/i,
          /rather (meet|talk|hang)/i,
          /prefer (to meet|if we meet|if we talk in person)/i,
          /come (find|see|meet) (me|us)/i,
          /show you (around|my place|where i live)/i,
          /in person (like|right|yeah|though)/i,
          /outside (of roblox|the game|online)/i
        ],
        score: 6,
        category: 'Meeting Request'
      },

      explicitContent: {
        patterns: [
          /send (me )?(a )?(pic|photo|picture|photo|nude|nudes|selfie)/i,
          /show me (your|a)/i,
          /send (nudes|pics|photos)/i,
          /you'?re (hot|sexy)/i,
          /do you (like|watch) (porn|adult)/i,
          /have you (had sex|kissed|done it)/i,
          /ever (been kissed|done anything sexual)/i,
          /do you (touch|pleasure)/i,
          /sexual/i,
          /intimate/i,
          /naked/i,
          /body parts/i
        ],
        score: 8,
        category: 'Explicit Content'
      },

      giftOffering: {
        patterns: [
          /i'?ll (buy|give|send|get) you/i,
          /want (free )?(robux|v-bucks|gems|coins|skins|items)/i,
          /i have (free|extra) (robux|items|skins)/i,
          /giving away (robux|items)/i,
          /i'?ll (pay|transfer|send) you/i,
          /gift (card|code)/i,
          /free (robux|stuff|items|skins|v-bucks)/i,
          /i can get you/i,
          /do something for me and i'?ll/i
        ],
        score: 4,
        category: 'Gift/Bribery'
      }
    };

    this.thresholds = {
      low: { min: 1, max: 3 },
      medium: { min: 4, max: 6 },
      high: { min: 7, max: Infinity }
    };

    // Track recent messages per session for context scoring
    this.recentMessages = [];
    this.MAX_CONTEXT_MESSAGES = 20;
  }

  // Analyse a single message
  analyzeMessage(message) {
    let totalScore = 0;
    const detectedPatterns = [];

    for (const [ruleKey, rule] of Object.entries(this.rules)) {
      for (const pattern of rule.patterns) {
        if (pattern.test(message)) {
          totalScore += rule.score;
          detectedPatterns.push({
            category: rule.category,
            score: rule.score,
            pattern: pattern.toString()
          });
          break; // Only count once per category
        }
      }
    }

    // Store message in context window
    this.recentMessages.push({ text: message, score: totalScore, detectedPatterns, timestamp: Date.now() });
    if (this.recentMessages.length > this.MAX_CONTEXT_MESSAGES) {
      this.recentMessages.shift();
    }

    // Apply context scoring bonus
    const contextBonus = this._getContextBonus(detectedPatterns);
    totalScore += contextBonus;

    // Apply repeat message penalty
    const repeatPenalty = this._getRepeatPenalty(message);
    totalScore += repeatPenalty;

    const riskLevel = this._getRiskLevel(totalScore);

    return {
      riskLevel,
      totalScore,
      detectedPatterns,
      contextBonus,
      repeatPenalty,
      timestamp: new Date().toISOString(),
      message
    };
  }

  // Context scoring — combinations of categories raise the score
  _getContextBonus(currentPatterns) {
    const recentCategories = new Set(
      this.recentMessages.flatMap(m => m.detectedPatterns.map(p => p.category))
    );
    const currentCategories = new Set(currentPatterns.map(p => p.category));

    let bonus = 0;

    // All context bonuses require the current message to carry its own risk signal.
    // Without this guard, a completely innocent message in a risky conversation
    // inherits the full context bonus and gets falsely flagged as high risk.
    if (currentPatterns.length > 0) {
      // Age probing + meeting request = very high risk
      if (
        (recentCategories.has('Age Probing') || currentCategories.has('Age Probing')) &&
        (recentCategories.has('Meeting Request') || currentCategories.has('Meeting Request'))
      ) {
        bonus += 5;
      }

      // Isolation + off-platform = high risk
      if (
        (recentCategories.has('Isolation Attempts') || currentCategories.has('Isolation Attempts')) &&
        (recentCategories.has('Off-Platform Migration') || currentCategories.has('Off-Platform Migration'))
      ) {
        bonus += 4;
      }

      // Emotional manipulation + scheduling = high risk
      if (
        (recentCategories.has('Emotional Manipulation') || currentCategories.has('Emotional Manipulation')) &&
        (recentCategories.has('Scheduling/Privacy') || currentCategories.has('Scheduling/Privacy'))
      ) {
        bonus += 3;
      }

      // Gift offering + any other category = suspicious
      if (currentCategories.has('Gift/Bribery')) {
        bonus += 2;
      }

      // 3+ different risk categories in recent context = escalate
      const allCategories = new Set([...recentCategories, ...currentCategories]);
      if (allCategories.size >= 3) {
        bonus += 3;
      }
    }

    // Conversation-level escalation — also gated on current message having risk
    if (currentPatterns.length > 0) {
      const recentScoringMessages = this.recentMessages.filter(m => m.score > 0);
      if (recentScoringMessages.length >= 5) {
        bonus += 4;
      } else if (recentScoringMessages.length >= 3) {
        bonus += 2;
      }

      // Meeting request in context of emotional manipulation = very high risk
      if (
        (recentCategories.has('Meeting Request') || currentCategories.has('Meeting Request')) &&
        (recentCategories.has('Emotional Manipulation') || currentCategories.has('Emotional Manipulation'))
      ) {
        bonus += 5;
      }

      // Isolation + meeting request = critical
      if (
        (recentCategories.has('Isolation Attempts') || currentCategories.has('Isolation Attempts')) &&
        (recentCategories.has('Meeting Request') || currentCategories.has('Meeting Request'))
      ) {
        bonus += 6;
      }
    }

    return bonus;
  }

  // Penalise repeated similar messages (persistent behaviour).
  // Only counts prior messages that already had a grooming pattern score > 0,
  // so innocent repeated greetings ("hey", "hi") never accumulate a penalty.
  _getRepeatPenalty(message) {
    const normalised = message.toLowerCase().trim();
    const windowMs = 5 * 60 * 1000; // 5 minute window
    const now = Date.now();

    const similarRecent = this.recentMessages.filter(m => {
      const age = now - m.timestamp;
      const isSimilar = this._similarity(normalised, m.text.toLowerCase().trim()) > 0.7;
      return age < windowMs && isSimilar && m.score > 0;
    });

    if (similarRecent.length >= 3) return 4; // Very persistent
    if (similarRecent.length === 2) return 2; // Somewhat persistent
    return 0;
  }

  // Simple similarity check between two strings
  _similarity(a, b) {
    if (a === b) return 1;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 1;
    const editDist = this._editDistance(longer, shorter);
    return (longer.length - editDist) / longer.length;
  }

  _editDistance(a, b) {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
    return matrix[b.length][a.length];
  }

  _getRiskLevel(score) {
    if (score >= this.thresholds.high.min) return 'high';
    if (score >= this.thresholds.medium.min) return 'medium';
    if (score >= this.thresholds.low.min) return 'low';
    return 'none';
  }

  // Analyse a full conversation
  analyzeConversation(messages) {
    let conversationScore = 0;
    const allPatterns = [];

    messages.forEach(msg => {
      const analysis = this.analyzeMessage(msg.text);
      conversationScore += analysis.totalScore;
      allPatterns.push(...analysis.detectedPatterns);
    });

    return {
      riskLevel: this._getRiskLevel(conversationScore),
      totalScore: conversationScore,
      detectedPatterns: allPatterns,
      messageCount: messages.length
    };
  }
}

// Make detector available globally
window.GroomingDetector = GroomingDetector;
