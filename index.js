/**
 * Created by dman on 27/09/2017.
 */
modules.exports = {
  aspects: {
    LoggerAspect: require('./lib/aspects/LoggerAspects')
  },
  dto: {
    LogObject: require('./lib/dto/logobject/index')
  },
  events: require('./lib/events/index')
}
