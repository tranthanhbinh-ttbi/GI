/**
 * Auth Handshake Manager
 * 
 * Giải pháp: Authentication Handshake Protocol để xử lý Race Condition
 * - Tạo temporary token sau khi OAuth callback thành công
 * - Client confirm token trước khi gọi /api/me
 * - Đảm bảo session đã persisted
 */

class AuthHandshakeManager {
  constructor(options = {}) {
    this.tokens = new Map()
    this.tokenTTL = options.tokenTTL || 30000 // 30 seconds
    this.maxTokens = options.maxTokens || 10000
    this.cleanupInterval = options.cleanupInterval || 5000
    
    // Auto cleanup expired tokens
    this.startCleanupInterval()
  }

  /**
   * Generate authentication handshake token
   * @param {number} userId - User ID
   * @param {object} metadata - Additional data to store
   * @returns {string} Token
   */
  generateToken(userId, metadata = {}) {
    const crypto = require('crypto')
    const token = crypto.randomBytes(32).toString('hex')
    
    const data = {
      userId,
      metadata,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.tokenTTL,
      verified: false
    }
    
    // Prevent memory leak
    if (this.tokens.size >= this.maxTokens) {
      const oldest = Array.from(this.tokens.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt)[0]
      this.tokens.delete(oldest[0])
    }
    
    this.tokens.set(token, data)
    return token
  }

  /**
   * Verify and consume token
   * @param {string} token - Token to verify
   * @returns {object|null} Token data if valid, null otherwise
   */
  verifyToken(token) {
    if (!this.tokens.has(token)) {
      return null
    }

    const data = this.tokens.get(token)
    
    // Check expiration
    if (Date.now() > data.expiresAt) {
      this.tokens.delete(token)
      return null
    }

    // Mark as verified (but don't delete yet, in case of multiple verifications)
    data.verified = true
    return data
  }

  /**
   * Consume token (delete after use)
   * @param {string} token - Token to consume
   * @returns {boolean} True if consumed successfully
   */
  consumeToken(token) {
    if (!this.tokens.has(token)) {
      return false
    }
    
    const data = this.tokens.get(token)
    if (Date.now() > data.expiresAt) {
      this.tokens.delete(token)
      return false
    }

    this.tokens.delete(token)
    return true
  }

  /**
   * Get token info without consuming it
   * @param {string} token - Token to check
   * @returns {object|null}
   */
  getTokenInfo(token) {
    const data = this.verifyToken(token)
    return data ? { ...data } : null
  }

  /**
   * Start automatic cleanup interval
   */
  startCleanupInterval() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now()
      const expired = []

      for (const [token, data] of this.tokens.entries()) {
        if (now > data.expiresAt) {
          expired.push(token)
        }
      }

      expired.forEach(token => this.tokens.delete(token))
    }, this.cleanupInterval)
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * Get stats
   * @returns {object}
   */
  getStats() {
    const now = Date.now()
    const active = Array.from(this.tokens.values())
      .filter(d => now <= d.expiresAt)
    const verified = active.filter(d => d.verified).length

    return {
      totalTokens: this.tokens.size,
      activeTokens: active.length,
      verifiedTokens: verified,
      unverifiedTokens: active.length - verified
    }
  }

  /**
   * Cleanup all tokens
   */
  clear() {
    this.tokens.clear()
  }
}

module.exports = AuthHandshakeManager
