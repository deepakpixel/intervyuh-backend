const router = require('express').Router();
const passport = require('passport');

router.post('/login', async (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    try {
      if (err) throw Error(err.message);
      if (!user) throw Error('Incorrect password or username');
      req.logIn(user, (err) => {
        if (err) throw Error('Unknown error occured');
        return res.json({
          type: 'success',
          msg: 'Logged in successfully',
          user,
        });
      });
    } catch (error) {
      res.status(500).json({ type: 'failure', msg: error.message });
    }
  })(req, res, next);
});
router.delete('/logout', async (req, res) => {
  try {
    req.logout();
    return res.json({
      type: 'success',
      msg: 'Logged Out',
    });
  } catch (err) {
    res.status(500).json({ type: 'failure', msg: err.message });
  }
});
router.get('/logout', async (req, res) => {
  try {
    req.logout();
    return res.json({
      type: 'success',
      msg: 'Logged Out',
    });
  } catch (err) {
    res.status(500).json({ type: 'failure', msg: err.message });
  }
});

module.exports = router;
