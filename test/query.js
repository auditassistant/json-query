require('es5-shim')

var test = require('tape')
var jsonQuery = require('../')

var filters = {
  uppercase: function(input, meta){
    if (input.toUpperCase){
      return input.toUpperCase()
    }
  }
}

var rootContext = {
  items: [
    {id: 0, name: 'test',         group: 'A'},
    {id: 1, name: 'Another item', group: 'A'},
    {id: 2, name: 'Tickled',      group: 'A', description: "Financially"},
    {id: 3, name: 'Cat',          group: 'B'},
    {id: 4, name: 'Dog',          group: 'B'},
    {id: 5, name: 'Chicken',      group: 'B'}
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

var regExpOpts = { rootContext: rootContext, allowRegexp: true }

test("Simple Root Key Query", function(t){
  use(rootContext, 'current_item', function(c,q){
    t.equal(q.value, 3, "Correct Value")
    t.equal(q.key, 'current_item', "Correct Key")
    t.end()
  })
})

test("Simple local key query", function(t){
  use(rootContext, '.current_item', function(c,q){
    t.equal(q.value, 3, "Correct Value")
    t.equal(q.key, 'current_item', "Correct Key")
    t.end()
  })
})

test("Single level iterating key query", function(t){
  use(rootContext, 'items[id=2].name', function(c,q){
    t.equal(q.value, 'Tickled', "Correct Value")
    t.equal(q.key, 'name', "Correct Key")
    t.equal(q.parents[q.parents.length-1].key, 2, "Parent Key")
    t.end()
  })
})

test("Filter with iterating key query", function(t){
  use(rootContext, 'items[id=2].name:uppercase', function(c,q){
    t.equal(q.value, 'TICKLED', "Correct Value")
    t.equal(q.parents[q.parents.length-2].key, 2, "Parent Key")
    t.equal(q.key, null, "Correct Key")
    t.end()
  })
})

test("Params with iterating key query", function(t){
  var result = jsonQuery(['items[id=?].name', 1], {
    rootContext: rootContext, filters: filters
  })

  t.equal(result.value, 'Another item', "Correct Value")
  t.equal(result.parents[result.parents.length-1].key, 1, "Parent Key")
  t.end()
})

test("Cross context params", function(t){
  use(rootContext, 'items[id={current_item}].name', function(c,q){
    t.equal(q.value, "Cat", "Correct Value")
    t.equal(q.parents[q.parents.length-1].key, 3, "Correct Key")
    t.end()
  })
})

test("Iterating key query with cross context param", function(t){
  use(rootContext, 'items[name={random_fields.find_name}].id', function(c,q){
    t.equal(q.value, 3, "Correct Value")
    t.equal(q.parents[q.parents.length-1].key, 3, "Correct Key")
    t.end()
  })
})

test("Deep query with iterating key query and specified param", function(t){
  var result = jsonQuery(['grouped_stuff[][id=?].name', 347], {
    rootContext: rootContext, filters: filters
  })

  t.equal(result.value, 'Happy Cat', "Correct Value")
  t.equal(result.parents[result.parents.length-1].key, 1, "Correct Key")
  t.end()
})

test("negate select", function(t){
  var result = jsonQuery('items[group!=A].name', { rootContext: rootContext })

  t.equal(result.value, 'Cat')
  t.end()
})

test("RegExp filtering", function(t){
  var result = jsonQuery('items[name~/^T/].name', regExpOpts)

  t.equal(result.value, 'Tickled')
  t.end()
})

test("RegExp filtering whitout allowRegexp throw error", function(t){
  try {
    jsonQuery('items[name~/^T/].name', { rootContext: rootContext })
  } catch(err) {
    t.equal(err.message, 'options.allowRegexp is not enabled.')
    t.end()
  }
})

test("RegExp filtering with mode", function(t){
  var result = jsonQuery('items[name~/^T/i].name', regExpOpts)

  t.equal(result.value, 'test')
  t.end()
})

test("Negate RegExp filtering", function(t){
  var result = jsonQuery('items[name!~/^t/].name', regExpOpts)

  t.equal(result.value, 'Another item')
  t.end()
})

// parent tests

test("Parents correctly assigned for iterative key query with multiple levels", function(t){
  use({items: [{id: 1, name: "test", sub: {field: 'Test'}}]}, "items[id=1].sub.field", function(c, q){
    t.equal('Test', q.value, "Correct Value")
    t.equal(c, q.parents[0].value, "Parent 0")
    t.equal(c.items, q.parents[1].value, "Parent 1")
    t.equal(c.items[0], q.parents[2].value, "Parent 2")
    t.equal(c.items[0].sub, q.parents[3].value, "Parent 3")
    t.end()
  })
})

// reference tests

test("References correctly set for iterative key query with cross context param", function(t){
  use({items: [{id: 1, name: "test", sub: {field: 'Test'}}], settings: {current_id: 1}}, "items[id={settings.current_id}].sub.field", function(c, q){
    t.equal('Test', q.value, "Correct Value")
    t.equal(c.settings, q.references[0], "Reference 0")
    t.equal(c.items[0].sub, q.references[1], "Reference 1")
    t.end()
  })
})


// force collection tests
test("Force a collection when key query doesn't provide value", function(t){
  withForceCollection({items: {Comments: [{id:1, description: "Test"}]}}, "items[Attachments]", function(c,q){
    t.assert(Array.isArray(q.value), "Force collection produced array")
    t.equal(c.items["Attachments"], q.value, "Correct Value")
    t.end()
  })
})

// context tests
test("Iterative query get context then query context for key", function(t){
  withContext(rootContext, 'items[id=2]', '.name', function(c,q){
    t.equal(q.value, "Tickled", "Correct Value")
    t.end()
  })
})

test("Key query get context then iterative context query with params", function(t){
  withContext(rootContext, 'workitem', 'items[{.parent_id}].name', function(c,q){
    t.equal(q.value, "Cat", "Correct Value")
    t.end()
  })
})


// 'or' tests
test("Test 'or' for iterative query", function(t){
  withContext(rootContext, 'items[id=2]', '.description|.name', function(c,q){
    t.equal(q.value, "Financially", "Correct Value for second")
    t.equal(q.value, rootContext.items[2].description)
  })
  withContext(rootContext, 'items[id=1]', '.description|.name', function(c,q){
    t.equal(q.value, "Another item", "Correct Value for first")
    t.equal(q.value, rootContext.items[1].name)
  })
  t.end()
})

test("Use options.source instead of context", function(t){
  withSource(rootContext, 'items[id=2]', '.description|.name', function(c,q){
    t.equal(q.value, "Financially", "Correct Value for second")
    t.equal(q.value, rootContext.items[2].description)
  })
  withSource(rootContext, 'items[id=1]', '.description|.name', function(c,q){
    t.equal(q.value, "Another item", "Correct Value for first")
    t.equal(q.value, rootContext.items[1].name)
  })
  t.end()
})

// multiple result tests
test('accessing keys on arrays plucks values', function (t) {
  use(rootContext, 'items.name', function (c, q) {
    t.deepEqual(q.value, ['test', 'Another item', 'Tickled', 'Cat', 'Dog', 'Chicken'], 'Correct Value')
    t.deepEqual(q.parents, [
      { value: rootContext,
        key: null
      },
      { value: rootContext.items,
        key: 'items'
      }
    ], 'correct parents')
    t.end()
  })
})

test('multiple selector', function (t) {
  use(rootContext, 'items[*group=A]', function (c, q) {
    t.deepEqual(q.value, [rootContext.items[0], rootContext.items[1], rootContext.items[2]], 'Correct Value')
    t.deepEqual(q.parents, [
      { value: rootContext,
        key: null
      },
      { value: rootContext.items,
        key: 'items'
      }
    ], 'correct parents')
    t.end()
  })
})

test('multiple selector with array pluck', function (t) {
  use(rootContext, 'items[*group=A].name', function (c, q) {
    t.deepEqual(q.value, ['test', 'Another item', 'Tickled'], 'Correct Value')
    t.deepEqual(q.parents, [
      { value: rootContext,
        key: null
      },
      { value: rootContext.items,
        key: 'items'
      },
      { value: [rootContext.items[0], rootContext.items[1], rootContext.items[2]],
        key: [0, 1, 2]
      }
    ], 'correct parents')
    t.end()
  })
})

test('negated multiple selector with array pluck', function (t) {
  use(rootContext, 'items[*group!=A].name', function (c, q) {
    t.deepEqual(q.value, ['Cat', 'Dog', 'Chicken'], 'Correct Value')
    t.deepEqual(q.parents, [
      { value: rootContext,
        key: null
      },
      { value: rootContext.items,
        key: 'items'
      },
      { value: [rootContext.items[3], rootContext.items[4], rootContext.items[5]],
        key: [3, 4, 5]
      }
    ], 'correct parents')
    t.end()
  })
})

function use(context, query, tests){
  var result = jsonQuery(query, {rootContext: context, filters: filters})
  tests(context, result)
}

function withContext(rootContext, contextQuery, query, tests){
  var contextResult = jsonQuery(contextQuery, {rootContext: rootContext}).value
  var result = jsonQuery(query, {rootContext: rootContext, context: contextResult, filters: filters})
  tests(rootContext, result)
}

function withSource(rootContext, contextQuery, query, tests){
  var source = jsonQuery(contextQuery, {rootContext: rootContext}).value
  var result = jsonQuery(query, {rootContext: rootContext, source: source, filters: filters})
  tests(rootContext, result)
}

function withForceCollection(context, query, tests){
  var result = jsonQuery(query, {rootContext: context, filters: filters, force: []})
  tests(context, result)
}
