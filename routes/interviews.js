const mongoose = require('mongoose');
const Interview = require('../models/Interview');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = require('express').Router();

router.get('/', async (req, res, next) => {
  try {
    let { type } = req.query;
    let interviews;
    if (!req.isAuthenticated()) throw Error('You must be logged in');
    switch (type) {
      case 'upcoming':
        const { upcomingInterviews } = await req.user.populate(
          'upcomingInterviews'
        );
        interviews = upcomingInterviews;
        break;
      case 'past':
        const { pastInterviews } = await req.user.populate('pastInterviews');
        interviews = pastInterviews;
        break;

      default:
        throw Error('Provide type of interviews');
        break;
    }

    return res.json({
      type: 'success',
      msg: 'Fetched upcoming interviews',
      interviews,
    });
  } catch (error) {
    res
      .status(500)
      .json({ err: error.message, type: 'failure', msg: error.message });
  }
});
router.get('/:id', async (req, res, next) => {
  try {
    let { id } = req.params;
    if (!req.isAuthenticated()) throw Error('You must be logged in');
    console.log(id);
    if (!mongoose.Types.ObjectId.isValid(id)) throw Error('Invalid id');
    let interview = await Interview.findById(id);
    return res.json({
      type: 'success',
      msg: 'Fetched interview details',
      interview,
    });
  } catch (error) {
    res
      .status(500)
      .json({ err: error.message, type: 'failure', msg: error.message });
  }
});
router.get('/validate/:token', async (req, res, next) => {
  try {
    let { token } = req.params;
    let { interviewId: id, role } = jwt.verify(token, process.env.JWTSECRET);
    if (!req.isAuthenticated()) throw Error('You must be logged in');
    console.log(id);
    if (!mongoose.Types.ObjectId.isValid(id)) throw Error('Invalid id');
    let interview = await Interview.findById(id).select('-interviewerLink');
    if (!interview) throw Error('Invalid link');
    return res.json({
      type: 'success',
      msg: 'Fetched interview details',
      interview,
      role,
    });
  } catch (error) {
    res
      .status(500)
      .json({ err: error.message, type: 'failure', msg: error.message });
  }
});

router.post('/create', async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) throw Error('You must be logged in');

    // if (
    //   req.user.pastInterviews.length + req.user.upcomingInterviews.length >=
    //   20
    // )
    //   throw Error(
    //     'Max interview limit (20) reached! Please delete some interviews'
    //   );

    const { title, candidateName, interviewerName } = req.body;
    if (!title || !candidateName || !interviewerName)
      throw Error('Some fields are empty');

    const _id = mongoose.Types.ObjectId();
    const candidateLink = jwt.sign(
      { role: 'c', interviewId: _id + '' },
      process.env.JWTSECRET
    );
    const interviewerLink = jwt.sign(
      { role: 'i', interviewId: _id + '' },
      process.env.JWTSECRET
    );

    const newInterview = await Interview.create({
      _id,
      owner: req.user._id,
      title: title.trim(),
      candidateName: candidateName.trim(),
      interviewerName: interviewerName.trim(),
      candidateLink,
      interviewerLink,
    });

    console.log(_id);
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        upcomingInterviews: newInterview._id,
      },
    });

    return res.json({
      type: 'success',
      msg: 'Created interview',
      interview: newInterview,
    });
  } catch (error) {
    res
      .status(500)
      .json({ err: error.message, type: 'failure', msg: error.message });
  }
});

router.post('/mark', async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) throw Error('You must be logged in');

    const { interviewId, isEnded } = req.body;
    if (!mongoose.Types.ObjectId.isValid(interviewId))
      throw Error('Invalid id');

    await Interview.findByIdAndUpdate(interviewId, {
      isEnded: isEnded || false,
      endTime: Date.now(),
    });

    return res.json({
      type: 'success',
      msg: 'updated  interview ',
      isEnded,
      endTime: Date.now(),
    });
  } catch (error) {
    res
      .status(500)
      .json({ err: error.message, type: 'failure', msg: error.message });
  }
});

router.post('/update-note', async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) throw Error('You must be logged in');

    console.log(req.body);
    const { interviewId, note } = req.body;
    if (!mongoose.Types.ObjectId.isValid(interviewId))
      throw Error('Invalid id');

    await Interview.findByIdAndUpdate(interviewId, {
      note: note,
    });

    return res.json({
      type: 'success',
      msg: 'updated  note ',
      note: note || 'EMPTY',
    });
  } catch (error) {
    res
      .status(500)
      .json({ err: error.message, type: 'failure', msg: error.message });
  }
});

module.exports = router;
