'use strict';

/**
 * Captcha constructor.
 */

function Captcha() {
  this.code = process.env.REGISTRATION_CODE || '';
}

/**
 * Return the registration code from environment variable.
 */

Captcha.prototype.getCode = function () {
  return this.code;
};

/**
 * Expose the constructor.
 */

module.exports = Captcha;
