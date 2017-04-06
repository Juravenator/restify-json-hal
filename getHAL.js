var parseUrlDocs = require('./parseUrlDocs.js');
var cleanRoutePieces = require('./cleanRoutePieces.js');
var urlMatches = require('./urlMatches.js');

module.exports = (server, options) => function getHAL(url) {
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

      // route is a regular expression
      if (path instanceof RegExp) {
        // to be a related resouce, it must be one level up
        // e.g. current path is '/' and resource is '/example'
        if (url[url.length-1] != "/") {
          var url = url + "/";
        }
        // we split the regex by the slash "/" characters it matches
        var regexPieces = path.toString().slice(1,-1).split("\\/").filter( piece => piece != "");
        // if there are no slashes, it might be a catch all regex, test for it
        if (regexPieces.length == 1) {
          if (path.exec(url+"/testifcatchallregex")) {
            matches.push({
              pathPieces: regexPieces,
              isRegex: true,
              route: route,
              method: method
            });
          }
        }
        // reassemble all but the last piece, it should match our current url
        // (or part of it, the tail can be a catch all)
        else {
          var prefixregex = new RegExp(regexPieces.slice(0,-1).join("\\/")+"/");
          var matched = prefixregex.exec(url);
          if (matched) {
            var rest = url.substring(matched[0].length);
            // if there is a rest, it must be matched by the last regexPiece
            if (!rest || ( rest && new RegExp(regexPieces[regexPieces.length-1]).exec(rest) )) {
              matches.push({
                pathPieces: regexPieces,
                isRegex: true,
                route: route,
                method: method
              });
            }
          }
        }
      }
      // route is a string
      else {
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
  }

  /*****************************************************************************
  * Make an array that will say whether or not the url piece needs to be static *
  *****************************************************************************/
  // the smallest match is the 'self' match
  // only the path pieces from 0 - self.length need to be evaluated for variables
  var stringMatches = matches.filter( match => !match.isRegex);
  var smallestPiecesLength = stringMatches.reduce( function smallestPiecesReducer(result, match) {
    match.realPathPieces = cleanRoutePieces(match.route.spec.path.split("/"));
    var l = match.realPathPieces.length;
    return l < result ? l : result;
  }, 9999);

  /*********************************************************************************
  * Now filter using the previously made list                                      *
  * Any match with a variable on a place that should be static is a false positive *
  *********************************************************************************/
  matches = matches.filter( function matchFilter(match) {
    if (!match.isRegex) {
      for (var i = 0; i < smallestPiecesLength; i++) {
        var piece = match.realPathPieces[i];
        let isStatic = piece[0] != ":";
        if (!isStatic) {
          return false;
        }
      }
    }
    return true;
  });

  /***************************************
  * Render json-HAL entry for each match *
  ***************************************/
  matches.forEach( function matchLoop(match) {
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
    if (match.isRegex) {
      halObj.href = options.prefix + new RegExp(match.pathPieces.slice(0,-1).join("/")).exec(url)[0] + "/" + match.pathPieces[match.pathPieces.length-1];
      // halObj.regex = match.pathPieces.join("/");
    }
    else {
      halObj.href = options.prefix + match.pathPieces.join("/");
    }
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
  });
  return result;
}
