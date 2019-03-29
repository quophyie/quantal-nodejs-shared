/**
 * Created by dman on 06/10/2017.
 */
'use strict'
const Constants = require('../constants')
const Events = require('../events')

module.exports = (logger) => {
  return (req, res, next) => {
    if (logger && logger.getMdc) {
      const mdc = logger.getMdc()
      let traceId = req.headers[Constants.TRACE_ID_HEADER_KEY] || req.headers[Constants.TRACE_ID_HEADER_KEY.toLowerCase()]
      let event = req.headers[Constants.EVENT_HEADER_KEY] || req.headers[Constants.EVENT_HEADER_KEY.toLowerCase()]

      // NOTE ... We will temporarily disable the mdc just in case the LoggerAspect has been enabled
      // When the LoggerAspect is enabled, the LoggerAspect expects the traceId and event to be present
      // in the mdc but there is a chance that the mdc at this point may be uninitialized / null
      let mdcWasOriginallyEnabled = logger.isMdcEnabled()
      if (mdcWasOriginallyEnabled) {
        logger.disableMdc()
      }

      logger.info({traceId, event}, `MDC_POPULATOR: extracting email or id as userId from request. RequestBody: ${JSON.stringify(req.body)}, Request Params ${JSON.stringify(req.params)}`)

      if (mdcWasOriginallyEnabled) {
        logger.enableMdc()
      }

      if (mdc) {
        mdc.run((context) => {
          const userId = req.body['id'] || req.body['email'] || req.body['emailOrId'] || req.params['id'] || req.params['email'] || req.params['emailOrId']

          mdc.set(Constants.USER_ID_KEY, userId)
          mdc.set(Constants.EVENT_KEY, event)

          if (!traceId && !mdc.get(Constants.TRACE_ID_KEY)) {
            traceId = logger.generateTraceId()
            mdc.set(Constants.TRACE_ID_KEY, traceId)
          } else {
            mdc.set(Constants.TRACE_ID_KEY, traceId)
          }

          if (!event && !mdc.get(Constants.EVENT_KEY)) {
            event = Events.REQUEST_RECEIVED
            mdc.set(Constants.EVENT_KEY, Events.REQUEST_RECEIVED)
            logger.info({req, event: Events.REQUEST_RECEIVED}, 'request received')
          } else {
            mdc.set(Constants.EVENT_KEY, event)
            logger.info({req, event: event}, 'progressing %s', event)
          }

          logger.setMdc(mdc)
          logger.info({traceId, event}, `MDC_POPULATOR: userId extracted from request. userId: ${userId}`)

          next()
        })
      } else {
        // NOTE ... We will temporarily disable the mdc just in case the LoggerAspect has been enabled
        // When the LoggerAspect is enabled, the LoggerAspect expects the traceId and event to be present
        // in the mdc but there is a chance that the mdc at this point may be uninitialized / null
        if (mdcWasOriginallyEnabled) {
          logger.disableMdc()
        }
        logger.info({traceId, event}, 'MDC_POPULATOR: MDC inactive. calling next to progress request...')
        next()
        if (mdcWasOriginallyEnabled) {
          logger.enableMdc()
        }
      }
    } else {
      next()
    }
  }
}
