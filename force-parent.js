module.exports = forceParent

function forceParent(query, value){
  var last = query.parents[query.parents.length - 1]
  var parentLast = query.parents[query.parents.length - 2]
  if (last){
    if (last.value){
      return last.value
    } else if (parentLast){
      parentLast.value[last.key] = value
      return value
    }
  }
}