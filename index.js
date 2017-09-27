/**
 * Created by dman on 27/09/2017.
 */
module.exports = {
  aspects: {
    LoggerAspect: require('./dist/lib/aspects/LoggerAspects')
  },
  dto: {
    LogObject: require('./lib/dto/logobject/index')
  },
  events: require('./lib/events/index')
}
