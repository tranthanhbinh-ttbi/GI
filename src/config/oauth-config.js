require('dotenv').config();
const FPassport = require('@fastify/passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const FacebookStrategy = require('passport-facebook').Strategy
const { User } = require('../models')

async function oauthPassport(fastify) {
  FPassport.registerUserSerializer(async (user, request) => { return user.id })
  FPassport.registerUserDeserializer(async (id, request) => {
    const user = await User.findByPk(id)
    return user || null
  })

  FPassport.use('google', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback',
  }, async(accessToken, refreshToken, profile, done) => {
    try {
      const email = Array.isArray(profile.emails) && profile.emails[0] ? profile.emails[0].value : null
      const avatarUrl = Array.isArray(profile.photos) && profile.photos[0] ? profile.photos[0].value : null
      const displayName = profile.displayName || (profile.name && (profile.name.givenName + ' ' + profile.name.familyName)) || 'User'
      const providerId = profile.id
      
      let user = await User.findOne({ where: { provider: 'google', providerId } })
          if (!user && email) user = await User.findOne({ where: { email } })
          if (user) {
            user.provider = 'google'
            user.providerId = providerId
            user.name = user.name || displayName
            user.avatarUrl = avatarUrl || user.avatarUrl
            if (!user.email && email) user.email = email
            await user.save()
          } else user = await User.create({ provider: 'google', providerId, name: displayName, email, avatarUrl })
          return done(null, user)
    } catch (error) {
      return done(err)
    }
  }))

  FPassport.use('facebook', new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails', 'photos'],
  }, async (accessToken, refreshToken, profile, done) => {
        try {
          const email = Array.isArray(profile.emails) && profile.emails[0] ? profile.emails[0].value : null
          const avatarUrl = Array.isArray(profile.photos) && profile.photos[0] ? profile.photos[0].value : null
          const displayName = profile.displayName || 'User'
          const providerId = profile.id

          let user = await User.findOne({ where: { provider: 'facebook', providerId } })
          if (!user && email) user = await User.findOne({ where: { email } })
          if (user) {
            user.provider = 'facebook'
            user.providerId = providerId
            user.name = user.name || displayName
            user.avatarUrl = avatarUrl || user.avatarUrl
            if (!user.email && email) user.email = email
            await user.save()
          } else user = await User.create({ provider: 'facebook', providerId, name: displayName, email, avatarUrl })
          return done(null, user)
        } catch (err) {
          return done(err)
        }
      }
    )
  )
}

module.exports = oauthPassport