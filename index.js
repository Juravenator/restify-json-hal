var halCache = {};

module.exports = (server, options) => {
  var getHAL = require('./getHAL.js')(server, options);
  options = options || {};
  options.prefix = options.prefix || "";
  options.makeObjects = options.makeObjects || false;

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
    var method = request.method;
    var url = request.url;

    if (!halCache[url]) {
      halCache[url] = getHAL(url);
    }
    // clone the cached object
    // the developer can add custom links, and if we pass this object by reference
    // this will (accidentally) get into the cache
    if (options.makeObjects) {
      request.hal = {};
      var cache = halCache[url];
      for (var name in cache) {
        request.hal[name] = cache[name];
      }
    } else {
      request.hal = halCache[url].slice(0);
    }
    next();
  }
}
