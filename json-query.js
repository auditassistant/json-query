// TODO: maybe rewrite controller as prototype to make more efficient

var queryTokenizer = require('./query_tokenizer')
  , standardTokenHandler = require('./standard_token_handler')

module.exports = function(query, options){
  
  options = cloneOptions(options || {})
  
  // extract params for ['test[param=?]', 'value'] type queries
  if (Array.isArray(query)){
    options.params = query.slice(1)
    query = query[0]
  }
  
  // set up context vars
  options.rootContext = options.rootContext || options.context
  options.context = options.context != null ? options.context : options.rootContext
  options.params = options.params || []
  options.dynamic = false
  
  var tokens = queryTokenizer(query, true)
  
  // non async version... well sort of...  
  var result = null
  module.exports.process(tokens, options, function(err, res){
    result = res
  })
  
  return result
}

module.exports.dynamic = function(query, options, callback){
  // allows functions to be in the context which will be executed asynchronously to obtain value or set the next handler.
  
  if (Array.isArray(query)){
    options.params = query.slice(1)
    query = query[0]
  }
  options.rootContext = options.rootContext || options.context
  options.context = options.context || options.rootContext
  options.params = options.params || []
  options.dynamic = true
  
  var tokens = queryTokenizer(query, true)
  
  // async version
  module.exports.process(tokens, options, callback)
}


module.exports.process = function(tokens, options, callback){
  var controller = module.exports.createController(options)
  asyncEach(tokens, function(token, next){
    // backs out early if need be with cb(null, true)
    controller.push(token, function(e,d){
      next(e,d)
    })
  }, function(err){ 
    if (!err){
      controller.end(callback)
    } else {
      callback(err)
    }
  })
}

module.exports.createController = function(options){
  
  var controller = {
        
    // push each token in
    push: function(token, callback){
      if (options.dynamic){        
        // set up / revert handlers and handle async values
        controller.currentHandler = controller.nextHandler || standardTokenHandler
        controller.nextHandler = standardTokenHandler
        
        controller.currentHandler(token, controller, function(err, isDone){
          if (!err && typeof controller.currentItem == 'function'){
            controller.currentItem(controller, function(err, value){
              controller.currentItem = value
              callback(err, isDone)
            })
          } else {
            // pass thru
            callback(err, isDone)
          }
        })
        
      } else {
        // while this is written async style, the standardTokenHandler will never break out of a tight loop, making it ok to use synchronously.
        standardTokenHandler(token, controller, callback)
      }
    },
    
    // call when done
    end: function(callback){
      // push a blank token into the controller to flush anything remaining out
      controller.push(null, function(err){ if (!err){
        // resolve references (the last item on the tree that is an object that could be bound to)
        if (controller.currentItem instanceof Object){
          controller.addReference(controller.currentItem)
        } else {
          var parentObject = getLastParentObject(controller.currentParents)
          if (parentObject){
            controller.addReference(parentObject)
          }
        }
        callback(null, {value: controller.currentItem, key: controller.currentKey, references: controller.currentReferences, parents: controller.currentParents})
      
      } else{callback(err)}})
    },
    
    // state
    options: options,
    rootContext: options.rootContext,
    parent: options.parent,
    override: options.override,
    filters: options.filters || {},
    currentItem: options.currentItem || options.context,
    currentKey: null,
    currentReferences: [],
    currentParents: [],
    nextHandler: standardTokenHandler
  }
  
  // current manipulation
  controller.setCurrent = function(key, value){
    if (controller.currentItem || controller.currentKey || controller.currentParents.length>0){
      controller.currentParents.push({key: controller.currentKey, value: controller.currentItem})
    }
    controller.currentItem = value
    controller.currentKey = key
  }
  controller.resetCurrent = function(){
    controller.currentItem = null
    controller.currentKey = null
    controller.currentParents = []
  }
  controller.force = function(def){
    var parent = controller.currentParents[controller.currentParents.length-1]
    if (!controller.currentItem && parent && (controller.currentKey != null)){
      controller.currentItem = def || {}
      parent.value[controller.currentKey] = controller.currentItem
    }
    return !!controller.currentItem
  }
  controller.getFilter = function(filterName){
    if (~filterName.indexOf('/')){
      var result = null
      filterName.split('/').forEach(function(part, i){
        if (i == 0){
          result = controller.filters[part]
        } else if (result && result[part]){
          result = result[part]
        }
      })
      return result
    } else {
      return controller.filters[filterName]
    }
  }
  controller.addReferences = function(references){
    if (references){
      references.forEach(controller.addReference)
    }
  }
  controller.addReference = function(ref){
    if (ref instanceof Object && !~controller.currentReferences.indexOf(ref)){
      controller.currentReferences.push(ref)
    }
  }

  // helper functions
  controller.getValues = function(values, callback){
    asyncMap(values, controller.getValue, callback)
  }
  controller.getValue = function(value, callback){
    if (value._param != null){
      callback(null, options.params[value._param])
    } else if (value._sub){
      
      module.exports.process(value._sub, optionsWithoutForceAndResetCurrent(options), function(err, result){ if (!err){
        controller.addReferences(result.references)
        callback(null, result.value)
      } else {callback(err)}})
      
    } else {
      callback(null, value)
    }
  }
  controller.deepQuery = function(source, tokens, options, callback){
    var keys = Object.keys(source)
    asyncEach(keys, function(key, next){
      var item = source[key]
      module.exports.process(tokens, optionsWithItem(options, item), function(err, result){
        if (!err){
          if (result.value){
            callback(null, result) // no more iterating, just return result direct!
          } else {
            next()
          }
        } else {next(err)}
      })
    }, function(err){
      callback(err, null) // nothing found, return null or error 
    })
  }

  return controller
}

