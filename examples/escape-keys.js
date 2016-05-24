var JsonQuery = require('json-query');

var obj = {
  "x:y": 123,
  "z": {
    "a:b": 456
  }
};

var helpers = {
  get: function (input, key) {
    return input[key];
  }
};

var x = JsonQuery(":get(x:y)", {data: obj, locals: helpers}).value;
var y = JsonQuery("[z]:get(x:y)", {data: obj, locals: helpers}).value;
console.log(x, y);
