var jsonQuery = require('json-query')

var data = {
  "other_data" : "non important data",
  "exp" : {
      "Book 1" : {
        "other_book_info": "hello book 1",
        "planets_info": [
          "hello Earth",
          "Jupiter hello",
          "Earth hello",
        ]
      },
      "Book 2" : {
        "other_book_info": "hello book 2",
        "planets_info": [
          "hello Venus",
          "Pluto hello",
          "Mercury hello",
        ]
      }
  }
}

var helpers = {
  contains: function (input, arg) {
    return Array.isArray(input) && input.some(x => x.includes(arg))
  }
}

console.log(jsonQuery('exp[*][*planets_info:contains(Earth)]', {
  data: data,
  locals: helpers
}).value)
