var queryTokenizer = require('./query_tokenizer')

module.exports = function(query, options){
  
  // extract params for ['test[param=?]', 'value'] type queries
  if (Array.isArray(query)){
    options.params = query.slice(1)
    query = query[0]
  }
  
  // set up context vars
  options.rootContext = options.rootContext || options.context
  options.context = options.context || options.rootContext
  options.params = options.params || []
  
  var tokenizedQuery = queryTokenizer(query, true)
  
  return handleQuery(tokenizedQuery, options)
  
}

module.exports.lastParent = function(query){
  var last = query.parents[query.parents.length - 1]
  if (last){
    return last.value
  } else {
    return null
  }
}

function handleQuery(tokenizedQuery, options){
  var currentItem = options.currentItem || options.context
    , currentKey = null
    , currentReferences = []
    , currentParents = []
    
  var filters = options.filters || {}
    
  for (var i=0;i<tokenizedQuery.length;i++){
    
    var token = tokenizedQuery[i]
    
    if (token.get){
      var key = handleValue(token.get)
      
      //force currentItem to be hash if it doesn't already exist and force is enabled
      if (currentItem || (options.force && force({}))){
        setCurrent(key, currentItem[key])
      } else {
        setCurrent(key, null)
      }
      
      
    } else if (token.select){

      if (Array.isArray(currentItem) || (options.force && force([]))){
        var result = selectWithKey(currentItem, handleValue(token.select[0]), handleValue(token.select[1]))
        setCurrent(result[0], result[1])
      } else {
        setCurrent(null, null)
      }
      
    } else if (token.root){
      resetCurrent()
      setCurrent(null, options.rootContext)
      
    } else if (token.or){
      
      if (currentItem){
        break;
      } else {
        resetCurrent()
        setCurrent(null, options.context)
      }
      
    } else if (token.filter){
      if (filters[token.filter]){
        var result = filters[token.filter](currentItem, {args: handleValues(token.args || []), options: options, references: currentReferences})
        setCurrent(null, result)
      } else {
        setCurrent(null, null)
      }
      
    } else if (token.deep){
      
      if (currentItem){
        
        var result = deepQuery(currentItem, token.deep, options)
        if (result){
          setCurrent(result.key, result.value)
          result.parents.forEach(function(parent){
            currentParents.push(parent)
          })
        } else {
          setCurrent(null, null)
        }
        
      } else {
        currentItem = null
      }
      
    }
    
  }
  
  // force collection if the final item is not a collection and force is enabled
  if (!currentItem && options.force){
    force(options.force)
  }
 
  function resetCurrent(){
    currentItem = null
    currentKey = null
    currentParents = []
  }
  
  function force(def){
    var parent = currentParents[currentParents.length-1]
    if (!currentItem && parent && (currentKey != null)){
      currentItem = def || {}
      parent.value[currentKey] = currentItem
    }
    return !!currentItem
  }
  
  function setCurrent(key, value){
    if (currentItem || currentKey || currentParents.length>0){
      currentParents.push({key: currentKey, value: currentItem})
    }
    currentItem = value
    currentKey = key
  }
  
  function handleValues(values){
    return values.map(handleValue)
  }
  
  function handleValue(value){
    if (value._param != null){
      return options.params[value._param]
    } else if (value._sub){
      var result = handleQuery(value._sub, optionsWithoutForce(options))
      addReferences(result.references)
      return result.value
    } else {
      return value
    }
  }
  
  function addReferences(references){
    if (references){
      references.forEach(addReference)
    }
  }
  
  function addReference(ref){
    if (!~currentReferences.indexOf(ref)){
      currentReferences.push(ref)
    }
  }
  
  // resolve references (the last item on the tree that is an object that could be bound to)
  if (currentItem instanceof Object){
    addReference(currentItem)
  } else if (currentParents.length > 0){
    addReference(currentParents[currentParents.length-1].value)
  }
    
  return {value: currentItem, key: currentKey, references: currentReferences, parents: currentParents}
}

function selectWithKey(source, key, value){
  if (source && source.length){
    for (var i=0;i<source.length;i++){
      if (source[i][key] == value){
        return [i, source[i]]
      }
    }
  }
  return [null, null]
}

function deepQuery(source, query, options){
  var keys = Object.keys(source)
  
  for (var i=0;i<keys.length;i++){
    var key = keys[i]
    var item = source[key]
        
    var result = handleQuery(query, optionsWithItem(options, item))
    
    if (result.value){
      return result
    }
    
  }
    
  return null
}

function optionsWithItem(options, item){
  return {
    currentItem: item,
    context: options.context,
    rootContext: options.rootContext,
    params: options.params,
    filters: options.filters,
    force: options.force
  }
}

function optionsWithoutForce(options, item){
  return {
    currentItem: options.currentItem,
    context: options.context,
    rootContext: options.rootContext,
    params: options.params,
    filters: options.filters,
  }
}