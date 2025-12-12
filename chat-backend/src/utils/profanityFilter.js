const Filter = require('bad-words');
const { RateLimit } = require('../middleware/rateLimiter');

// Custom filter with extended word list
const filter = new Filter();

// Make sure we spread the array into arguments
const competitorWords = ['discord', 'telegram', 'whatsapp', 'skype'];
filter.addWords(...competitorWords);

// Advanced profanity filter
class ContentModerator {
  constructor() {
    this.filter = filter;
    this.suspiciousPatterns = [
      /(http|https):\/\/[^\s]+/g, // URLs
      /[\w\.]+@[\w]+\.[\w]+/g, // Email addresses
      /(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g, // Phone numbers
    ];
    
    this.userViolations = new Map(); // Track user violations
  }

  // Check message for inappropriate content
  scanMessage(content, userId) {
    const result = {
      isClean: true,
      violations: [],
      filteredContent: content,
      shouldBlock: false
    };

    // Check for profanity
    if (this.filter.isProfane(content)) {
      result.isClean = false;
      result.violations.push('profanity');
      result.filteredContent = this.filter.clean(content);
    }

    // Check for suspicious patterns
    this.suspiciousPatterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        result.isClean = false;
        result.violations.push('suspicious_content');
        
        // Block messages with URLs until we have link scanning
        if (pattern.toString().includes('http')) {
          result.shouldBlock = true;
        }
      }
    });

    // Check for excessive capitalization (yelling)
    const words = content.split(' ');
    const capitalizedWords = words.filter(
      word => word === word.toUpperCase() && word.length > 2
    );
    if (capitalizedWords.length > words.length * 0.5) {
      result.isClean = false;
      result.violations.push('excessive_caps');
    }

    // Track user violations
    if (result.violations.length > 0) {
      this.trackUserViolation(userId, result.violations);
    }

    return result;
  }

  // Track user violations for moderation
  trackUserViolation(userId, violations) {
    const userRecord = this.userViolations.get(userId) || {
      count: 0,
      lastViolation: Date.now(),
      violations: []
    };

    userRecord.count++;
    userRecord.lastViolation = Date.now();
    userRecord.violations.push(...violations);
    
    this.userViolations.set(userId, userRecord);

    // Auto-mute after 3 violations in 1 hour
    if (
      userRecord.count >= 3 && 
      Date.now() - userRecord.violations[0] < 60 * 60 * 1000
    ) {
      userRecord.mutedUntil = Date.now() + (30 * 60 * 1000); // 30 minute mute
    }

    // Clean old records (older than 24 hours)
    this.cleanOldViolations();
  }

  cleanOldViolations() {
    const now = Date.now();
    for (const [userId, record] of this.userViolations.entries()) {
      if (now - record.lastViolation > 24 * 60 * 60 * 1000) {
        this.userViolations.delete(userId);
      }
    }
  }

  isUserMuted(userId) {
    const record = this.userViolations.get(userId);
    if (!record || !record.mutedUntil) return false;
    
    if (Date.now() > record.mutedUntil) {
      record.mutedUntil = null;
      return false;
    }
    
    return true;
  }

  getUserViolationStats(userId) {
    return this.userViolations.get(userId) || { count: 0, violations: [] };
  }
}

module.exports = new ContentModerator();
