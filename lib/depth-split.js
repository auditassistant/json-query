module.exports = depthSplit

function depthSplit (text, delimiter, opts) {
  var max = opts && opts.max || Infinity
  var includeDelimiters = opts && opts.includeDelimiters || false

  var depth = 0
  var start = 0
  var result = []
  var zones = []

  text.replace(/([\[\(\{])|([\]\)\}])/g, function (current, open, close, offset) {
    if (open) {
      if (depth === 0) {
        zones.push([start, offset])
      }
      depth += 1
    } else if (close) {
      depth -= 1
      if (depth === 0) {
        start = offset + current.length
      }
    }
  })

  if (depth === 0 && start < text.length) {
    zones.push([start, text.length])
  }

  start = 0

  for (var i = 0; i < zones.length && max > 0; i++) {
    for (
      var pos = zones[i][0], match = delimiter.exec(text.slice(pos, zones[i][1]));
      match && max > 1;
      pos += match.index + match[0].length, start = pos, match = delimiter.exec(text.slice(pos, zones[i][1]))
    ) {
      result.push(text.slice(start, match.index + pos))
      if (includeDelimiters) {
        result.push(match[0])
      }
      max -= 1
    }
  }

  if (start < text.length) {
    result.push(text.slice(start))
  }

  return result
}
