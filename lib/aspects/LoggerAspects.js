/**
 * Created by dman on 25/09/2017.
 */
const LogObject = require('../dto/logobject')
const CommonErrors = require('quantal-errors')
const Events = require('../events')

//import {beforeMethod} from 'aspect.js'
const beforeMethod = require('aspect.js').beforeMethod
class LoggerAspects {

  constructor (mustSupplyEvent = true) {
    this._mustSupplyEvent = mustSupplyEvent
  }

  @beforeMethod({
    classNamePattern: /Logger/,
    methodNamePattern: /(trace|debug|info|warn|error)/
  })
  createAndApplyLogObject (meta) {
    let logObject = Object.assign({}, LogObject)
    if (meta.method) {
      if (typeof (meta.method.args[0]) !== 'object') {

        if (this._mustSupplyEvent && typeof meta.method.args.length < 2) {
          throw new CommonErrors.IllegalArgumentError('an event must be supplied as the 1st argument to the log function')
        }
        const lo =  Object.assign({}, {event: meta.method.args[0]}, logObject)
        const newArgsArr = meta.method.args.shift()
        meta.method.args = [lo, ...newArgsArr]

      } else {
        if (this._mustSupplyEvent && !meta.method.args[0].event )
          throw new CommonErrors.IllegalArgumentError('an event property must be supplied on the object which is supplied as the 1st param of the log function')
        meta.method.args[0] = Object.assign({}, logObject, meta.method.args[0])
      }
    }
  }
}

module.exports = LoggerAspects
