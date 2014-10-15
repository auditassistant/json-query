var test = require('tape')
require('es5-shim') 
var jsonQuery = require('../')
var forceParent = require('../force-parent.js')


test('test force parent', function(t){
  var data = {}

  var res = jsonQuery('value.something', {data: data})
  var parentTarget = forceParent(res, {})
  parentTarget[res.key] = true

  t.deepEqual(data, {
    value: { something: true }
  })

  var res = jsonQuery('value.another', {data: data})
  var parentTarget = forceParent(res, {})
  parentTarget[res.key] = 'something'

  t.deepEqual(data, {
    value: { something: true, another: 'something' }
  })

  t.end()

})