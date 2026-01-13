require('dotenv').config();
const FPassport = require('@fastify/passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const FacebookStrategy = require('passport-facebook').Strategy

const { User } = require('../models')
const { userCache } = require('../utils/cache-manager')

async function oauthPassport(fastify) {
  const baseUrl = process.env.CLIENT_URL
  
  FPassport.registerUserSerializer(async (user, request) => { return user.id })
  FPassport.registerUserDeserializer(async (id, request) => {
    // Return Sequelize Instance so controllers can use .update()
    try {
      const user = await User.findByPk(id);
      return user;
    } catch (e) {
      return null;
    }
  })

  const getOathCallback = (providerName) => async (accessToken, refreshToken, profile, done) => {
    try {
      const email = Array.isArray(profile.emails) && profile.emails[0] ? profile.emails[0].value : null
      const avatarUrl = Array.isArray(profile.photos) && profile.photos[0] ? profile.photos[0].value : null
      const displayName = profile.displayName || (profile.name && (profile.name.givenName + ' ' + profile.name.familyName)) || 'User'
      const provider = providerName
      const providerId = profile.id
      
      let user = await User.findOne({ where: { provider, providerId } })
      if (!user && email) user = await User.findOne({ where: { email } })
      if (user) {
        user.provider = provider
        user.providerId = providerId
        user.name = user.name || displayName
        user.avatarUrl = avatarUrl || user.avatarUrl
        if (!user.email && email) user.email = email
        await user.save()
      } else user = await User.create({ provider, providerId, name: displayName, email, avatarUrl })
      const plainUser = user.get({ plain: true })
      userCache.set(user.id, plainUser)
      return done(null, plainUser);
    } catch (err) {
      return done(err)
    }
  }

  FPassport.use('google', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: new URL('/auth/google/callback', baseUrl).toString(),
  }, getOathCallback('google')))

  FPassport.use('facebook', new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: new URL('/auth/facebook/callback', baseUrl).toString(),
    profileFields: ['id', 'displayName', 'emails', 'photos'],
  }, getOathCallback('facebook')))
}

module.exports = oauthPassport