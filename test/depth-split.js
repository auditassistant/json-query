require('es5-shim')

var test = require('tape')
var depthSplit = require('../lib/depth-split')

test(function (t) {
  t.deepEqual(
    depthSplit('hello(cats|dogs)|cars|cows(meow|boop{doop})', /\|/),
    [ 'hello(cats|dogs)', 'cars', 'cows(meow|boop{doop})' ]
  )
  t.deepEqual(
    depthSplit('hello(cats|dogs)|cars|cows(meow|boop{doop})', /\|/, {includeDelimiters: true}),
    [ 'hello(cats|dogs)', '|', 'cars', '|', 'cows(meow|boop{doop})' ]
  )
  t.deepEqual(depthSplit('hello(cats|dogs)|cars|cows(meow|boop{doop})|thoop', /\|/, {
    max: 2
  }), [ 'hello(cats|dogs)', 'cars|cows(meow|boop{doop})|thoop' ])
  t.end()
})
