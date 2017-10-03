/**
 * Created by dman on 25/09/2017.
 */
/* const LogObject = require('../dto/logobject')
const CommonErrors = require('quantal-errors')
const Events = require('../events')
*/

const debug = require('debug')('LoggerAspects')
const LogObject = require('../../../lib/dto/logobject')
const CommonErrors = require('quantal-errors')
const Events = require('../../../lib/events')
let _mustSupplyEvent = false
let _logger = null

// import {beforeMethod} from 'aspect.js'
const beforeMethod = require('aspect.js').beforeMethod
class LoggerAspects {
  /**
   *
   * @param {Logger} logger - An instance of the Quant Beat Logger
   * @param {boolean} mustSupplyEvent - A boolean indicating whether each logging statement must include the logging event (e.g. APP_START event)
   */
  constructor (logger, mustSupplyEvent = true) {
    if (!logger) throw new CommonErrors.IllegalArgumentError(`parameter 'logger' is required and be be an instance Quant Beat Logger`)
    _logger = logger
    _mustSupplyEvent = mustSupplyEvent
    this.mustSupplyEvent = mustSupplyEvent
  }

  @beforeMethod({
    classNamePattern: /Logger/,
    methodNamePattern: /(trace|debug|info|warn|error)/
  })
  /**
   * Creates and applies log Object. If mustSupplyEvent = true and you want to log a simple string, the 1st parameter that must be
   * passed to the logging function must bethe log event e.g logger.info('APP_START', 'logging some stuff')
   * @param meta
   */
  createAndApplyLogObject (meta) {
    let logObject = Object.assign({}, LogObject)
    if (meta.method) {
      if (typeof meta.method.args[0] === 'string') {
        if (_mustSupplyEvent && typeof meta.method.args.length < 2) {
          const err = new CommonErrors.IllegalArgumentError(`an 'event' must be supplied as the 1st argument to the log function ${meta.method.name}`)
          debug(err)
          _logger.throwing(err)
        }
        const lo = Object.assign({}, { event: meta.method.args[0] }, logObject)
        // remove the event from the method args
        const newArgsArr = [].concat(meta.method.args.slice(1))
        meta.method.args = [lo, ...newArgsArr]
      } else {
        if (_mustSupplyEvent && !meta.method.args[0].event) {
          const err = new CommonErrors.IllegalArgumentError(`an 'event' property must be supplied on the object which is supplied as the 1st param of the log function ${meta.method.name}`)
          debug(err)
          _logger.throwing(err)
        }
        meta.method.args[0] = Object.assign({}, logObject, meta.method.args[0])
      }
    }
  }
}

module.exports = LoggerAspects
