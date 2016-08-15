var comments = require('parse-comments');

var cache = {};
var urlPrefix = "";

module.exports = (server, options) => {
  options = options || {};
  urlPrefix = options.prefix || urlPrefix;


  // override json formatter
  // add HAL data to body and then invoke normal json formatter
  var _formatJSON = server.formatters["application/json"];
  var halFormatter = (request, response, body, cb) => {
    body._links = request.hal;
    return _formatJSON(request, response, body, cb);
  }
  server.acceptable.push('application/hal+json');
  server.formatters["application/hal+json"] = halFormatter;
  if (options.overrideJSON) {
    server.formatters["application/json"] = halFormatter;
  }


  // fires on every request
  // renders the HAL data and puts it in cache if not present already
  return (request, response, next) => {
    var url = request.url;
    var routes = server.router.routes;
    var routeChains = server.routes;

    if (!cache[url]) {
      cache[url] = getHAL(url, routes, routeChains);
    }
    request.hal = cache[url];
    next();
  }
}




var getHAL = (url, routes, routeChains) => {
  var result = [];

  // routes are grouped by method (GET, PUT, POST, DELETE, ...)
  for (var method in routes) {

    for (var i = 0; i < routes[method].length; i++) {
      var route = routes[method][i];

      // path as it was defined by the developer in server.get(<path>)
      var path = route.spec.path;

      // route might contain parameters
      // check piece by piece to deal with url parameters
      var urlPieces = removeLastIfEmpty(url.split("/"));
      var pathPieces = removeLastIfEmpty(path.split("/"));

      // check if this path should be added to the HAL response of this request
      if ( urlMatches(pathPieces, urlPieces) ) {
        var halObj = {}

        var name;
        if (urlPieces.length == pathPieces.length) {
          name = "self";
        } else {
          name = route.name;
          // rewrite trailing url parameter to URI Template
          // https://tools.ietf.org/html/rfc6570
          if (pathPieces[pathPieces.length-1].indexOf(":") > -1) {
            var piece = pathPieces[pathPieces.length-1].substring(1);
            pathPieces[pathPieces.length-1] = `{${piece}}`;
            halObj.templated = true;
          }
        }
        halObj.href = urlPrefix + pathPieces.join("/");
        if (halObj.href == "") {
          halObj.href = "/";
        }


        // get the set of functions associated with this url call
        var chain = routeChains[route.name];
        // check each of them for HAL documentation
        for (var z = 0; z < chain.length; z++) {
          // process the comments in the function code
          var code = comments(chain[z] + "");
          // go over each comment block
          for (var j = 0; j < code.length; j++) {
            var piece = code[j];
            // we only process it if the description starts with `HAL: `
            if (piece.description && piece.description.substring(0,5) == "HAL: ") {
              piece.description = piece.description.substring(5);
              // override the name if set
              if (piece.name && name != "self") {
                name = piece.name;
              }
              // set the type
              halObj.type = piece.type;
              // set the deprecation flag
              halObj.deprecation = piece.deprecated;
              // profile refers to a validation document
              // value must be a URL
              if (piece.returns && piece.returns[0]) {
                halObj.profile = piece.returns[0].description;
              }
              // title, used by client UI's to know what to put in a button or something
              halObj.title = piece.alias;
              // description is not in the JSON-HAL spec, but it's useful
              halObj.description = piece.description;
              // JSON-HAL doesn't specify a way to document parameters
              // URI Templates do though
              if (piece.params) {
                halObj.templated = true;

                halObj.href += "{?";
                for (var a = 0; a < piece.params.length; a++) {
                  var param = piece.params[a];
                  halObj.href += param.name || param.description;
                  if (a != piece.params.length-1) {
                    halObj.href += ",";
                  }
                }
                halObj.href += "}";

              }
            }
          }
        }
        halObj.rel = name;
        result.push(halObj);


      }
    }


  }
  return result;
}

var removeLastIfEmpty = array => {
  var lastItem = array[array.length-1];
  if (!lastItem || lastItem == "") {
    array.pop();
  }
  return array;
}

var urlMatches = (pathPieces, urlPieces) => {
  if (pathPieces.length < urlPieces.length || pathPieces.length > urlPieces.length + 1) {
    // this path is shorter than our url -> no match
    // or
    // this path is at least 2 parts longer -> not a related resource
    return false;
  } else {
    for (var j = 0; j < urlPieces.length; j++) {
      if (pathPieces[j].indexOf(":") > -1) {
        // url parameter, assume it matches
        // replace the :paramname with the actually used value
        pathPieces[j] = urlPieces[j];
      } else if (pathPieces[j] != urlPieces[j]) {
        return false;
      }
    }
  }
  return true;
};
