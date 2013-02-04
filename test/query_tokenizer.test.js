var assert = require('assert')

var queryTokenizer = require('../query_tokenizer')


check("items[id=1].name",[
  {root: true},
  {get: 'items'},
  {select: ['id', '1']},
  {get: 'name'}
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


function check(query, expected){
  var tokenized = queryTokenizer(query, true)
  assert.deepEqual(tokenized, expected)
}