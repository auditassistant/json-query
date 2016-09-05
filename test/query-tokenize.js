require('es5-shim')

var test = require('tape')
var queryTokenizer = require('../lib/tokenize')
var deepEqual = require('deep-equal')
var util = require('util')

test('query parsing', function(t){

  function check(query, expected){
    var tokenized = queryTokenizer(query, true)
    t.deepEqual(tokenized, expected)
    if (!deepEqual(tokenized, expected)) {
      console.log('expected:', util.inspect(expected, {depth: null}))
      console.log('actual:', util.inspect(tokenized, {depth: null}))
    }
  }

  check("items[id=1].name",[
    {root: true},
    {get: 'items'},
    {select: ['id', '1'], op: '=', negate: false},
    {get: 'name'}
  ])

  check("items[*country=NZ].name",[
    {root: true},
    {get: 'items'},
    {select: ['country', 'NZ'], op: '=', negate: false, multiple: true},
    {get: 'name'}
  ])

  check("items[*][*stars>=3]",[
    {root: true},
    {get: 'items'},
    {values: true},
    {select: ['stars', '3'], op: '>=', negate: false, multiple: true}
  ])

  check("[* stars >= 3 & stars <= 10]",[
    {root: true},
    {select: [
      {select: ['stars', '3'], op: '>=', negate: false},
      {select: ['stars', '10'], op: '<=', negate: false, booleanOp: '&'}
    ], multiple: true, boolean: true}
  ])

  check("items[*][*stars:gte(3)]",[
    {root: true},
    {get: 'items'},
    {values: true},
    {select: ['stars', {_sub: [
      {filter: 'gte', args: ['3']}
    ]}], op: ':', negate: false, multiple: true}
  ])

  check("items[*][*:isCool]",[
    {root: true},
    {get: 'items'},
    {values: true},
    {select: ['', {_sub: [
      {filter: 'isCool'}
    ]}], op: ':', negate: false, multiple: true}
  ])

  check("items[*name!~/^t/i].name",[
    {root: true},
    {get: 'items'},
    {select: ['name', /^t/i], multiple: true, negate: true, op: '~'},
    {get: 'name'}
  ])

  check("items[*name!~test].name",[
    {root: true},
    {get: 'items'},
    {select: ['name', 'test'], multiple: true, negate: true, op: '~'},
    {get: 'name'}
  ])

  check("items[*name!~{param}].name",[
    {root: true},
    {get: 'items'},
    {select: ['name', {
      _sub: [ { root: true }, { get: 'param' } ]
    }], multiple: true, negate: true, op: '~'},
    {get: 'name'}
  ])

  // test for whitespace handling
  check(" items[id=1]\n  .name ",[
    {root: true},
    {get: 'items'},
    {select: ['id', '1'], op: '=', negate: false},
    {get: 'name'}
  ])

  // test for whitespace handling
  check(" items[id=1]\n  .name:not ",[
    {root: true},
    {get: 'items'},
    {select: ['id', '1'], op: '=', negate: false},
    {get: 'name'},
    {filter:'not'}
  ])

  check("items[][id=1].name",[
    {root: true},
    {get: 'items'},
    {deep: [
      {select: ['id', '1'], op: '=', negate: false},
      {get: 'name'}
    ]}
  ])

  check("lookup[**]",[
    {root: true},
    {get: 'lookup'},
    {values: true, deep: true}
  ])

  check("item.title|item.name",[
    {root: true},
    {get: 'item'},
    {get: 'title'},
    {or: true},
    {root: true},
    {get: 'item'},
    {get: 'name'}
  ])

  check(".title|.value.name",[
    {get: 'title'},
    {or: true},
    {get: 'value'},
    {get: 'name'}
  ])

  check("items[id=?].name",[
    {root: true},
    {get: 'items'},
    {select: ['id', {_param: 0}], op: '=', negate: false},
    {get: 'name'}
  ])

  check("items[parent_id={workitem.id}].name",[
    {root: true},
    {get: 'items'},
    {select: ['parent_id', {_sub: [
      {root: true},
      {get: 'workitem'},
      {get: 'id'}
    ]}], op: '=', negate: false},
    {get: 'name'}
  ])

  check(".name:titleize", [
    {get: 'name'},
    {filter: 'titleize'}
  ])

  check(".name:titleize(test,1)", [
    {get: 'name'},
    {filter: 'titleize', args: ['test', '1']}
  ])

  check(".name:titleize(test,{.name})", [
    {get: 'name'},
    {filter: 'titleize', args: ['test', {_sub:[
      {get: 'name'}
    ]}]}
  ])

  check(".name:titleize(test,{.name:filter(3)})", [
    {get: 'name'},
    {filter: 'titleize', args: ['test', {_sub:[
      {get: 'name'},
      {filter: 'filter', args: ['3']}
    ]}]}
  ])

  check(".name:split(,)", [
    {get: 'name'},
    {filter: 'split', args: [',']}
  ])

  check("items[id={.id}].name",[
    {root: true},
    {get: 'items'},
    {select: ['id', {_sub: [
      {get: 'id'}
    ]}], op: '=', negate: false},
    {get: 'name'}
  ])

  check("items[parent_id={workitems[{.id}=?]}].contacts[?={.items[?]}].name",[
    {root: true},
    {get: 'items'},
    {select: ['parent_id', {_sub: [
      {root: true},
      {get: 'workitems'},
      {select: [{_sub: [{get: 'id'}]}, {_param: 0}], op: '=', negate: false}
    ]}], op: '=', negate: false },
    {get: 'contacts'},
    {select: [{_param: 1}, {_sub: [
      {get: 'items'},
      {get: {_param: 2}}
    ]}], op: '=', negate: false},
    {get: 'name'}
  ])

  check(":filter/subfilter",[
    {filter: 'filter/subfilter'}
  ])

  t.end()

})
