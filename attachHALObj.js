module.exports = options => (halObj, container) => {
  if (options.makeObjects) {
    // _links is an object
    var name = halObj.rel;
    delete halObj.rel;
    container[name] = halObj;
  } else {
    // _links is an array
    container.push(halObj);
  }
}
