// config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../models');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Find or create user logic
      let user = await User.findOne({ 
        where: { google_id: profile.id } 
      });

      if (!user) {
        // Check if user with same email exists
        user = await User.findOne({ 
          where: { email: profile.emails[0].value } 
        });

        if (user) {
          // Link existing account
          user.google_id = profile.id;
          user.oauth_provider = 'google';
          await user.save();
        } else {
          // Create new user
          user = await User.create({
            google_id: profile.id,
            email: profile.emails[0].value,
            username: profile.displayName.replace(/\s+/g, '_').toLowerCase(),
            email_verified: true,
            oauth_provider: 'google'
          });
        }
      }
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
));

module.exports = passport;