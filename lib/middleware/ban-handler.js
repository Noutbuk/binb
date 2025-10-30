'use strict';

const dataService = require('../data-service');
const forwarded = require('forwarded-for');
const utils = require('../utils');

/**
 * Expose a middleware to filter banned IPs.
 */

module.exports = function (req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache');

  const address = forwarded(req, req.headers);

  dataService.users.getBanTTL(address.ip, function (err, ttl) {
    if (err) {
      return next(err);
    }

    // TTL values: -2 = key doesn't exist, -1 = key exists but no expiration, >0 = key exists with TTL
    if (ttl === -2) {
      // Key doesn't exist, user is not banned
      return next();
    }

    // For permanent bans (ttl = -1) or active bans (ttl > 0), show ban message
    let displayTTL;
    if (ttl === -1) {
      displayTTL = 'permanent';
    } else {
      displayTTL = Math.round(ttl / 60);
      displayTTL = (displayTTL || 'less than a') + ' minute' + (displayTTL < 2 ? '' : 's');
    }

    res.render('banned', {
      slogan: utils.randomSlogan(),
      ttl: displayTTL
    });
  });
};
