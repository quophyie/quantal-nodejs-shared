/**
 * Created by dman on 06/10/2017.
 */
'use strict'

module.exports = (logger) => {
  return (req, res, next) => {
    if (logger && logger.getMdc) {
      const mdc = logger.getMdc()
      mdc.run(() => {
        const userId = req.body['id'] || req.body['email'] || req.body['emailOrId'] || req.params['id'] || req.params['email'] || req.params['emailOrId']
        mdc.set('userId', userId)
      })
    }
    next()
  }
}
