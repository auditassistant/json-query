var jsonQuery = require('json-query')

var data = {
  grouped_people: {
    'friends': [
      {name: 'Steve', country: ['NZ', 'US']},
      {name: 'Daniel', country: ['NZ']},
      {name: 'Bob', country: ['US']}
    ],
    'enemies': [
      {name: 'Evil Steve', country: ['NZ', 'US']}
    ]
  }
}

var result = jsonQuery('grouped_people[**][*country~US]', { data: data }).value
console.log(result)
