/**
 * Async Authentication Handler
 * 
 * Xử lý bất đồng bộ cho OAuth2 authentication
 * - Đảm bảo session persistence
 * - Quản lý handshake token
 * - Emit auth events
 */

const EventEmitter = require('events')

class AsyncAuthHandler extends EventEmitter {
  constructor(options = {}) {
    super()
    this.sessionTimeout = options.sessionTimeout || 5000 // 5 seconds to save session
    this.authEventHandlers = new Map()
  }

  /**
   * Handle post-authentication flow
   * 
   * @param {FastifyRequest} request - Fastify request object
   * @param {object} user - Authenticated user object
   * @param {object} options - Additional options
   * @returns {Promise<object>} Contains handshakeToken and metadata
   */
  async handlePostAuth(request, user, options = {}) {
    const {
      ensureFollowerRecord = null,
      emitFollowersSnapshot = null,
      handshakeManager = null,
    } = options

    if (!user || !user.id) {
      throw new Error('User object is required and must have an id')
    }

    try {
      // Phase 1: Create/Update user records in parallel
      const startTime = Date.now()
      
      const tasks = []

      if (ensureFollowerRecord) {
        tasks.push(
          ensureFollowerRecord(user)
            .catch(err => console.error('Failed to ensure follower record:', err))
        )
      }

      if (emitFollowersSnapshot) {
        tasks.push(
          emitFollowersSnapshot()
            .catch(err => console.error('Failed to emit followers snapshot:', err))
        )
      }

      // Wait for all background tasks
      await Promise.all(tasks)

      // Phase 2: Explicitly save session (CRITICAL)
      await this.persistSession(request, this.sessionTimeout)

      // Phase 3: Generate handshake token if manager provided
      let handshakeToken = null
      if (handshakeManager) {
        handshakeToken = handshakeManager.generateToken(user.id, {
          email: user.email,
          name: user.name,
          provider: user.provider
        })
      }

      // Phase 4: Emit authentication event
      const authData = {
        userId: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        timestamp: Date.now()
      }
      this.emit('auth:success', authData)

      const duration = Date.now() - startTime
      console.log(`[AUTH] Post-auth flow completed in ${duration}ms`)

      return {
        success: true,
        handshakeToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          provider: user.provider
        },
        duration
      }
    } catch (error) {
      console.error('[AUTH] Post-auth flow failed:', error)
      this.emit('auth:error', {
        userId: user?.id,
        error: error.message,
        timestamp: Date.now()
      })
      throw error
    }
  }

  /**
   * Persistently save session with timeout
   * 
   * @param {FastifyRequest} request
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<boolean>}
   */
  async persistSession(request, timeoutMs = 5000) {
    return Promise.race([
      new Promise((resolve, reject) => {
        // Fastify secure-session stores data on request.session
        // We need to ensure it's committed to storage
        
        if (request.session && typeof request.session.save === 'function') {
          request.session.save((err) => {
            if (err) {
              console.error('[AUTH] Session save error:', err)
              return reject(err)
            }
            console.log('[AUTH] Session saved successfully')
            resolve(true)
          })
        } else if (request.user) {
          // Fallback: If session has user set, it should auto-persist with secure-session
          console.log('[AUTH] Session auto-persisting via middleware')
          resolve(true)
        } else {
          reject(new Error('No session or user data available'))
        }
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Session save timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      )
    ])
  }

  /**
   * Verify handshake and session readiness
   * 
   * @param {FastifyRequest} request - Fastify request
   * @param {string} handshakeToken - Token from client
   * @param {object} handshakeManager - AuthHandshakeManager instance
   * @returns {Promise<object>}
   */
  async confirmHandshake(request, handshakeToken, handshakeManager) {
    // Step 1: Verify token format
    if (!handshakeToken || typeof handshakeToken !== 'string') {
      throw new Error('Invalid handshake token')
    }

    // Step 2: Verify token against manager
    const tokenData = handshakeManager.verifyToken(handshakeToken)
    if (!tokenData) {
      throw new Error('Handshake token not found or expired')
    }

    // Step 3: Verify session is authenticated
    if (!request.isAuthenticated?.()) {
      throw new Error('Session not authenticated')
    }

    // Step 4: Verify user ID matches
    if (request.user?.id !== tokenData.userId) {
      console.warn(
        '[AUTH] Handshake token user mismatch:',
        request.user?.id,
        'vs',
        tokenData.userId
      )
      throw new Error('User ID mismatch')
    }

    // Step 5: Consume the token (one-time use)
    handshakeManager.consumeToken(handshakeToken)

    // Step 6: Emit confirmation event
    this.emit('auth:handshake-confirmed', {
      userId: request.user.id,
      timestamp: Date.now()
    })

    return {
      success: true,
      user: {
        id: request.user.id,
        email: request.user.email,
        name: request.user.name
      }
    }
  }

  /**
   * Handle authentication error with recovery
   * 
   * @param {FastifyRequest} request
   * @param {FastifyReply} reply
   * @param {Error} error
   * @param {string} callbackPath - OAuth callback path
   */
  async handleAuthError(request, reply, error, callbackPath = '/') {
    console.error('[AUTH] Authentication error:', error)

    this.emit('auth:failure', {
      error: error.message,
      timestamp: Date.now()
    })

    // Return user to home page with error indicator
    return reply.redirect(`${callbackPath}?auth_error=${encodeURIComponent(error.message)}`)
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.removeAllListeners()
    this.authEventHandlers.clear()
  }
}

module.exports = AsyncAuthHandler
