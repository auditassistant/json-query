json-query
===

Retrieves values from JSON objects for data binding. Offers params, nested queries, deep queries, custom reduce/filter functions and simple boolean logic.

## Install via [npm](https://www.npmjs.com/package/json-query)

```bash
$ npm install json-query
```

## API

```js
var jsonQuery = require('json-query')
```

### jsonQuery(query, options)

Specify a query and what to query - returns an object that describes the result of the query.

```js

var data = {
  people: [
    {name: 'Matt', country: 'NZ'},
    {name: 'Pete', country: 'AU'},
    {name: 'Mikey', country: 'NZ'}
  ]
}

jsonQuery('people[country=NZ].name', {
  data: data
}) //=> {value: 'Matt', parents: [...], key: 0} ... etc
```

#### options:

- **data** or **rootContext**: The main JS object to query.
- **source** or **context** (optional): The current object we're interested in. Is accessed in query by starting with `.`
- **parent** (optional): An additional context for looking further up the tree. Is accessed by `..`
- **locals**: Specify an object containing helper functions. Accessed by ':filterName'. Expects function(input, args...) with `this` set to original passed in options.
- **globals**: Falls back to globals when no local function found.
- **force** (optional): Specify an object to be returned from the query if the query fails - it will be saved into the place the query expected the object to be.
- **allowRegexp** (optional): enable `~` operator. Before enabling regexp match to anyone, consider the [user defined regular expression security concerns](http://stackoverflow.com/questions/20928677/user-defined-regular-expression-security-concerns).

## Queries

Queries are strings that describe an object or value to pluck out, or manipulate from the context object. The syntax is a little bit CSS, a little bit JS, but pretty powerful.

### Accessing properties (dot notation)

`person.name`

### Array accessors

`people[0]`

### Array pluck

`people[].name` => return all the names of people

### Array filter

By default **only the first** matching item will be returned:

`people[name=Matt]`

But if you add an asterisk (`*`), **all** matching items will be returned:

`people[*country=NZ]`

If `options.enableRegexp` is enabled, you can use the `~` operator to match `RegExp`:

`people[*name~/^R/i]`

You can also **negate** any of the above examples by adding a `!` before the `=` or `~`:

`people[*country!=NZ]`

### Or syntax

`person.greetingName|person.name`

### Deep queries

Search through multiple levels of Objects/Arrays

```js
var data = {
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

jsonQuery('grouped_people[][country=NZ]', {data: data})
```
### Inner queries

```js
var data = {
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
jsonQuery('comments_lookup[{page.id}]', {data: data})
```

### Local functions (helpers)

Allows to to hack the query system to do just about anything.

Some nicely contrived examples:

```js
var locals = {
  greetingName: function(input){
    if (input.known_as){
      return input.known_as
    } else {
      return input.name
    }
  },
  and: function(inputA, inputB){
    return inputA && inputB
  },
  text: function(input, text){
    return text
  },
  then: function(input, thenValue, elseValue){
    if (input){
      return thenValue
    } else {
      return elseValue
    }
  }
}

var data = {
  is_fullscreen: true,
  is_playing: false,
  user: {
    name: "Matthew McKegg",
    known_as: "Matt"
  }
}

jsonQuery('user:greetingName', {
  data: data, locals: locals
}).value //=> "Matt"

jsonQuery(['is_fullscreen:and({is_playing}):then(?, ?)', "Playing big!", "Not so much"], {
  data: data, locals: locals
}).value //=> "Not so much"

jsonQuery(':text(This displays text cos we made it so)', {
  locals: locals
}).value //=> "This displays text cos we made it so"

```

### Context

Specifying context ('data', 'source', and 'parent' options) is good for databinding and working on a specific object and still keeping the big picture available.

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
  var style = jsonQuery('styles[{.style}]', {data: data, source: paragraph}).value
  var content = jsonQuery('.content', data: data, source: paragraph) // pretty pointless :)
  pageHtml += "<p style='" + style "'>" + content + "</p>"
})
```

## Query Params

Params can be specified by passing in an array with the first param the query (with ? params) and subsequent params.

```js
jsonQuery(['people[country=?]', 'NZ'])
```

## License

MIT
