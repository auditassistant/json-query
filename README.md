JSON Query
===

Retrieves values from JSON objects for data binding. Offers params, nested queries, deep queries, custom reduce/filter functions and simple boolean logic.

Used internally by [JSON Context](https://github.com/mmckegg/json-context) for data binding.

## Install

```bash
$ npm install json-query
```

### jsonQuery(query, options)

Specify a query and what to query - returns an object that describes the result of the query.

```js
var jsonQuery = require('json-query')

var context = {
  people: [
    {name: 'Matt', country: 'NZ'},
    {name: 'Pete', country: 'AU'}
  ]
}

jsonQuery('people[country=NZ].name', {
  rootContext: context
}) //=> {value: 'Matt', parents: [...], key: 0} ... etc
```

#### options:

- **rootContext**: The main JS object to query.
- **context** (optional): The current object we're interested in. Is accessed in query by starting with `.`
- **parent** (optional): An additional context for looking further up the tree. Is accessed by `..`
- **filters**: Specify an object containing filter functions. Accessed by ':filterName'
- **force** (optional): Specify an object to be returned from the query if the query fails - it will be saved into the place the query expected the object to be.

## Queries

Queries are strings that describe an object or value to pluck out, or manipulate from the context object. The syntax is a little bit CSS, a little bit JS, but pretty powerful.

### Accessing properties (dot notation)

`person.name`

### Array accessors

`people[0]`

### Array filter

`people[country=NZ]`

### Or syntax

`person.greetingName|person.name`

### Deep queries

Search through multiple levels of Objects/Arrays

```js
var context = {
  grouped_people: {
    'friends': [
      {name: 'Steve', country: 'NZ'},
      {name: 'Bob', country: 'US'}
    ],
    'enemies': [
      {name: 'Evil Steve', country: 'AU'}
    ]
  }
}

jsonQuery('grouped_people[][country=NZ]', {rootContext: context})
```
### Inner queries

```js
var context = {
  page: {
    id: 'page_1',
    title: 'Test'
  },
  comments_lookup: {
    'page_1': [
      {id: 'comment_1', parent_id: 'page_1', content: "I am a comment"}
    ]
  }
}

// get the comments that match page's id
jsonQuery('comments_lookup[{page.id}]', {rootContext: context})
```

### Filter functions

Allows to to hack the query system to do just about anything.

Some nicely contrived examples:

```js
var filters = {
  greetingName: function(input){
    if (input.knownAs){
      return input.known_as
    } else {
      return input.name
    }
  }
  },
  and: function(input, params){
    return input && params.args[0]
  },
  text: function(input, params){
    return params.args[0]
  },
  then: function(input, params){
    if (input){
      return params.args[0]
    } else {
      return params.args[1]
    }
  }
}

var context = {
  is_fullscreen: true,
  is_playing: false,
  user: {
    name: "Matthew McKegg",
    known_as: "Matt"
  }
}

jsonQuery('user:greetingName', {
  rootContext: context, filters: filters
}).value //=> "Matt"

jsonQuery(['is_fullscreen:and({is_playing}):then(?, ?)', "Playing big!", "Not so much"], {
  rootContext: context, filters: filters
}).value //=> "Not so much"

jsonQuery(':text(This displays text cos we made it so)', {
  filters: filters
}).value //=> "This displays text cos we made it so"

```

### Context

Specifying context ('rootContext', 'context', and 'parent' options) is good for databinding and working on a specific object and still keeping the big picture available.

```js
var data = {
  styles: {
    bold: 'font-weight:strong',
    red: 'color: red'
  },
  paragraphs: [
    {content: "I am a red paragraph", style: 'red'},
    {content: "I am a bold paragraph", style: 'bold'},
  ],
}

var pageHtml = ''
data.paragraphs.forEach(function(paragraph){
  var style = jsonQuery('styles[{.style}]', {rootContext: data, context: paragraph}).value
  var content = jsonQuery('.content', rootContext: data, context: paragraph) // pretty pointless :)
  pageHtml += "<p style='" + style "'>" + content + "</p>"
})
```

## Query Params

Params can be specified by passing in an array with the first param the query (with ? params) and subsequent params.

```js
jsonQuery(['people[country=?]', 'NZ'])
```

## Dynamic Queries

Dynamic queries are asynchronous and can execute custom functions to get their data. It's a handy interface over the basic tokenizer.

But I'm considering ditching the async queries, as this makes the whole thing way more complicated than it needs to be!

### jsonQuery.dynamic(query, options)

Too complicated for me to remember!

## License

MIT