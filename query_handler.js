var standardTokenHandler = require('./standard_token_handler')

module.exports.createController = function(options){

  var filters = options.filters || {}
  
  var controller = {
        
    // push each token in
    push: function(token, callback){
      
      // set up / revert handlers
      controller.currentHandler = controller.nextHandler || standardTokenHandler
      controller.nextHandler = standardTokenHandler
      
      controller.currentHandler(token, controller, callback)
    },
    
    // call when done
    end: function(callback){
      
      // push a blank token into the controller to flush anything remaining out
      controller.push(null, function(err){ if (!err){
        
        // resolve references (the last item on the tree that is an object that could be bound to)
        if (currentItem instanceof Object){
          addReference(currentItem)
        } else if (currentParents.length > 0){
          addReference(currentParents[currentParents.length-1].value)
        }
        callback(null, {value: controller.currentItem, key: controller.currentKey, references: controller.currentReferences, parents: controller.currentParents})
      
      } else{callback(err)}})
    },
    
    // state
    options: options,
    rootContext: options.rootContext,
    filters: options.filters || {},
    currentItem: options.currentItem || options.context,
    currentKey: null,
    currentReferences: [],
    currentParents: [],
    nextHandler: standardTokenHandler
  }
  
  // current manipulation
  controller.setCurrent = function(key, value){
    if (currentItem || currentKey || currentParents.length>0){
      currentParents.push({key: currentKey, value: currentItem})
    }
    currentItem = value
    currentKey = key
  }
  controller.resetCurrent = function(){
    controller.currentItem = null
    controller.currentKey = null
    controller.currentParents = []
  }
  controller.force = function(def){
    var parent = controller.currentParents[currentParents.length-1]
    if (!controller.currentItem && parent && (controller.currentKey != null)){
      controller.currentItem = def || {}
      parent.value[controller.currentKey] = controller.currentItem
    }
    return !!controller.currentItem
  }

  // helper functions
  controller.handleValues = function(values, callback){
    asyncMap(values, controller.handleValue, callback)
  }
  controller.handleValue = function(value, callback){
    if (value._param != null){
      callback(null, options.params[value._param]) 
    } else if (value._sub){
      module.exports.process(value._sub, optionsWithoutForce(options), function(err, result){
        callback()
      })
      addReferences(result.references)
      return result.value
    } else {
      return value
    }
  }

  return controller
}

module.exports.process = function(tokens, options, callback){
  
  var controller = module.exports.createController(options)
  var id = -1
    , ended = false
    
  function end(err){
    ended = true
    if (!err){
      controller.end(callback)
    } else {
      callback(err)
    }
  }
    
  function nextToken(err, endNow){
    if (!ended){
      if (!err){
        id += 1
        if (id < tokens.length && !endNow){
          handleToken(tokens[id])
        } else {
          end()
        }
      } else {end(err)}
    }
  }
  
  function handleToken(token){
    controller.push(token, nextToken)
  }
  
  nextToken()
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