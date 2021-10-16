require('dotenv').config();

const bcrypt = require('bcrypt');

const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const initialize = (passport) => {
  const authenticateUser = async (email, password, done) => {
    try {
      // let user = await User.findOne({ googleID: profile.id }).exec();
      let user = await User.findOne({
        email,
      })
        .select('+password')
        .exec();
      if (!user) throw new Error("User doesn't exist");
      // console.log(email, password, user.password, user);
      if (await bcrypt.compare(password || 'NA', user.password || 'NA')) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Password incorrect' });
      }
    } catch (error) {
      done(error);
    }
  };

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password',
      },
      authenticateUser
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      let user = await User.findById(id).exec();
      if (user) done(null, user);
      else {
        done(null, null);
      }
    } catch (error) {}
  });
};

module.exports = initialize;
