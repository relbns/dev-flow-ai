// server/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const axios = require('axios');

// Passport config
require('./config/passport')(passport);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_random_secret_string',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB - Optional for testing
try {
  mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
} catch (err) {
  console.error('MongoDB connection error, using memory storage:', err);
}

// Auth Routes
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email', 'read:org', 'repo'] }));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: `${process.env.CLIENT_URL}/login-failed` }),
  function (req, res) {
    console.log('Authentication successful');
    res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  });

app.get('/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user;
    return res.json({
      isAuthenticated: true,
      user: {
        id: user.id || user._id,
        displayName: user.displayName,
        username: user.username || user.login,
        avatar: user.avatar || (user.photos && user.photos[0].value)
      }
    });
  } else {
    res.json({
      isAuthenticated: false,
      user: null
    });
  }
});

app.get('/auth/logout', (req, res, next) => {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect(process.env.CLIENT_URL);
  });
});

// GitHub API routes
app.get('/api/me', (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({
      isAuthenticated: true,
      user: req.user
    });
  }
  res.json({
    isAuthenticated: false,
    user: null
  });
});

app.get('/api/org/:org/repos', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { org } = req.params;
    const accessToken = req.user.accessToken || req.user.token;

    const response = await axios.get(`https://api.github.com/orgs/${org}/repos`, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching org repos:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch organization repositories',
      details: error.response?.data || error.message
    });
  }
});

app.get('/api/org/:org/members', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { org } = req.params;
    const accessToken = req.user.accessToken || req.user.token;

    const response = await axios.get(`https://api.github.com/orgs/${org}/members`, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching org members:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch organization members',
      details: error.response?.data || error.message
    });
  }
});

app.get('/api/repos/:owner/:repo/collaborators', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { owner, repo } = req.params;
    const accessToken = req.user.accessToken || req.user.token;

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/collaborators`, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching repo collaborators:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch repository collaborators',
      details: error.response?.data || error.message
    });
  }
});

// Test route
app.get('/', (req, res) => {
  res.send('GitHub Auth Server is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});