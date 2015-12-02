/**
 * Module dependencies.
 */
var util = require('util')
  , OAuth2Strategy = require('passport-oauth2')
  , InternalOAuthError = require('passport-oauth2').InternalOAuthError
  , APIError = require('./errors/apierror');

var Strategy = function(options, verify) {
  options = options || {};
  options.authorizationURL = options.authorizationURL || 'https://webobservatory.soton.ac.uk/oauth/authorise/';
  options.tokenURL = options.tokenURL || 'https://webobservatory.soton.ac.uk/oauth/token/';

  OAuth2Strategy.call(this, options, verify);
  this.name = 'passport-wo';
}

/**
 * Inherit from `OAuth2Strategy`.
 */
util.inherits(Strategy, OAuth2Strategy);



/**
 * Return extra parameters to be included in the authorization request.
 *
 * Adds type=web_server to params
 *
 * @return {Object} params
 */
Strategy.prototype.authorizationParams = function() {
  return { type: 'web_server' };
};

/**
 * Return extra parameters to be included in the token request.
 *
 * Adds type=web_server to params
 *
 * @return {Object} params
 */
Strategy.prototype.tokenParams = function() {
  return { type: 'web_server' };
};

/**
 * Parse error response from OAuth 2.0 token endpoint.
 *
 * @param {String} body
 * @param {Number} status
 * @return {Error}
 * @api protected
 */
Strategy.prototype.parseErrorResponse = function(body, status) {
  var json = JSON.parse(body);
  if (json.error && typeof json.error == 'string' && !json.error_description) {
    return new APIError(json.error);
  }
  return OAuth2Strategy.prototype.parseErrorResponse.call(this, body, status);
};


/**
 * Expose `Strategy`.
 */
module.exports = Strategy;
