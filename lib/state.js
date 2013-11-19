module.exports = State

function State(options, params, handleQuery){
  if ( !(this instanceof State) ){
    return new State(options, params, handleQuery)
  }

  options = options || {}

  //this.options = options
  this.handleQuery = handleQuery
  this.options = options
  this.rootContext = firstNonNull(options.rootContext, options.context, options.source)
  this.parent = options.parent
  this.override = options.override
  this.filters = options.filters || {}
  this.params = params || options.params || []
  this.currentItem = firstNonNull(options.currentItem, options.source, options.context, options.rootContext)
  this.currentKey = null
  this.currentReferences = []
  this.currentParents = []
}

State.prototype = {
  
  // current manipulation
  setCurrent: function(key, value){
    if (this.currentItem || this.currentKey || this.currentParents.length>0){
      this.currentParents.push({key: this.currentKey, value: this.currentItem})
    }
    this.currentItem = value
    this.currentKey = key
  },

  resetCurrent: function(){
    this.currentItem = null
    this.currentKey = null
    this.currentParents = []
  },
  
  force: function(def){
    var parent = this.currentParents[this.currentParents.length-1]
    if (!this.currentItem && parent && (this.currentKey != null)){
      this.currentItem = def || {}
      parent.value[this.currentKey] = this.currentItem
    }
    return !!this.currentItem
  },
  
  getFilter: function(filterName){
    if (~filterName.indexOf('/')){
      var result = null
      var filterParts = filterName.split('/')

      for (var i=0;i<filterParts.length;i++){
        var part = filterParts[i]
        if (i == 0){
          result = this.filters[part]
        } else if (result && result[part]){
          result = result[part]
        }
      }

      return result
    } else {
      return this.filters[filterName]
    }
  },

  addReferences: function(references){
    if (references){
      references.forEach(this.addReference, this)
    }
  },
  
  addReference: function(ref){
    if (ref instanceof Object && !~this.currentReferences.indexOf(ref)){
      this.currentReferences.push(ref)
    }
  },

  // helper functions
  getValues: function(values, callback){
    return values.map(this.getValue, this)
  },

  getValue: function(value){
    if (value._param != null){
      return this.params[value._param]
    } else if (value._sub){
      
      var options = mergeClone(this.options, {
        force: null, currentItem: null
      })

      var result = this.handleQuery(value._sub, options, this.params)
      this.addReferences(result.references)
      return result.value

    } else {
      return value
    }
  },

  deepQuery: function(source, tokens, options, callback){
    var keys = Object.keys(source)

    for (var key in source){
      if (key in source){

        var options = mergeClone(this.options, {
          currentItem: source[key]
        })

        var result = this.handleQuery(tokens, options, this.params)

        if (result.value){
          return result
        }
      }
    }

    return null
  }

}

function firstNonNull(args){
  for (var i=0;i<arguments.length;i++){
    if (arguments[i] != null){
      return arguments[i]
    }
  }
}

function mergeClone(){
  var result = {}
  for (var i=0;i<arguments.length;i++){
    var obj = arguments[i]
    if (obj){
      Object.keys(obj).forEach(function(key){
        result[key] = obj[key]
      })
    }
  }
  return result
}