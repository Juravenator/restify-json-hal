var parseUrlDocs = require('./parseUrlDocs.js');
var cache = {};

module.exports = (server, options) => {
  var attachHALObj = require('./attachHALObj.js')(options);

  var findLink = (method, urlWithoutQuery) => {
    for (var i = 0; i < server.router.routes[method].length; i++) {
      var route = server.router.routes[method][i];
      if (route.path.exec(urlWithoutQuery)) {

        var halObj = {
          // caching is done without the url query part, so we don't put the url in the cache
          // href: options.prefix + url,
          rel: route.name,
          method: method
        };
        // if (route.path.restifyParams) {
        //   halObj.templated = true;
        // }
        parseUrlDocs({
          chain: server.routes[route.name],
          halObj: halObj,
          name: route.name
        });
        return halObj;
      }
    }
  }

  return (halContainer, response) => {

    // this function is given to the developer
    return (method, url, customName) => {
      method = method.toUpperCase();
      var urlWithoutQuery = url.indexOf("?") == -1 ? url : url.substring(0, url.indexOf("?"));
      cache[method] = cache[method] || {};

      if (!cache[method][urlWithoutQuery]) {
        cache[method][urlWithoutQuery] = findLink(method, urlWithoutQuery)
      }

      var result = cache[method][urlWithoutQuery];
      result.href = options.prefix + url;
      if (customName) {
        result.rel = customName;
      }
      attachHALObj(result, halContainer);
    }

  }

}
