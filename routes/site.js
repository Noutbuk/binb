'use strict';

const Captcha = require('../lib/captcha');
const dataService = require('../lib/data-service');
const http = require('http');
const parallel = require('async/parallel');
const randInt = require('../lib/prng').randInt;
const randomSlogan = require('../lib/utils').randomSlogan;
const rooms = require('../lib/rooms').rooms;
const roomManager = require('../lib/services/room-manager');

/**
 * Generate a sub-task.
 */

const subTask = function (genre) {
  return function (callback) {
    const index = randInt(rooms[genre].trackscount);
    dataService.songs.getRoomTrackByIndex(genre, index, function (err, res) {
      if (err) {
        return callback(err);
      }
      dataService.songs.getSongMetadata(res[0], ['artworkUrl100'], function (err, data) {
        if (err) {
          return callback(err);
        }
        callback(null, data[0]); // getSongMetadata returns array for specific fields
      });
    });
  };
};

/**
 * Extract at random in each room, some album covers and return the result as a JSON.
 */

exports.artworks = async function (req, res, next) {
  try {
    const allRooms = await roomManager.getAllRooms();
    const activeRooms = allRooms.filter(room => room.active);
    const roomNames = activeRooms.map(room => room.name);
    
    const tasks = {};
    roomNames.forEach(function (room) {
      tasks[room] = function (callback) {
        const subtasks = [];
        for (let i = 0; i < 6; i++) {
          subtasks.push(subTask(room));
        }
        parallel(subtasks, callback);
      };
    });
    parallel(tasks, function (err, results) {
      if (err) {
        return next(err);
      }
      res.send(results);
    });
  } catch (error) {
    console.error('Error loading rooms for artworks:', error);
    next(error);
  }
};

exports.changePasswd = function (req, res) {
  if (!req.session.user) {
    return res.redirect('/login?followup=/changepasswd');
  }
  res.render('changepasswd', {
    followup: req.query.followup || '/',
    loggedin: req.session.user,
    slogan: randomSlogan()
  });
};

exports.home = async function (req, res) {
  try {
    // Get actual rooms from Redis instead of static config
    const allRooms = await roomManager.getAllRooms();
    const activeRooms = allRooms.filter(room => room.active);
    const roomNames = activeRooms.map(room => room.name);
    
    res.render('home', {
      loggedin: req.session.user,
      rooms: roomNames,
      slogan: randomSlogan()
    });
  } catch (error) {
    console.error('Error loading rooms:', error);
    // Fallback to empty rooms array if there's an error
    res.render('home', {
      loggedin: req.session.user,
      rooms: [],
      slogan: randomSlogan()
    });
  }
};

exports.login = function (req, res) {
  res.render('login', {
    followup: req.query.followup || '/',
    slogan: randomSlogan()
  });
};

exports.recoverPasswd = function (req, res) {
  const captcha = new Captcha();
  req.session.captchacode = captcha.getCode();
  res.render('recoverpasswd', {
    followup: req.query.followup || '/',
    slogan: randomSlogan()
  });
};

exports.resetPasswd = function (req, res) {
  res.render('resetpasswd', {
    slogan: randomSlogan(),
    token: req.query.token || ''
  });
};

exports.room = async function (req, res) {
  try {
    // Check if room actually exists in Redis
    const roomExists = await roomManager.roomExists(req.params.room);
    if (roomExists) {
      // Get all rooms for navigation
      const allRooms = await roomManager.getAllRooms();
      const activeRooms = allRooms.filter(room => room.active);
      const roomNames = activeRooms.map(room => room.name);
      
      return res.render('room', {
        loggedin: req.session.user,
        roomname: req.params.room,
        rooms: roomNames,
        slogan: randomSlogan()
      });
    }
  } catch (error) {
    console.error('Error checking room existence:', error);
  }
  res.status(404).send(http.STATUS_CODES[404]);
};

exports.signup = function (req, res) {
  const captcha = new Captcha();
  req.session.captchacode = captcha.getCode();
  res.render('signup', {
    followup: req.query.followup || '/',
    slogan: randomSlogan()
  });
};

/**
 * Report errors during form submission.
 */

exports.validationErrors = function (req, res, next) {
  res.locals.errors = req.session.errors;
  res.locals.oldvalues = req.session.oldvalues;
  delete req.session.errors;
  delete req.session.oldvalues;
  next();
};
