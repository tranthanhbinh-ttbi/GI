const { Follower } = require('../models')
const FPassport = require('@fastify/passport')
const { broadcast } = require('../controllers/realtime')
const AsyncAuthHandler = require('../utils/async-auth-handler')
const AuthHandshakeManager = require('../utils/auth-handshake-manager')

async function oauthRoutes(fastify) {
  // Initialize handlers
  const authHandler = new AsyncAuthHandler({ sessionTimeout: 5000 })
  const handshakeManager = new AuthHandshakeManager({ tokenTTL: 30000 })

  function ensureLoggedIn(request, reply, done) {
    if (request.isAuthenticated && request.isAuthenticated()) return done()
    reply.code(401).send({ ok: false })
  }

  async function ensureFollowerRecord(user) {
    if (!user || !user.id) return
    try {
      await Follower.findOrCreate({ where: { userId: user.id }, defaults: { userId: user.id } })
    } catch (err) {
      if (err?.name !== 'SequelizeUniqueConstraintError') {
        console.error('Failed to ensure follower record after login:', err)
      }
    }
  }

  async function emitFollowersSnapshot() {
    try {
      const followersCount = await Follower.count()
      broadcast('followers:update', { followersCount })
    } catch (err) {
      console.error('Failed to broadcast followers count after login:', err)
    }
  }

  fastify.get('/auth/google', { 
    preValidation: FPassport.authenticate('google', { scope: ['profile', 'email'] }) 
  }, async (request, reply) => {})

  fastify.get('/auth/google/callback', { 
    preValidation: FPassport.authenticate('google', { failureRedirect: '/' }) 
  }, async (request, reply) => {
    try {
      // Use AsyncAuthHandler để xử lý post-auth flow
      const result = await authHandler.handlePostAuth(request, request.user, {
        ensureFollowerRecord,
        emitFollowersSnapshot,
        handshakeManager
      })
      
      // Trả về handshake token để client xác nhận
      return reply.redirect(`/?handshake=${result.handshakeToken}`)
    } catch (error) {
      console.error('[AUTH] Google callback error:', error)
      return reply.redirect('/?auth_error=callback_failed')
    }
  })

  fastify.get('/auth/facebook', { 
    preValidation: FPassport.authenticate('facebook', { scope: ['public_profile', 'email'] }) 
  }, async (request, reply) => {})

  fastify.get('/auth/facebook/callback', { 
    preValidation: FPassport.authenticate('facebook', { failureRedirect: '/' }) 
  }, async (request, reply) => {
    try {
      const result = await authHandler.handlePostAuth(request, request.user, {
        ensureFollowerRecord,
        emitFollowersSnapshot,
        handshakeManager
      })
      
      return reply.redirect(`/?handshake=${result.handshakeToken}`)
    } catch (error) {
      console.error('[AUTH] Facebook callback error:', error)
      return reply.redirect('/?auth_error=callback_failed')
    }
  })

  // NEW: Endpoint để confirm handshake
  fastify.post('/api/auth/confirm-handshake', { 
    preHandler: [FPassport.authenticate('session')] 
  }, async (request) => {
    const { handshakeToken } = request.body
    
    try {
      const result = await authHandler.confirmHandshake(
        request,
        handshakeToken,
        handshakeManager
      )
      return result
    } catch (error) {
      return reply.code(401).send({ ok: false, error: error.message })
    }
  })

  fastify.get('/api/me', { preHandler: [FPassport.authenticate('session'), ensureLoggedIn], credentials: 'include' },
    async (request) => {
      const { id, name, email, avatarUrl } = request.user
      const isFollowing = !!(await Follower.findOne({ where: { userId: id } }))
      const followersCount = await Follower.count()
      return { id, name, email, avatarUrl, isFollowing, followersCount }
    }
  )

  fastify.post('/api/logout', async (request, reply) => {
    await request.logout()
    reply.clearCookie('session', { path: '/' })
    return { ok: true }
  })
}

module.exports = oauthRoutes