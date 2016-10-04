var getHAL = require('./getHAL.js');
var cache = {};

module.exports = (server, options) => {
  options = options || {};
  urlPrefix = options.prefix || "";
  makeObjects = options.makeObjects || false;

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
    var routes = server.router.routes;
    var routeChains = server.routes;

    if (!cache[url]) {
      cache[url] = getHAL(url, routes, routeChains, makeObjects, urlPrefix);
    }
    request.hal = cache[url];
    next();
  }
}
