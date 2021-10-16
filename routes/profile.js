const Interview = require('../models/Interview');

const router = require('express').Router();

router.get('/', (req, res, next) => {
  console.log('on my way');
  if (req.isAuthenticated()) res.json({ type: 'success', user: req.user });
  else res.status(401).json({ type: 'failure', msg: 'Not logged in' });
});

router.get('/', (req, res, next) => {
  console.log('on my way');
  if (req.isAuthenticated()) res.json({ type: 'success', user: req.user });
  else res.status(401).json({ type: 'failure', msg: 'Not logged in' });
});

module.exports = router;
