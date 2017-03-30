require('es5-shim')

var test = require('tape')
var jsonQuery = require('../')

var filters = {
  uppercase: function(input, meta){
    if (input.toUpperCase){
      return input.toUpperCase()
    }
  },
  isAnimal: function (input) {
    return !!~['Cat', 'Dog', 'Chicken'].indexOf(input.name)
  },
  startsWithUppercase: function (input) {
    return input.charAt(0) === input.charAt(0).toUpperCase()
  }
}

var helpers = {
  get: function (input, key) {
    return input[key]
  }
}

var rootContext = {
  items: [
    {id: 0, name: 'test',         group: 'A', items: [{name: 'test0'}]},
    {id: 1, name: 'Another item', group: 'A'},
    {id: 2, name: 'Tickled',      group: 'A', description: "Financially"},
    {id: 3, name: 'Cat',          group: 'B', selected: true},
    {id: 4, name: 'Dog',          group: 'B', items: [{name: 'test4'}]},
    {id: 5, name: 'Chicken',      group: 'B'}
  ],
  regexp: /^T/i,
  current_item: 3,
  workitem: {
    id: 3434,
    name: "Item",
    parent_id: 3
  },
  lookup: {
    0: {
      id: 0,
      name: 'Item 0',
      rating: 1
    },
    1: {
      id: 1,
      name: 'Item 1',
      rating: 3
    },
    2: {
      id: 2,
      name: 'Item 2',
      rating: 4
    },
    3: {
      id: 3,
      name: 'Item 3',
      rating: 7
    },
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

test("Deep query to list all sub arrays of lookup", function(t){
  var result = jsonQuery('grouped_stuff[**]', {
    rootContext: rootContext, filters: filters
  })

  t.deepEqual(result.value, rootContext.grouped_stuff.group_a.concat(rootContext.grouped_stuff.group_b), "Correct Value")
  t.end()
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

test("RegExp filtering - nonexisting key", function(t){
  var result = jsonQuery('items[surname~/^T/].name', regExpOpts)

  t.equal(result.value, null)
  t.end()
})

test("RegExp filtering without allowRegexp throw error", function(t){
  t.throws(function () {
    jsonQuery('items[name~/^T/].name', { rootContext: rootContext })
  })
  t.end()
})

test("RegExp filtering with mode", function(t){
  var result = jsonQuery('items[name~/^T/i].name', regExpOpts)

  t.equal(result.value, 'test')
  t.end()
})

test("RegExp filtering using param", function(t) {
  var query = 'items[name~{regexp}].name'
  var result = jsonQuery(query, regExpOpts)
  t.equal(result.value, 'test')

  t.throws(function () {
    jsonQuery(query, { rootContext: rootContext })
  })

  t.end()
})

test("Contains filtering", function(t) {
  var query = 'items[name~item].name'
  var result = jsonQuery(query, regExpOpts)
  t.equal(result.value, 'Another item')

  t.doesNotThrow(function () {
    jsonQuery(query, { rootContext: rootContext })
  })

  t.end()
})

test("Contains filtering with param", function(t) {
  var query = ['items[name~?].name', 'item']
  var result = jsonQuery(query, regExpOpts)
  t.equal(result.value, 'Another item')

  t.doesNotThrow(function () {
    jsonQuery(query, { rootContext: rootContext })
  })

  t.end()
})

test("Negate RegExp filtering", function(t) {
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

test('get values of lookup', function (t) {
  use(rootContext, 'lookup[*]', function (c, q) {
    t.deepEqual(q.value, Object.keys(rootContext.lookup).map(function (key) {
      return rootContext.lookup[key]
    }), 'Correct Value')
    t.end()
  })
})

test('map values of items', function (t) {
  use(rootContext, 'items[*].name', function (c, q) {
    t.deepEqual(q.value, rootContext.items.map(function (item) {
      return item.name
    }), 'Correct Value')
    t.end()
  })
})

test('map sub values of items', function (t) {
  use(rootContext, 'items[*].items', function (c, q) {
    t.deepEqual(q.value, [].concat.apply([], rootContext.items.map(function (item) {
      return item.items
    })).filter(function (x) { return x !== undefined }), 'Correct Value')
    t.end()
  })
})

test('handle missing sub values of items', function (t) {
  use(rootContext, 'items[*].items.name', function (c, q) {
    t.deepEqual(q.value, [ 'test0', 'test4' ], 'Correct Value')
    t.end()
  })
})

test('handle missing key with sub items', function (t) {
  use(rootContext, 'notexist[*].items', function (c, q) {
    t.deepEqual(q.value, [], 'Correct Value')
    t.end()
  })
})

test('compare operators', function (t) {
  use(rootContext, 'lookup[*][*rating > 1]', function (c, q) {
    t.deepEqual(q.value, Object.keys(rootContext.lookup).map(function (key) {
      return rootContext.lookup[key]
    }).filter(function (item) {
      return item.rating > 1
    }), 'Correct Value')
    t.end()
  })
})

test('boolean match', function (t) {
  use(rootContext, 'items[selected=true]', function (c, q) {
    t.deepEqual(q.value, rootContext.items[3], 'Correct Value')
    t.end()
  })
})

test('boolean select', function (t) {
  use(rootContext, 'lookup[*][*rating > 1 & rating < 4]', function (c, q) {
    t.deepEqual(q.value, Object.keys(rootContext.lookup).map(function (key) {
      return rootContext.lookup[key]
    }).filter(function (item) {
      return item.rating > 1 && item.rating < 4
    }), 'Correct Value')
    t.end()
  })
})

test('filter select', function (t) {
  use(rootContext, 'items[*:isAnimal]', function (c, q) {
    t.deepEqual(q.value, rootContext.items.filter(function (item) {
      return !!~['Cat', 'Dog', 'Chicken'].indexOf(item.name)
    }), 'Correct Value')
    t.end()
  })
})

test('filter on root', function (t) {
  use(rootContext, ':get(current_item)', function (c, q) {
    t.deepEqual(q.value, rootContext.current_item, 'Correct Value')
    t.end()
  })
})

test('filter select key', function (t) {
  use(rootContext, 'items[*name:startsWithUppercase]', function (c, q) {
    t.deepEqual(q.value, rootContext.items.slice(1), 'Correct Value')
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
  var result = jsonQuery(query, {rootContext: context, filters: filters, locals: helpers})
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
