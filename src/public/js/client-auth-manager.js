/**
 * Client-side Auth Manager
 * 
 * Xử lý bất đồng bộ trên client:
 * - Handshake protocol
 * - Exponential backoff retry
 * - Event-based synchronization
 */

class ClientAuthManager {
  constructor(options = {}) {
    this.config = {
      maxRetries: options.maxRetries || 3,
      initialDelayMs: options.initialDelayMs || 100,
      maxDelayMs: options.maxDelayMs || 2000,
      handshakeTimeoutMs: options.handshakeTimeoutMs || 10000,
      wsTimeout: options.wsTimeout || 30000,
      ...options
    }
    this.ws = null
    this.authHandlers = []
  }

  /**
   * Check if auth handshake token exists in URL
   * @returns {string|null}
   */
  getHandshakeToken() {
    const params = new URLSearchParams(window.location.search)
    return params.get('auth_handshake')
  }

  /**
   * Get auth error from URL if exists
   * @returns {string|null}
   */
  getAuthError() {
    const params = new URLSearchParams(window.location.search)
    return params.get('auth_error')
  }

  /**
   * Fetch current user info
   * @returns {Promise<object|null>}
   */
  async fetchMe() {
    try {
      const res = await fetch('/api/me', { credentials: 'include' })
      if (!res.ok) {
        console.warn('[AUTH] Fetch /api/me failed:', res.status)
        return null
      }
      return await res.json()
    } catch (error) {
      console.error('[AUTH] Network error fetching /api/me:', error)
      return null
    }
  }

