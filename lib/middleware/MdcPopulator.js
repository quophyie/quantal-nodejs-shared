/**
 * Created by dman on 06/10/2017.
 */
'use strict'
const Constants = require('../constants')

module.exports = (logger) => {
  return (req, res, next) => {
    if (logger && logger.getMdc) {
      const mdc = logger.getMdc()
      let traceId = req.headers[Constants.TRACE_ID_HEADER_KEY] || req.headers[Constants.TRACE_ID_HEADER_KEY.toLowerCase()]
      let event = req.headers[Constants.EVENT_HEADER_KEY] || req.headers[Constants.EVENT_HEADER_KEY.toLowerCase()]
      // NOTE ... This will throw an error if the LoggerAspects is enabled but the traceId and event
      // have not been provided
      logger.info({traceId, event}, `MDC_POPULATOR: extracting email or id as userId from request. RequestBody: ${JSON.stringify(req.body)}, Request Params ${req.params}`)
      if (mdc) {
        mdc.run((context) => {
          const userId = req.body['id'] || req.body['email'] || req.body['emailOrId'] || req.params['id'] || req.params['email'] || req.params['emailOrId']
          mdc.set(Constants.USER_ID_KEY, userId)
          logger.info(`MDC_POPULATOR: userId extracted from request. userId: ${userId}`)
          next()
        })
      } else {
        next()
        logger.info('MDC_POPULATOR: MDC inactive. calling next to progress request')
      }
    } else {
      next()
    }
  }
}
