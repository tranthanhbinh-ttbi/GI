const { Follower } = require('../models')
const FPassport = require('@fastify/passport')

async function oauthRoutes(fastify) {
  function checkLoggedIn(request, reply, done) {
    if (request.isAuthenticated && request.isAuthenticated()) return done()
    console.log('Unauthorized')
    reply.code(200).send({ ok: false, code: 401, message: "Unauthorized" })
  }

  async function checkFollowed(user) {
    if (!user || !user.id) return
    try {
      await Follower.findOrCreate({ where: { userId: user.id }, defaults: { userId: user.id } })
    } catch (err) {
      if (err?.name !== 'SequelizeUniqueConstraintError') {
        console.error('Failed to ensure follower record after login:', err)
      }
    }
  }

  fastify.get('/auth/google', {
    preValidation: FPassport.authenticate('google', { scope: ['profile', 'email'] })
  }, async (request, reply) => { })
  fastify.get('/auth/google/callback', {
    preValidation: FPassport.authenticate('google', { failureRedirect: '/' })
  }, async (request, reply) => {
    await checkFollowed(request.user)
    await new Promise(resolve => setTimeout(resolve, 1000));
    return reply.redirect('/')
  })

  fastify.get('/auth/facebook', {
    preValidation: FPassport.authenticate('facebook', { scope: ['public_profile', 'email'] })
  }, async (request, reply) => { })
  fastify.get('/auth/facebook/callback', {
    preValidation: FPassport.authenticate('facebook', { failureRedirect: '/' })
  }, async (request, reply) => {
    await checkFollowed(request.user)
    await new Promise(resolve => setTimeout(resolve, 1000));
    return reply.redirect('/')
  })

  fastify.get('/login', {
    preHandler: [FPassport.authenticate('session'), checkLoggedIn], credentials: 'include'
  }, async (request) => {
    const { id, name, email, avatarUrl } = request.user
    const isFollowing = !!(await Follower.findOne({ where: { userId: id } }))
    const followersCount = await Follower.count()
    return { id, name, email, avatarUrl, isFollowing, followersCount }
  })
  fastify.post('/logout', async (request, reply) => {
    await request.logout()
    reply.clearCookie('session', { path: '/' })
    return { ok: true }
  })
}

module.exports = oauthRoutes