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
let _mustSupplyTraceId = true
let _shouldPrintErrorInConsole = false
const Events = require('../events')
const Constants = require('../constants')
let _logger = null
let _restoredLogger = null
let _events = {}
let _useVerifiableEvents = false
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

/**
 * Verifies the event. Verifiable can be stored in the events obj
 * Using verifiable events allows us to reason about which events should be handled sepcially
 * @param event
 */
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
   * @param {boolean} options.mustSupplyEvent - A boolean indicating whether each logging statement must include the logging event (e.g. APP_START event)
   * @param {boolean} options.mustSupplyTraceId - A boolean indicating whether each logging statement must include the logging traceId (e.g. abc275)
   * @param {boolean} options.shouldPrintErrorsInConsole - a boolean indicating whether errors should be printed to the console
   * @param {boolean} options.useVerifiableEvents - if true, only events that are found in the events objects are considered valid events. if false,
   * any other events not found in events object will be considered invalid and with throw an exception
   */
  constructor (logger, events, options = {mustSupplyTraceId: true, mustSupplyEvent: true, shouldPrintErrorsInConsole: false, useVerifiableEvents: false}) {
    if (!logger) throw new CommonErrors.IllegalArgumentError(`parameter 'logger' is required and be be an instance Quant Beat Logger`)
    if (!events) throw new CommonErrors.IllegalArgumentError(`parameter 'events' is required and must be an object that specifies all supported events as properties of the event object`)
    _logger = logger
    _restoredLogger = logger
    _mustSupplyEvent = options.mustSupplyEvent
    _mustSupplyTraceId = options.mustSupplyTraceId
    _shouldPrintErrorInConsole = options.shouldPrintErrorsInConsole
    _events = events
    this.mustSupplyEvent = options.mustSupplyEvent
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
    if (!_logger) { return }
    let logObject = Object.assign({}, LogObject)
    if (meta.method) {
      // HANDLE TRACEID
      if (_mustSupplyTraceId) {
        const dataObject = meta.method.args[0]
        if (!dataObject[Constants.TRACE_ID_KEY] && !_logger.getMdc().get(Constants.TRACE_ID_KEY)) {
          const err = new CommonErrors.IllegalArgumentError(`a '${Constants.TRACE_ID_KEY}' must be supplied in the data object passed as the 1st argument to the log function ${meta.method.name}  as 
           a property with name '${Constants.TRACE_ID_KEY}' on the object passed as the 1st argument to ${meta.method.name}. The traceId can also be specified via the '${Constants.TRACE_ID_HEADER_KEY}' request header if that is desired`)
          debug(err)
          printErrorsInConsole(err)
          logObject.subEvent = err.name.toUpperCase()
          Object.assign(err, logObject)
          _logger.throwing(err)
        }
      }

      // HANDLE EVENTS
      // handle events in strings , arrays and primitived
      if (_mustSupplyEvent) {
        if (typeof meta.method.args[0] !== 'object' || meta.method.args[0] instanceof Array) {
        // For errors if the event has not been provided we set the subEvent name as UNEXPECTED_ERROR
        // if ((meta.method.name === 'error' || meta.method.name === 'throwing') && meta.method.args.length === 1) {
        //   logObject.subEvent = Events.UNEXPECTED_ERROR
        // } else if (meta.method.args.length < 2) {
          if ((meta.method.name === 'error' || meta.method.name === 'throwing') && meta.method.args.length < 2) {
            logObject.subEvent = Events.UNEXPECTED_ERROR
            const err = new CommonErrors.IllegalArgumentError(`an 'event' must be supplied as the 1st argument to the log function ${meta.method.name} either as 
            a string or as property with name 'event' on an object passed as the 1st param. Events can also be specified via the 'X-Event' request header if that is desired`)
            debug(err)
            printErrorsInConsole(err)
            logObject.subEvent = err.name.toUpperCase()
            Object.assign(err, logObject)
            _logger.throwing(err)
          }

          const event = meta.method.args[0]
          if (_useVerifiableEvents) {
            verifyEvent(event)
          }
          const lo = Object.assign({}, {event}, logObject)
        // remove the event from the method args
          const newArgsArr = [].concat(meta.method.args.slice(1))
          meta.method.args = [lo, ...newArgsArr]
        } else {
        // Handle events in objects
          const dataObject = meta.method.args[0]
          /* // For errors if the event has not been provided we set the event name as the name of the error
          if ((meta.method.name === 'error' || meta.method.name === 'throwing') && meta.method.args[0] instanceof Error) {
            logObject.event = dataObject.name.toUpperCase()
          } else */
          if (!dataObject.event && !_logger.getMdc().get(Constants.EVENT_KEY)) {
            const err = new CommonErrors.IllegalArgumentError(`an 'event' must be supplied as the 1st argument to the log function ${meta.method.name} either as 
            a string or as property with name 'event' on an object passed as the 1st param. Events can also be specified via the 'X-Event' request header if that is desired`)
            debug(err)
            printErrorsInConsole(err)
            logObject.subEvent = err.name.toUpperCase()
            Object.assign(err, logObject)
            _logger.throwing(err)
          }

        // For errors if the event has not been provided we set the subEvent name as the name of the error
          if ((meta.method.name === 'error' || meta.method.name === 'throwing') && meta.method.args[0] instanceof Error) {
            logObject.subEvent = dataObject.name.toUpperCase()
          }
          logObject = Object.assign(logObject, dataObject)
          logObject.event = dataObject.event || _logger.getMdc().get(Constants.EVENT_KEY)

          if (_useVerifiableEvents) {
            verifyEvent(logObject.event)
          }

          populateLogObjectWithMdcData(logObject)
          meta.method.args[0] = Object.assign({}, logObject)
        }
      }
    }
  }

  /**
   * Sets a boolean indicating whether traceId is required for each log statement
   * @param {boolean} bRequireTraceId - a boolean indicating whether traceId is required in each log statement
   */
  setRequireTraceId (bRequireTraceId) {
    _mustSupplyTraceId = bRequireTraceId
  }

  /**
   * Sets a boolean indicating whether event is required for each log statement
   * @param {boolean} bRequireEvent - a boolean indicating whether event is required in each log statement
   */
  setRequireEvent (bRequireEvent) {
    _mustSupplyEvent = bRequireEvent
  }

  disable () {
    _logger.disableMdc()
    _logger = null
  }

  enable () {
    _logger = _restoredLogger
    _logger.enableMdc()
  }
}

module.exports = LoggerAspects
