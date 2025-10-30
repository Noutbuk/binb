'use strict';

const { resetPasswd } = require('../../routes/site');
const dataService = require('../data-service');

/**
 * Middleware to check if user is logged in and has admin privileges
 */
function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  dataService.users.getUserRole(req.session.user, function (err, role) {
    if (err) {
      console.error('Error checking user role:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const userRole = parseInt(role) || 0;
    if (userRole < 2) { // 2 = admin role
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    req.userRole = userRole;
    next();
  });
}

/**
 * Middleware to check if user is logged in and has moderator or admin privileges
 */
function requireModerator(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  dataService.users.getUserRole(req.session.user, function (err, role) {
    if (err) {
      console.error('Error checking user role:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const userRole = parseInt(role) || 0;
    if (userRole < 1) { // 1 = moderator, 2 = admin
      return res.status(403).json({ error: 'Moderator privileges required' });
    }

    req.userRole = userRole;
    next();
  });
}

/**
 * Check if user has admin role (for template rendering)
 */
function checkAdminRole(username, callback) {
  if (!username) {
    return callback(null, false);
  }

  dataService.users.getUserRole(username, function (err, role) {
    if (err) {
      return callback(err, false);
    }

    const userRole = parseInt(role) || 0;
    callback(null, userRole >= 2);
  });
}

/**
 * Middleware to add admin status to response locals
 */
function addAdminStatus(req, res, next) {
  if (req.session.user) {
    checkAdminRole(req.session.user, function (err, isAdmin) {
      if (err) {
        console.error('Error checking admin status:', err);
      }
      res.locals.isAdmin = isAdmin || false;
      next();
    });
  } else {
    res.locals.isAdmin = false;
    next();
  }
}

module.exports = {
  requireAdmin,
  requireModerator,
  checkAdminRole,
  addAdminStatus
};
