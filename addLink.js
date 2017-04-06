var parseUrlDocs = require('./parseUrlDocs.js');
var cache = {};

module.exports = function addLinkInit(server, options) {
  var attachHALObj = require('./attachHALObj.js')(options);

  function findLink(method, urlWithoutQuery) {
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

  return function addLinkFactory(halContainer, response) {

    // this function is given to the developer
    return function addLink(method, url, customName) {
      method = method.toUpperCase();
      var urlWithoutQuery = url.indexOf("?") == -1 ? url : url.substring(0, url.indexOf("?"));
      cache[method] = cache[method] || {};

      if (!cache[method][urlWithoutQuery]) {
        var cacheEntry = findLink(method, urlWithoutQuery);
        if (cacheEntry) {
          cache[method][urlWithoutQuery] = cacheEntry;
        } else {
          console.error(`addLink.js: no match was found for ${method} ${urlWithoutQuery}`);
          return;
        }
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
