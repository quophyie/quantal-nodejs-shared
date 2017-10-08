/**
 * Created by dman on 08/10/2017.
 */
'use strict'
module.exports = Object.freeze({
  serializers: {
    err: (err) => Object.assign({}, err, {stack: err.stack}, {name: err.name})
  }
})
