'use strict'
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
const createError = require('create-error')
const EventNotFoundError = createError('EventNotFoundError')
let _mustSupplyEvent = false
let _shouldPrintErrorInConsole = false
const Events = require('../events')
const Constants = require('../constants')
let _logger = null
let _events = {}

// import {beforeMethod} from 'aspect.js'
const beforeMethod = require('aspect.js').beforeMethod
const printErrorsInConsole = (err) => {
  if (_shouldPrintErrorInConsole) { console.log(err) }
}

const populateLogObjectWithMdcData = (logObject) => {
  _logger.getMdc().run((mdc) => {
    const userId = _logger.getMdc().get(Constants.USER_ID_KEY)

    if (userId) {
      logObject.userId = userId
    }
  })
}

const verifyEvent = (event) => {
  let logObject = Object.assign({}, LogObject)

  if (!event) {
    const err = new CommonErrors.NullReferenceError('event cannot be null or undefined')
    logObject.event = err.name.toUpperCase()
    debug(err)
    printErrorsInConsole(err)
    Object.assign(err, logObject)
    _logger.throwing(err)
  }

  const foundEvent = Object.values(_events).find((ev) => event.trim().toUpperCase() === ev.trim().toUpperCase())

  if (!foundEvent) {
    const err = new EventNotFoundError(`the event '${event}' was not found in the events object. 
    Please add the event '${event}' to the events object that is passed to LoggerAspect constructor`)
    debug(err)
    printErrorsInConsole(err)
    logObject.event = err.name.toUpperCase()
    Object.assign(err, logObject)
    _logger.throwing(err)
  }
}

class LoggerAspects {
  /**
   *
   * @param {Logger} logger - An instance of the Quant Beat Logger
   * @param {object} events - a map that specifies the events that can be specified on a log object
   * @param {boolean} mustSupplyEvent - A boolean indicating whether each logging statement must include the logging event (e.g. APP_START event)
   * @param {boolean} shouldPrintErrorInConsole - a boolean indicating whether errors should be printed to the console
   */
  constructor (logger, events, mustSupplyEvent = true, shouldPrintErrorInConsole = false) {
    if (!logger) throw new CommonErrors.IllegalArgumentError(`parameter 'logger' is required and be be an instance Quant Beat Logger`)
    if (!events) throw new CommonErrors.IllegalArgumentError(`parameter 'events' is required and must be an object that specifies all supported events as properties of the event object`)
    _logger = logger
    _mustSupplyEvent = mustSupplyEvent
    _shouldPrintErrorInConsole = shouldPrintErrorInConsole
    _events = events
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
      if (typeof meta.method.args[0] !== 'object' || meta.method.args[0] instanceof Array) {
        if (_mustSupplyEvent) {
          // For errors if the event has not been provided we set the event name as UNEXPECTED_ERROR
          if ((meta.method.name === 'error' || meta.method.name === 'throwing') && meta.method.args.length === 1) {
            logObject.event = Events.UNEXPECTED_ERROR
          } else if (meta.method.args.length < 2) {
            const err = new CommonErrors.IllegalArgumentError(`an 'event' must be supplied as the 1st argument to the log function ${meta.method.name}`)
            debug(err)
            printErrorsInConsole(err)
            logObject.event = err.name.toUpperCase()
            Object.assign(err, logObject)
            _logger.throwing(err)
          }
        }

        const event = meta.method.args[0]
        verifyEvent(event)
        const lo = Object.assign({}, { event }, logObject)
        // remove the event from the method args
        const newArgsArr = [].concat(meta.method.args.slice(1))
        meta.method.args = [lo, ...newArgsArr]
      } else {
        if (_mustSupplyEvent) {
          // For errors if the event has not been provided we set the event name as the name of the error
          if ((meta.method.name === 'error' || meta.method.name === 'throwing') && meta.method.args[0] instanceof Error) {
            logObject.event = meta.method.args[0].name.toUpperCase()
          } else if (!meta.method.args[0].event) {
            const err = new CommonErrors.IllegalArgumentError(`an 'event' property must be supplied on the object which is supplied as the 1st param of the log function ${meta.method.name}`)
            debug(err)
            printErrorsInConsole(err)
            logObject.event = err.name.toUpperCase()
            Object.assign(err, logObject)
            _logger.throwing(err)
          }
        }

        const event = meta.method.args[0]
        verifyEvent(event)
        populateLogObjectWithMdcData(logObject)
        meta.method.args[0] = Object.assign({}, logObject, {event})
      }
    }
  }
}

module.exports = LoggerAspects
