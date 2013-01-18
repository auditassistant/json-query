module.exports = function(token, controller, done){
  // controller: setCurrent, getValue, getValues, resetCurrent, deepQuery, rootContext, currentItem, currentKey, options, filters
  

  
  if (token == null){
    // process end of query
    
    if (!controller.currentItem && controller.options.force){
      controller.force(controller.options.force)
    }
    
    done()
  } else if (token.get){
    
    controller.getValue(token.get, function(err, key){
      if (!err){
        
        if (controller.currentItem || (controller.options.force && controller.force({}))){
          controller.setCurrent(key, controller.currentItem[key])
        } else {
          controller.setCurrent(key, null)
        }
        
        done()
      } else {done(err)}
    })
    
  } else if (token.select){
    
    if (Array.isArray(controller.currentItem) || (controller.options.force && controller.force([]))){
      
      controller.getValues(token.select, function(err, values){
        if (!err){
          
          var result = selectWithKey(controller.currentItem, values[0], values[1])
          controller.setCurrent(result[0], result[1])
          done()
          
        } else {done(err)}
      })
      
    } else {
      controller.setCurrent(null, null)
      done()
    }
    
  } else if (token.root){
    
    controller.resetCurrent()
    controller.setCurrent(null, controller.options.rootContext)
    done()
    
  }else if (token.parent){
    
    controller.resetCurrent()
    controller.setCurrent(null, controller.options.parent)
    done()
    
  } else if (token.or){

    if (controller.currentItem){
      done(null, true) // break
    } else {
      controller.resetCurrent()
      controller.setCurrent(null, controller.options.context)
      done()
    }

  } else if (token.filter){
    
    if (controller.filters[token.filter]){
      controller.getValues(token.args || [], function(err, values){ if (!err){
        
        var result = controller.filters[token.filter](controller.currentItem, {args: values, options: controller.options, references: controller.currentReferences})
        controller.setCurrent(null, result)
        done()
        
      }else{done(err)}})
    } else {
      done()
    }

  } else if (token.deep){

    if (controller.currentItem){

      controller.deepQuery(controller.currentItem, token.deep, controller.options, function(err, result){
        if (!err){
          if (result){
            controller.setCurrent(result.key, result.value)
            result.parents.forEach(function(parent){
              controller.currentParents.push(parent)
            })
          } else {
            controller.setCurrent(null, null)
          }
          done()
        } else {done(err)}
      })
      
    } else {
      controller.currentItem = null
      done()
    }

  } else {
    
    done()
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