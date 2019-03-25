/**
 * Created by dman on 06/10/2017.
 */
'use strict'
const Constants = require('../constants')

module.exports = (logger) => {
  return (req, res, next) => {
    if (logger && logger.getMdc) {
      const mdc = logger.getMdc()

      console.log(`REQUEST_BODY IN MDC_POPULATOR:${JSON.stringify(req.body)}`)
      console.log(`MDC IN MDC_POPULATOR:${JSON.stringify(mdc)}`)
      if (mdc) {
        console.log('MDC IS NOT NULL IN MDC_POPULATOR')
        mdc.run((context) => {
          const userId = req.body['id'] || req.body['email'] || req.body['emailOrId'] || req.params['id'] || req.params['email'] || req.params['emailOrId']
          mdc.set(Constants.USER_ID_KEY, userId)
          next()
        })
      }
      console.log('COULD NOT FIND MDC IN MDC_POPULATOR')
      next()
      console.log('COULD NOT FIND MDC IN MDC_POPULATOR.. NEXT CALLED')
    } else {
      next()
    }
  }
}
