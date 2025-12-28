const { Follower } = require('../models')

async function FollowRoutes(fastify) {
  fastify.post('/api/follow-toggle', { preHandler: fastify.authenticate }, async (request) => {
    const userId = request.user.id
    const existing = await Follower.findOne({ where: { userId } })
    if (existing) {
      await existing.destroy()
    } else {
      await Follower.create({ userId })
    }
    const followersCount = await Follower.count()
    broadcast('followers:update', { followersCount })
    return { isFollowing: !existing, followersCount }
  })
}

module.exports = FollowRoutes


