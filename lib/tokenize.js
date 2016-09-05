// todo: syntax checking
// todo: test handle args
var depthSplit = require('./depth-split')

module.exports = function(query, shouldAssignParamIds){
  if (!query) return []

  var result = []
    , prevChar, char
    , nextChar = query.charAt(0)
    , bStart = 0
    , bEnd = 0
    , partOffset = 0
    , pos = 0
    , depth = 0
    , mode = 'get'
    , deepQuery = null

  // if query contains params then number them
  if (shouldAssignParamIds){
    query = assignParamIds(query)
  }

  var tokens = {
    '.': {mode: 'get'},
    ':': {mode: 'filter'},
    '|': {handle: 'or'},
    '[': {open: 'select'},
    ']': {close: 'select'},
    '{': {open: 'meta'},
    '}': {close: 'meta'},
    '(': {open: 'args'},
    ')': {close: 'args'}
  }

  function push(item){
    if (deepQuery){
      deepQuery.push(item)
    } else {
      result.push(item)
    }
  }

  var handlers = {
    get: function(buffer){
      var trimmed = typeof buffer === 'string' ? buffer.trim() : null
      if (trimmed){
        push({get:trimmed})
      }
    },
    select: function(buffer){
      if (buffer){
        push(tokenizeSelect(buffer))
      } else {
        // deep query override
        var x = {deep: []}
        result.push(x)
        deepQuery = x.deep
      }
    },
    filter: function(buffer){
      if (buffer){
        push({filter:buffer.trim()})
      }
    },
    or: function(){
      deepQuery = null
      result.push({or:true})
      partOffset = i + 1
    },
    args: function(buffer){
      var args = tokenizeArgs(buffer)
      result[result.length-1].args = args
    }
  }

  function handleBuffer(){
    var buffer = query.slice(bStart, bEnd)
    if (handlers[mode]){
      handlers[mode](buffer)
    }
    mode = 'get'
    bStart = bEnd + 1
  }

  for (var i = 0;i < query.length;i++){

    // update char values
    prevChar = char; char = nextChar; nextChar = query.charAt(i + 1);
    pos = i - partOffset

    // root query check
    if (pos === 0 && (char !== ':' && char !== '.')){
      result.push({root:true})
    }

    // parent query check
    if (pos === 0 && (char === '.' && nextChar === '.')){
      result.push({parent:true})
    }

    var token = tokens[char]
    if (token){

      // set mode
      if (depth === 0 && (token.mode || token.open)){
        handleBuffer()
        mode = token.mode || token.open
      }

      if (depth === 0 && token.handle){
        handleBuffer()
        handlers[token.handle]()
      }

      if (token.open){
        depth += 1
      } else if (token.close){
        depth -= 1
      }

      // reset mode to get
      if (depth === 0 && token.close){
        handleBuffer()
      }

    }

    bEnd = i + 1

  }

  handleBuffer()
  return result
}

function tokenizeArgs(argsQuery){
  if (argsQuery === ',') return [',']
  return depthSplit(argsQuery, /,/).map(function(s){
    return handleSelectPart(s.trim())
  })
}

function tokenizeSelect (selectQuery) {
  if (selectQuery === '*') {
    return {
      values: true
    }
  } else if (selectQuery === '**') {
    return {
      values: true,
      deep: true
    }
  }

  var multiple = false
  if (selectQuery.charAt(0) === '*') {
    multiple = true
    selectQuery = selectQuery.slice(1)
  }

  var booleanParts = depthSplit(selectQuery, /&|\|/, { includeDelimiters: true })
  if (booleanParts.length > 1) {
    var result = [
      getSelectPart(booleanParts[0].trim())
    ]
    for (var i = 1; i < booleanParts.length; i += 2) {
      var part = getSelectPart(booleanParts[i + 1].trim())
      if (part) {
        part.booleanOp = booleanParts[i]
        result.push(part)
      }
    }
    return {
      multiple: multiple,
      boolean: true,
      select: result
    }
  } else {
    var result = getSelectPart(selectQuery.trim())
    if (!result) {
      return {
        get: handleSelectPart(selectQuery.trim())
      }
    } else {
      if (multiple) {
        result.multiple = true
      }
      return result
    }
  }
}

function getSelectPart (selectQuery) {
  var parts = depthSplit(selectQuery, /(!)?(=|~|\:|<=|>=|<|>)/, { max: 2, includeDelimiters: true })
  if (parts.length === 3) {
    var negate = parts[1].charAt(0) === '!'
    var key = handleSelectPart(parts[0].trim())
    var result = {
      negate: negate,
      op: negate ? parts[1].slice(1) : parts[1]
    }
    if (result.op === ':') {
      result.select = [key, {_sub: module.exports(':' + parts[2].trim())}]
    } else if (result.op === '~') {
      var value = handleSelectPart(parts[2].trim())
      if (typeof value === 'string') {
        var reDef = parts[2].trim().match(/^\/(.*)\/([a-z]?)$/)
        if (reDef) {
          result.select = [key, new RegExp(reDef[1], reDef[2])]
        } else {
          result.select = [key, value]
        }
      } else {
        result.select = [key, value]
      }
    } else {
      result.select = [key, handleSelectPart(parts[2].trim())]
    }
    return result
  }
}

function isInnerQuery (text) {
  return text.charAt(0) === '{' && text.charAt(text.length-1) === '}'
}

function handleSelectPart(part){
  if (isInnerQuery(part)){
    var innerQuery = part.slice(1, -1)
    return {_sub: module.exports(innerQuery)}
  } else {
    return paramToken(part)
  }
}

function paramToken(text){
  if (text.charAt(0) === '?'){
    var num = parseInt(text.slice(1))
    if (!isNaN(num)){
      return {_param: num}
    } else {
      return text
    }
  } else {
    return text
  }
}



function assignParamIds(query){
  var index = 0
  return query.replace(/\?/g, function(match){
    return match + (index++)
  })
}

function last (array) {
  return array[array.length - 1]
}
