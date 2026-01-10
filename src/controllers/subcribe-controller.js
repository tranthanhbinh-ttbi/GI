const { Subscribes } = require('../models')
const { statsSubCache } = require('../utils/cache-manager')

const CACHE_KEY_FOLLOWERS = 'global_followers_count'

async function FollowController(fastify) {
  fastify.post('/subscribes', { preHandler: fastify.authenticate }, async (request, reply) => {
    try {
      const userId = request.user.id
      
      const existing = await Subscribes.findOne({ 
        where: { userId },
        attributes: ['userId'] 
      })
      
      let isFollowing = false
      if (existing) {
        await existing.destroy()
        isFollowing = false
      } else {
        await Subscribes.create({ userId })
        isFollowing = true
      }

      let followersCount = statsSubCache.get(CACHE_KEY_FOLLOWERS)
      if (typeof followersCount === 'number') {
        if (isFollowing) followersCount++
        else followersCount = Math.max(0, followersCount - 1)
        statsSubCache.set(CACHE_KEY_FOLLOWERS, followersCount)
      } else {
        followersCount = await Subscribes.count()
        statsSubCache.set(CACHE_KEY_FOLLOWERS, followersCount)
      }
      return { success: true, isFollowing, followersCount }
    } catch (error) {
      request.log.error(error, 'Error in /subscribes')
      return reply.code(500).send({ 
        success: false, 
        message: 'Internal Server Error' 
      })
    }
  })
}

module.exports = FollowController