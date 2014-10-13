// todo: syntax checking
// todo: test handle args

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
  return depthSplit(argsQuery, ',').map(function(s){
    return handleSelectPart(s.trim())
  })
}

function tokenizeSelect(selectQuery){
  
  var parts = depthSplit(selectQuery, '=', 2)
  
  if (parts.length === 1){
    return { get: handleSelectPart(parts[0]) }
  } else {
    return { select: [handleSelectPart(parts[0]), handleSelectPart(parts[1])] }
  }

}

function handleSelectPart(part){
  if (part.charAt(0) === '{' && part.charAt(part.length-1) === '}'){
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

function depthSplit(text, delimiter, max){
  var openers = ['[', '(', '{']
    , closers = [']', ')', '}']
    , depth = 0
    
  if (!text){
    return []
  }
  
  if (max === 1){
    return [text]
  }
  var remainder = text
  var result = []
  var lastSlice = 0
  
  for (var i=0;i<text.length;i++){
    var char = text.charAt(i)
    
    if (depth === 0 && char === delimiter){

      result.push(text.slice(lastSlice, i))
      remainder = text.slice(i+1)
      lastSlice = i+1
      
      if (max && result.length >= max-1){
        break;
      }
      
    } else if (~openers.indexOf(char)){
      depth += 1
    } else if (~closers.indexOf(char)){
      depth -= 1
    }
    
  }
  
  result.push(remainder)
  
  return result
}

function assignParamIds(query){
  var index = 0
  return query.replace(/\?/g, function(match){
    return match + (index++)
  })
}
