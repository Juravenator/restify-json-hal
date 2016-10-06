var parseUrlDocs = require('./parseUrlDocs.js');
var cleanRoutePieces = require('./cleanRoutePieces.js');
var urlMatches = require('./urlMatches.js');

module.exports = (server, options) => (url) => {
  var routes = server.router.routes;
  var routeChains = server.routes;
  var attachHALObj = require('./attachHALObj.js')(options);
  var result = options.makeObjects ? {} : [];
  var matches = [];
  var urlPieces = cleanRoutePieces(url.split("/"));

  // routes are grouped by method (GET, PUT, POST, DELETE, ...)
  for (var method in routes) {
    for (var i = 0; i < routes[method].length; i++) {
      var route = routes[method][i];

      // path as it was defined by the developer in server.get(<path>)
      var path = route.spec.path;

      // route might contain parameters
      // check piece by piece to deal with url parameters
      var pathPieces = cleanRoutePieces(path.split("/"));

      // check if this path should be added to the HAL response of this request
      if ( urlMatches(pathPieces, urlPieces) ) {
        matches.push({
          pathPieces: pathPieces,
          route: route,
          method: method
        });

      }
    }
  }

  /*****************************************************************************
  * Make an array that will say wether or not the url piece needs to be static *
  *****************************************************************************/
  var l = 9999;
  var isPieceStatic = [];
  for (var i = 0; i < matches.length; i++) {
    var match = matches[i];
    // redo match pieces
    // previously we replaced variables with the values to generate HAL links later on
    match.realPathPieces = cleanRoutePieces(match.route.spec.path.split("/"));
    if (match.realPathPieces.length < l) {
      l = match.realPathPieces.length;
    }
    for (var j = 0; j < l; j++) {
      var piece = match.realPathPieces[j];
      var isStatic = piece[0] != ":";
      if (isPieceStatic[j] == undefined || isPieceStatic[j] == false) {
        isPieceStatic[j] = isStatic;
      }
    }
  }

  /*********************************************************************************
  * Now filter using the previously made list                                      *
  * Any match with a variable on a place that should be static is a false positive *
  *********************************************************************************/
  var filtered_matches = [];
  for (var i = 0; i < matches.length; i++) {
    var match = matches[i];
    var ok = true;
    for (var j = 0; j < l; j++) {
      var piece = match.realPathPieces[j];
      var isStatic = piece[0] != ":";
      if (isPieceStatic[j] != isStatic) {
        ok = false;
      }
    }
    if (ok) {
      filtered_matches.push(match);
    }
  }
  matches = filtered_matches;

  /***************************************
  * Render json-HAL entry for each match *
  ***************************************/
  for (var i = 0; i < matches.length; i++) {
    var match = matches[i];

    var halObj = {}

    var name;
    if (urlPieces.length == match.pathPieces.length) {
      name = "self";
    } else {
      name = match.route.name;
      // rewrite trailing url parameter to URI Template
      // https://tools.ietf.org/html/rfc6570
      if (match.pathPieces[match.pathPieces.length-1].indexOf(":") > -1) {
        var piece = match.pathPieces[match.pathPieces.length-1].substring(1);
        match.pathPieces[match.pathPieces.length-1] = `{${piece}}`;
        halObj.templated = true;
      }
    }
    halObj.href = options.prefix + match.pathPieces.join("/");
    if (halObj.href == "") {
      halObj.href = "/";
    }

    // get the set of functions associated with this url call
    parseUrlDocs({
      chain: routeChains[match.route.name],
      halObj: halObj,
      name: name
    });

    halObj.method = match.method;

    attachHALObj(halObj, result);
  }
  return result;
}
