var assert = require('assert')

var jsonQuery = require('../json-query')

var filters = {
  uppercase: function(input, meta){
    if (input.toUpperCase){
      return input.toUpperCase()
    }
  }
}

var rootContext = {
  items: [
    {id: 0, name: 'test'},
    {id: 1, name: 'Another item'},
    {id: 2, name: 'Tickled', description: "Financially"},
    {id: 3, name: 'Cat'},
    {id: 4, name: 'Dog'},
    {id: 5, name: 'Chicken'}
  ],
  current_item: 3,
  workitem: {
    id: 3434,
    name: "Item",
    parent_id: 3
  },
  random_fields: {
    find_name: "Cat"
  },
  grouped_stuff: {
    'group_a': [
      {id: 343, name: "Long Cat"},
      {id: 344, name: "Hover Cat"},
      {id: 345, name: "Ceiling Cat"}
    ],
    'group_b': [
      {id: 346, name: "Basement Cat"},
      {id: 347, name: "Happy Cat"},
      {id: 348, name: "Displeased Cat"}
    ]
  }
}

test(rootContext, 'current_item', function(c,q){
  assert.equal(q.value, 3)
  assert.equal(q.key, 'current_item')
})

test(rootContext, '.current_item', function(c,q){
  assert.equal(q.value, 3)
  assert.equal(q.key, 'current_item')
})

test(rootContext, 'items[id=2].name', function(c,q){
  assert.equal(q.value, 'Tickled')
  assert.equal(q.key, 'name')
  assert.equal(q.parents[q.parents.length-1].key, 2)  
  
})

test(rootContext, 'items[id=2].name:uppercase', function(c,q){
  assert.equal(q.value, 'TICKLED')
  assert.equal(q.parents[q.parents.length-2].key, 2)  
  assert.equal(q.key, null)
})

test(rootContext, ['items[id=?].name', 1], function(c,q){
  assert.equal(q.value, 'Another item')
  assert.equal(q.parents[q.parents.length-1].key, 1)  
})

test(rootContext, 'items[id={current_item}].name', function(c,q){
  assert.equal(q.value, "Cat")
  assert.equal(q.parents[q.parents.length-1].key, 3)
})

test(rootContext, 'items[name={random_fields.find_name}].id', function(c,q){
  assert.equal(q.value, 3)
  assert.equal(q.parents[q.parents.length-1].key, 3)
})

test(rootContext, ['grouped_stuff[][id=?].name', 347], function(c,q){
  assert.equal(q.value, 'Happy Cat')
  assert.equal(q.parents[q.parents.length-1].key, 1)
})

// parent tests
test({items: [{id: 1, name: "test", sub: {field: 'Test'}}]}, "items[id=1].sub.field", function(c, q){
  assert.equal('Test', q.value)
  assert.equal(c, q.parents[0].value)
  assert.equal(c.items, q.parents[1].value)
  assert.equal(c.items[0], q.parents[2].value)
  assert.equal(c.items[0].sub, q.parents[3].value)
})

// reference tests
test({items: [{id: 1, name: "test", sub: {field: 'Test'}}], settings: {current_id: 1}}, "items[id={settings.current_id}].sub.field", function(c, q){
  assert.equal('Test', q.value)
  assert.equal(c.settings, q.references[0])
  assert.equal(c.items[0].sub, q.references[1])
})

// force collection tests
forceCollectionTest({items: {Comments: [{id:1, description: "Test"}]}}, "items[Attachments]", function(c,q){
  assert(Array.isArray(q.value), "Force collection did not produce array")
  assert.equal(c.items["Attachments"], q.value)
})

// context tests
testWithContext(rootContext, 'items[id=2]', '.name', function(c,q){
  assert.equal(q.value, "Tickled")
})
testWithContext(rootContext, 'workitem', 'items[{.parent_id}].name', function(c,q){
  assert.equal(q.value, "Cat")
})

// 'or' tests
testWithContext(rootContext, 'items[id=2]', '.description|.name', function(c,q){
  assert.equal(q.value, "Financially")
  assert.equal(q.value, rootContext.items[2].description)
})
testWithContext(rootContext, 'items[id=1]', '.description|.name', function(c,q){
  assert.equal(q.value, "Another item")
  assert.equal(q.value, rootContext.items[1].name)
})

//todo: force collection + deep query tests
//  -- maybe this isn't actually possible?

function test(context, query, tests){
  var result = jsonQuery(query, {rootContext: context, filters: filters})
  tests(context, result)
}

function testWithContext(rootContext, contextQuery, query, tests){
  var contextResult = jsonQuery(contextQuery, {rootContext: rootContext}).value
  var result = jsonQuery(query, {rootContext: rootContext, context: contextResult, filters: filters})
  tests(rootContext, result)
}

function forceCollectionTest(context, query, tests){
  var result = jsonQuery(query, {rootContext: context, filters: filters, force: []})
  tests(context, result)
}
