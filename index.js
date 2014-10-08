var State = require('./lib/state')
var tokenize = require('./lib/tokenize')

var tokenizedCache = {}

module.exports = function jsonQuery(query, options){

  // extract params for ['test[param=?]', 'value'] type queries
  var params = options && options.params || null
  if (Array.isArray(query)){
    params = query.slice(1)
    query = query[0]
  }

  if (!tokenizedCache[query]){
    tokenizedCache[query] = tokenize(query, true)
  }

  return handleQuery(tokenizedCache[query], options, params)
}


module.exports.lastParent = function(query){
  var last = query.parents[query.parents.length - 1]
  if (last){
    return last.value
  } else {
    return null
  }
}


function handleQuery (tokens, options, params){

  var state = new State(options, params, handleQuery)

  for (var i=0;i<tokens.length;i++) {
    if (handleToken(tokens[i], state)){
      break
    }
  }

  // flush
  handleToken(null, state)

  // set databind hooks
  if (state.currentItem instanceof Object){
    state.addReference(state.currentItem)
  } else {
    var parentObject = getLastParentObject(state.currentParents)
    if (parentObject){
      state.addReference(parentObject)
    }
  }

  return {
    value: state.currentItem,
    key: state.currentKey,
    references: state.currentReferences,
    parents: state.currentParents
  } 
}

function handleToken(token, state){
  // state: setCurrent, getValue, getValues, resetCurrent, deepQuery, rootContext, currentItem, currentKey, options, filters
  
  if (token == null){
    // process end of query
    
    if (!state.currentItem && state.options.force){
      state.force(state.options.force)
    }
    
  } else if (token.get){
    
    var key = state.getValue(token.get)
    if (state.override && state.currentItem === state.rootContext && state.override[key] !== undefined){
      state.setCurrent(key, state.override[key])
    } else {
      if (state.currentItem || (state.options.force && state.force({}))){
        state.setCurrent(key, state.currentItem[key])
      } else {
        state.setCurrent(key, null)
      }
    }
    
  } else if (token.select){
    
    if (Array.isArray(state.currentItem) || (state.options.force && state.force([]))){
      var values = state.getValues(token.select)
      var result = selectWithKey(state.currentItem, values[0], values[1])
      state.setCurrent(result[0], result[1])
    } else {
      state.setCurrent(null, null)
    }
    
  } else if (token.root){

    state.resetCurrent()
    if (token.args && token.args.length){
      state.setCurrent(null, state.getValue(token.args[0]))
    } else {
      state.setCurrent(null, state.rootContext)
    }
    
  } else if (token.parent){
    
    state.resetCurrent()
    state.setCurrent(null, state.options.parent)
    
  } else if (token.or){

    if (state.currentItem){
      return true
    } else {
      state.resetCurrent()
      state.setCurrent(null, state.context)
    }

  } else if (token.filter){
    var helper = state.getLocal(token.filter) || state.getGlobal(token.filter)
    if (typeof helper === 'function'){
      // function(input, args...)
      var values = state.getValues(token.args || [])
      var result = helper.apply(state.options, [state.currentItem].concat(values))
      state.setCurrent(null, result)
    } else {
      // fallback to old filters
      var filter = state.getFilter(token.filter)
      if (typeof filter === 'function'){
        var values = state.getValues(token.args || [])
        var result = filter.call(state.options, state.currentItem, {args: values, state: state, data: state.rootContext})
        state.setCurrent(null, result)
      }
    }
  } else if (token.deep){
    if (state.currentItem){
      var result = state.deepQuery(state.currentItem, token.deep, state.options)

      if (result){
        state.setCurrent(result.key, result.value)
        for (var i=0;i<result.parents.length;i++){
          state.currentParents.push(result.parents[i])
        }
      } else {
        state.setCurrent(null, null)
      }      

    } else {
      state.currentItem = null
    }
  }
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


function getLastParentObject(parents){
  for (var i=0;i<parents.length;i++){
    if (!(parents[i+1]) || !(parents[i+1].value instanceof Object)){
      return parents[i].value
    }
  }
}
