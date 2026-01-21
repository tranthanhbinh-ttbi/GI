const { Subscribes } = require('../models')
const FPassport = require('@fastify/passport')
const { statsSubCache } = require('../utils/cache-manager')

const CACHE_KEY_FOLLOWERS = 'global_followers_count'

async function oauthRoutes(fastify) {
  function checkLoggedIn(request, reply, done) {
    if (request.isAuthenticated && request.isAuthenticated()) return done()
    reply.code(401).send({ ok: false, code: 401, message: "Unauthorized" })
  }

  async function checkFollowed(user) {
    if (!user || !user.id) return
    try {
      await Subscribes.findOrCreate({ 
        where: { userId: user.id }, 
        defaults: { userId: user.id } 
      })
    } catch (err) {
      if (err?.name !== 'SequelizeUniqueConstraintError') {
        fastify.log.error(err, 'Failed to ensure subscription record after login')
      }
    }
  }

  fastify.get('/auth/google', {
    preValidation: [
      async (request, reply) => { 
        if (request.query.returnTo) {
           // Use a dedicated cookie for returnTo to survive session regeneration
           reply.setCookie('login_return_to', request.query.returnTo, {
             path: '/',
             httpOnly: true,
             sameSite: 'lax',
             maxAge: 300 // 5 minutes
           })
        }
      },
      FPassport.authenticate('google', { scope: ['profile', 'email'] })
    ]
  }, async (request, reply) => { })

  const handleAuthError = (error, request, reply) => {
    fastify.log.warn(`OAuth Error: ${error.message}`)
    return reply.redirect('/')
  }

  fastify.get('/auth/google/callback', {
    preValidation: FPassport.authenticate('google', { failureRedirect: '/' }),
    errorHandler: handleAuthError
  }, async (request, reply) => {
    await checkFollowed(request.user)
    const returnTo = request.cookies.login_return_to || '/'
    reply.clearCookie('login_return_to', { path: '/' })
    return reply.redirect(returnTo)
  })

  fastify.get('/auth/facebook', {
    preValidation: [
      async (request, reply) => { 
        if (request.query.returnTo) {
          reply.setCookie('login_return_to', request.query.returnTo, {
             path: '/',
             httpOnly: true,
             sameSite: 'lax',
             maxAge: 300
           })
        }
      },
      FPassport.authenticate('facebook', { scope: ['public_profile', 'email'] })
    ]
  }, async (request, reply) => { })

  fastify.get('/auth/facebook/callback', {
    preValidation: FPassport.authenticate('facebook', { failureRedirect: '/' }),
    errorHandler: handleAuthError
  }, async (request, reply) => {
    await checkFollowed(request.user)
    const returnTo = request.cookies.login_return_to || '/'
    reply.clearCookie('login_return_to', { path: '/' })
    return reply.redirect(returnTo)
  })

  fastify.get('/login', {
    preHandler: [FPassport.authenticate('session'), checkLoggedIn]
  }, async (request) => {
    const { id, name, email, avatarUrl } = request.user
    const isFollowing = !!(await Subscribes.findOne({ 
        where: { userId: id },
        attributes: ['userId'] 
    }))

    let followersCount = statsSubCache.get(CACHE_KEY_FOLLOWERS)
    if (typeof followersCount !== 'number') {
        followersCount = await Subscribes.count()
        statsSubCache.set(CACHE_KEY_FOLLOWERS, followersCount)
    }
    return { id, name, email, avatarUrl, isFollowing, followersCount }
  })

  fastify.post('/logout', async (request, reply) => {
    try {
      if (request.logout) {
        await request.logout()
      }
      if (request.session) {
        request.session.delete()
      }
      return { ok: true }
    } catch (err) {
      request.log.error(err)
      return { ok: false, error: 'Logout failed' }
    }
  })
}

module.exports = oauthRoutes