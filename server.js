require('dotenv').config();
const express = require('express');
const app = express();
const fetch = require('node-fetch');
const morgan = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const initializePassport = require('./config/passport');
const User = require('./models/User');
const bcrypt = require('bcrypt');
const AuthRouter = require('./routes/auth');
const InterviewRouter = require('./routes/interviews');
const ProfileRouter = require('./routes/profile');
const jwt = require('jsonwebtoken');
const Interview = require('./models/Interview');
// Config: cookie, passport, cors etc
const cors = require('cors');

app.use((req, res, next) => setTimeout(next, 1000));

app.use(
  // require('cors')({ credentials: true, origin: 'http://localhost:3000' })
  require('cors')({ credentials: true, origin: '*' })
  // cors()
);
app.use(
  cookieSession({
    name: 'iv-connect',
    maxAge: 24 * 60 * 60 * 1000,
    keys: [process.env.SESSION_SECRET],
  })
);

initializePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

app.use(cookieParser());

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

// Use Morgan Logger (development only)
if (process.env._NODE_ENV !== 'production') {
  app.use(morgan('dev'));
  app.use((req, res, next) => {
    console.log(req.body);
    next();
  });
}

app.use(express.static('public'));

var mongoConnectionURI = process.env.MONGO_URI;

// Connect Mongo
mongoose.connect(
  mongoConnectionURI,
  {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  },
  (err) => {
    if (!err) return console.log('MONGO CONNECTED');
  }
);

mongoose.connection.on('error', (err) => {
  // CRITICAL MONGO ERROR
  console.log('MONGO connection error: ', err);
});

app.use('/auth', AuthRouter);
app.use(
  '/interviews',
  (req, res, next) => {
    if (!req.isAuthenticated())
      return res.json({
        type: 'failure',
        msg: 'Not logged in',
        authenticated: false,
      });

    next();
  },
  InterviewRouter
);
app.use('/profile', ProfileRouter);

app.post('/auth/register', async (req, res) => {
  try {
    let { name, username, password } = req.body;
    let hashedPass = await bcrypt.hash(password, 10);
    let user = await User.create({ name, username, password: hashedPass });
    res.json({ type: 'success', user });
  } catch (err) {
    console.log(err);
    let msg = err.message;
    if (err.code === 11000) msg = 'Username is already taken or not available';
    res.status(500).json({ type: 'failure', msg });
  }
});

app.get('/users/:username', async (req, res) => {
  try {
    let { username } = req.params;
    console.log(username);
    let user = await User.findOne({ username });
    if (!user) throw Error('No user found');
    res.json({ type: 'failure', user });
  } catch (err) {
    let msg = err.message;
    if (err.code === 11000) msg = 'Username is already taken or not available';
    res.status(500).json({ type: 'failure', msg });
  }
});

app.post('/execute-code', async (req, res) => {
  try {
    let { token, codeInfo } = req.body;
    if (!token || !jwt.verify(token, process.env.JWTSECRET))
      throw Error('Invalid token! Not authorized.');
    let payload = {
      ...codeInfo,
      clientId: process.env.JDOODLE_CLIENTID,
      clientSecret: process.env.JDOODLE_CLIENTSECRET,
    };
    let response = await fetch('https://api.jdoodle.com/v1/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    response = await response.json();
    res.json({ ...response, stdin: codeInfo.stdin });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get('/removeconnections/:token', async (req, res) => {
  const x = jwt.verify(req.params.token, process.env.JWTSECRET).interviewId;
  await Interview.findByIdAndUpdate(x, {
    candidateConnection: '',
    interviewerConnection: '',
  });
  res.send('OK');
});

//
//
//

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('🚀 Server up and running on port ' + PORT);
});

// PEER
// var peerApp = express();
// var ExpressPeerServer = require('peer').ExpressPeerServer;
// var peerServer = require('http').createServer(peerApp);
// var options = {
//   debug: true,
// };
// peerApp.use(
//   '/peerjs',
//   (req, res, next) => {
//     console.log('HEY');
//     next();
//   },
//   ExpressPeerServer(peerServer, options)
// );
// peerServer.listen(3002);

// 404 Not found
app.use((req, res) => {
  res.status(404).json({ type: 'failure', msg: '404 Not Found' });
});

app.use((error, req, res, next) =>
  res.json({
    type: 'failure',
    msg: error.message,
    err: 'LAST_HOPE_ERR_Handler',
  })
);

// socket io
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  },
});
io.on('connection', (client) => {
  console.log(client.id);
  client.on('code', (data) => {
    console.log('sended code', data);
    client.broadcast.emit('code', data);
  });
  client.on('drawing', (data) => {
    client.broadcast.emit('drawing', data); // console.log('sended code', data);
  });
  client.on('clear-canvas', (data) => {
    console.log(data);
    client.broadcast.emit('clear-canvas', data); // console.log('sended code', data);
  });
  client.on('chat', (data) => {
    console.log(data);
    client.broadcast.emit('chat', data); // console.log('sended code', data);
  });
  client.on('joined-interview', async (data) => {
    console.log('Joined interview', data);
    try {
      let { role, interviewId } = jwt.verify(data.token, process.env.JWTSECRET);
      let roleConnection =
        role == 'c' ? 'candidateConnection' : 'interviewerConnection';
      let interview = await Interview.findById(interviewId);
      console.log('joining in role', role, interview);
      if (!interview) return;
      if (interview[roleConnection]) return;
      interview[roleConnection] = client.id;
      await interview.save();
      client['interviewInfo'] = { id: interview.id, role }; //To be used while disconnecting
      client.broadcast.emit('joined-interview', { role, peerId: data.peerId }); // console.log('sended code', data);
      console.log('Joined interview');
    } catch (error) {
      console.log(error);
    }
  });
  client.on('disconnect', async (data) => {
    console.log('DISCONNECTED', client.id, client.interviewInfo);
    let interview = await Interview.findById(client.interviewInfo?.id);
    if (!client.interviewInfo?.role) return;
    let roleConnection =
      client.interviewInfo.role == 'c'
        ? 'candidateConnection'
        : 'interviewerConnection';

    console.log('ROLE', client.interviewInfo.role);
    if (!interview) return;
    if (!interview[roleConnection]) return;
    console.log('DELETING USER');
    interview[roleConnection] = '';
    await interview.save();
    console.log(data);
    client.broadcast.emit('left-interview', {
      role: client.interviewInfo.role,
    }); // console.log('sended code', data);
  });

  client.on('ping', function () {
    client.emit('pong');
  });
});

setInterval(()=> console.log(new Date()), 5000)
process.on('uncaughtException', err => console.log('ERR',err));
process.on('unhandledRejection', err => console.log('ERR', err));
process.on("SIGTERM", (err) => console.log("EVENT ", err));
process.on("SIGINT", (err) => console.log("EVENT ", err));