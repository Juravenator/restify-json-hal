var halCache = {};

module.exports = (server, options) => {
  options = options || {};
  options.prefix = options.prefix || "";
  options.makeObjects = options.makeObjects || false;

  var getHAL = require('./getHAL.js')(server, options);
  var makeAddLink = require('./addLink.js')(server, options);

  // override json formatter
  // add HAL data to body and then invoke normal json formatter
  var _formatJSON = server.formatters["application/json"];
  var halFormatter = (request, response, body, cb) => {
    // a response can have no body. (ex: 302 redirect)
    body && (body._links = request.hal);
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
      Object.assign(request.hal, halCache[url]);
    } else {
      request.hal = halCache[url].slice(0);
    }
    response.addLink = makeAddLink(request.hal, response);
    next();
  }
}
