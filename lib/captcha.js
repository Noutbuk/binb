'use strict';

const characters =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Captcha constructor.
 */

function Captcha() {
  this.code = '';
}

/**
 * Generate the captcha.
 */

Captcha.prototype.initialize = function () {
};

/**
 * Return the captcha code.
 */

Captcha.prototype.getCode = function () {
  return "";
};

/**
 * Return the captcha image.
 */

Captcha.prototype.toDataURL = function () {
  return "";
};

/**
 * Expose the constructor.
 */

module.exports = Captcha;
