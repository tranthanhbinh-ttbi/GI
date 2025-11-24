const { Follower } = require('../models')
const FPassport = require('@fastify/passport')
const { broadcast } = require('../controllers/realtime')

async function oauthRoutes(fastify) {
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
    await ensureFollowerRecord(request.user)
    await emitFollowersSnapshot()
    return reply.redirect('/') 
  })

	fastify.get('/auth/facebook', { 
    preValidation: FPassport.authenticate('facebook', { scope: ['public_profile', 'email'] }) 
  }, async (request, reply) => {})
	fastify.get('/auth/facebook/callback', { 
    preValidation: FPassport.authenticate('facebook', { failureRedirect: '/' }) 
  }, async (request, reply) => {
    await ensureFollowerRecord(request.user)
    await emitFollowersSnapshot()
    return reply.redirect('/') 
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