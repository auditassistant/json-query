var jsonQuery = require('json-query')

var data = {
  people: [
    {name: 'Matt', country: 'NZ', city: 'Lower Hutt'},
    {name: 'Pete', country: 'AU', city: 'Melbourne'},
    {name: 'Mikey', country: 'NZ', city: 'Wellington'}
  ]
}

var helpers = {
  select: function (input) {
    if (Array.isArray(input)) {
      var keys = [].slice.call(arguments, 1)
      return input.map(function (item) {
        return Object.keys(item).reduce(function (result, key) {
          if (~keys.indexOf(key)) {
            result[key] = item[key]
          }
          return result
        }, {})
      })
    }
  }
}

var result = jsonQuery('people:select(name, country)', {
  data: data, locals: helpers
}).value

console.log(result)
