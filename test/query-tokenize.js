require('es5-shim')

var test = require('tape')
var queryTokenizer = require('../lib/tokenize')

test('query parsing', function(t){

  function check(query, expected){
    var tokenized = queryTokenizer(query, true)
    t.deepEqual(tokenized, expected)
  }

  check("items[id=1].name",[
    {root: true},
    {get: 'items'},
    {select: ['id', '1']},
    {get: 'name'}
  ])

  // test for whitespace handling
  check(" items[id=1]\n  .name ",[
    {root: true},
    {get: 'items'},
    {select: ['id', '1']},
    {get: 'name'}
  ])

  // test for whitespace handling
  check(" items[id=1]\n  .name:not ",[
    {root: true},
    {get: 'items'},
    {select: ['id', '1']},
    {get: 'name'},
    {filter:'not'}
  ])

  check("items[][id=1].name",[
    {root: true},
    {get: 'items'},
    {deep: [
      {select: ['id', '1']},
      {get: 'name'}
    ]}
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
    {select: ['id', {_param: 0}]},
    {get: 'name'}
  ])

  check("items[parent_id={workitem.id}].name",[
    {root: true},
    {get: 'items'},
    {select: ['parent_id', {_sub: [
      {root: true},
      {get: 'workitem'}, 
      {get: 'id'}
    ]}]},
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

  check("items[id={.id}].name",[
    {root: true},
    {get: 'items'},
    {select: ['id', {_sub: [
      {get: 'id'}
    ]}]},
    {get: 'name'}
  ])

  check("items[parent_id={workitems[{.id}=?]}].contacts[?={.items[?]}].name",[
    {root: true},
    {get: 'items'},
    {select: ['parent_id', {_sub: [
      {root: true},
      {get: 'workitems'}, 
      {select: [{_sub: [{get: 'id'}]}, {_param: 0}]}
    ]}]},
    {get: 'contacts'},
    {select: [{_param: 1}, {_sub: [
      {get: 'items'},
      {get: {_param: 2}}
    ]}]},
    {get: 'name'}
  ])

  check(":filter/subfilter",[
    {filter: 'filter/subfilter'}
  ])

  t.end()

})