module.exports.lastParent = function(query){
  var last = query.parents[query.parents.length - 1]
  if (last){
    return last.value
  } else {
    return null
  }
}

function getLastParentObject(parents){
  for (var i=0;i<parents.length;i++){
    if (!(parents[i+1]) || !(parents[i+1].value instanceof Object)){
      return parents[i].value
    }
  }
}

function optionsWithoutForceAndResetCurrent(options, item){
  return {
    currentItem: options.context,
    context: options.context,
    parent: options.parent,
    rootContext: options.rootContext,
    override: options.override,
    params: options.params,
    filters: options.filters,
    dynamic: options.dynamic
  }
}

function optionsWithItem(options, item){
  return {
    currentItem: item,
    context: options.context,
    rootContext: options.rootContext,
    override: options.override,
    parent: options.parent,
    params: options.params,
    filters: options.filters,
    force: options.force,
    dynamic: options.dynamic
  }
}

function cloneOptions(options){
  return {
    currentItem: options.currentItem,
    context: options.context,
    rootContext: options.rootContext,
    override: options.override,
    parent: options.parent,
    params: options.params,
    filters: options.filters,
    force: options.force,
    dynamic: options.dynamic

  }
}

function asyncMap(collection, mapFunc, callback){
  var results = []
    , id = -1
    , ended = false
  function end(err){
    ended = true
    if (!err){
      callback(null, results)
    } else {callback(err)}
  }
  function next(err, result, endNow){
    if (id >= 0){
      results[id] = result
    }
    if (!ended){
      if (!err){
        id += 1
        if (id < collection.length && !endNow){
          mapFunc(collection[id], next)
        } else {
          end()
        }
      } else {end(err)}
    }
  }
  next()
}

function asyncEach(collection, iterator, callback){
  var id = -1
    , ended = false
  function end(err){
    ended = true
    if (!err){
      callback()
    } else {callback(err)}
  }
  function next(err, endNow){
    if (!ended){
      if (!err){
        id += 1
        if (id < collection.length && !endNow){
          iterator(collection[id], next)
        } else {          
          end()
        }
      } else {end(err)}
    }
  }
  next()
}