  /**
   * Fetch with exponential backoff retry
   * 
   * Useful when session might not be immediately available
   * @param {number} maxRetries
   * @param {number} initialDelayMs
   * @returns {Promise<object|null>}
   */
  async fetchMeWithRetry(maxRetries = this.config.maxRetries, initialDelayMs = this.config.initialDelayMs) {
    let lastError = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch('/api/me', { credentials: 'include' })

        if (res.ok) {
          const user = await res.json()
          console.log('[AUTH] fetchMe succeeded on attempt', attempt + 1)
          return user
        }

        if (res.status === 401 && attempt < maxRetries - 1) {
          const delayMs = Math.min(
            initialDelayMs * Math.pow(2, attempt),
            this.config.maxDelayMs
          )
          console.log(`[AUTH] Retry ${attempt + 1}/${maxRetries} after ${delayMs}ms`)
          await this.sleep(delayMs)
          continue
        }

        lastError = new Error(`HTTP ${res.status}: ${res.statusText}`)
        console.error('[AUTH] fetchMe failed:', lastError.message)
        return null
      } catch (error) {
        lastError = error
        if (attempt < maxRetries - 1) {
          const delayMs = Math.min(
            initialDelayMs * Math.pow(2, attempt),
            this.config.maxDelayMs
          )
          console.warn(`[AUTH] Network error, retry after ${delayMs}ms:`, error.message)
          await this.sleep(delayMs)
        } else {
          console.error('[AUTH] Max retries exceeded:', error)
        }
      }
    }

    return null
  }

  /**
   * Confirm handshake with server
   * 
   * @param {string} handshakeToken
   * @returns {Promise<boolean>}
   */
  async confirmHandshake(handshakeToken) {
    try {
      const res = await fetch('/api/auth/confirm', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ handshakeToken }),
        timeout: this.config.handshakeTimeoutMs
      })

      if (!res.ok) {
        console.error('[AUTH] Handshake confirmation failed:', res.status, res.statusText)
        return false
      }

      console.log('[AUTH] Handshake confirmed successfully')
      return true
    } catch (error) {
      console.error('[AUTH] Handshake error:', error)
      return false
    }
  }

  /**
   * Wait for auth ready event via WebSocket
   * 
   * @param {WebSocket} ws
   * @returns {Promise<boolean>}
   */
  async waitForAuthReady(ws) {
    return new Promise((resolve) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log('[AUTH] WebSocket not ready, skipping event wait')
        return resolve(false)
      }

      let resolved = false
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true
          console.log('[AUTH] Auth ready timeout')
          resolve(false)
        }
      }, this.config.wsTimeout)

      const handler = (e) => {
        if (resolved) return

        try {
          const msg = JSON.parse(e.data)
          if (msg.event === 'auth:ready') {
            resolved = true
            clearTimeout(timeoutId)
            ws.removeEventListener('message', handler)
            console.log('[AUTH] Received auth:ready event')
            resolve(true)
          }
        } catch (e) {
          // Ignore parse errors, could be other WebSocket messages
        }
      }

      ws.addEventListener('message', handler)
      console.log('[AUTH] Waiting for auth ready event...')
    })
  }

  /**
   * Handle complete auth flow with handshake
   * 
   * @param {object} options
   * @returns {Promise<object>}
   */
  async handleAuthWithHandshake(options = {}) {
    const {
      onSuccess = null,
      onError = null,
      onProgress = null
    } = options

    try {
      // Step 1: Check for auth error
      const authError = this.getAuthError()
      if (authError) {
        const error = new Error(`Authentication failed: ${authError}`)
        if (onError) onError(error)
        throw error
      }

      // Step 2: Get handshake token
      const handshakeToken = this.getHandshakeToken()

      if (!handshakeToken) {
        // No handshake token, try normal flow with retry
        console.log('[AUTH] No handshake token, using retry flow')
        if (onProgress) onProgress({ step: 'fetch_with_retry' })

        const user = await this.fetchMeWithRetry()
        if (user) {
          if (onSuccess) onSuccess(user)
          return user
        }

        throw new Error('Unable to fetch user after multiple retries')
      }

      // Step 3: Wait for auth event via WebSocket (optional)
      if (onProgress) onProgress({ step: 'wait_auth_event', token: handshakeToken })
      await this.waitForAuthReady(this.ws)

      // Step 4: Confirm handshake
      if (onProgress) onProgress({ step: 'confirm_handshake' })
      const confirmed = await this.confirmHandshake(handshakeToken)

      if (!confirmed) {
        throw new Error('Handshake confirmation failed')
      }

      // Step 5: Fetch user data
      if (onProgress) onProgress({ step: 'fetch_user' })
      const user = await this.fetchMe()

      if (!user) {
        throw new Error('Failed to fetch user after handshake')
      }

      // Step 6: Clean URL
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search.replace(/[?&]auth_handshake=[^&]*/g, '')
      )

      if (onSuccess) onSuccess(user)
      return user
    } catch (error) {
      console.error('[AUTH] Auth flow failed:', error)
      if (onError) onError(error)
      throw error
    }
  }

  /**
   * Handle auth after page load
   * 
   * @param {WebSocket} ws - WebSocket connection (optional)
   * @param {Function} onSuccess - Callback on success
   * @param {Function} onError - Callback on error
   */
  async initializeAuth(ws = null, onSuccess = null, onError = null) {
    this.ws = ws

    try {
      const user = await this.handleAuthWithHandshake({
        onSuccess,
        onError,
        onProgress: (progress) => {
          console.log('[AUTH] Progress:', progress)
        }
      })

      return user
    } catch (error) {
      console.error('[AUTH] Initialization failed:', error)
      if (onError) onError(error)
      return null
    }
  }

  /**
   * Utility: Sleep/delay
   * @param {number} ms
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Logout
   * @param {Function} onSuccess
   * @param {Function} onError
   */
  async logout(onSuccess = null, onError = null) {
    try {
      const res = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })

      if (!res.ok) {
        throw new Error(`Logout failed: ${res.status}`)
      }

      if (onSuccess) onSuccess()
      console.log('[AUTH] Logout successful')
      return true
    } catch (error) {
      console.error('[AUTH] Logout error:', error)
      if (onError) onError(error)
      return false
    }
  }

  /**
   * Register event handler
   * @param {string} event
   * @param {Function} handler
   */
  on(event, handler) {
    if (!this.authHandlers[event]) {
      this.authHandlers[event] = []
    }
    this.authHandlers[event].push(handler)
  }

  /**
   * Emit event to handlers
   * @param {string} event
   * @param {object} data
   */
  emit(event, data) {
    if (this.authHandlers[event]) {
      this.authHandlers[event].forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`[AUTH] Handler error for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.authHandlers = []
    this.ws = null
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.ClientAuthManager = ClientAuthManager
}

