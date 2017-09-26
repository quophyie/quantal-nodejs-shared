/**
 * Created by dman on 26/09/2017.
 */
const appModuleRoot = require('app-root-path')
const packageJson = appModuleRoot.require('/package.json')

/**
 * A General Log object
 * @type {Object}
 */
module.exports = Object.freeze({
  proglang: 'javascript',
  framework: 'nodejs',
  frameworkVersion: process.version,
  moduleVersion: packageJson.version
})
