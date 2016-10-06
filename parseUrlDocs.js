var comments = require('parse-comments');

module.exports = ({chain, halObj, name}) => {
  // check each of the functions in the url chain for HAL documentation
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
          halObj.rel = piece.name;
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
        if (piece.params && halObj.href && halObj.href.indexOf("?") == -1) {
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
    halObj.rel = halObj.rel || name;

  }

}
