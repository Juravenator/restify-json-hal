module.exports = (pathPieces, urlPieces) => {
  if (pathPieces.length < urlPieces.length) {
    // this path is shorter than our url -> no match
    return false;
  } else if(pathPieces.length > urlPieces.length + 1) {
    // this path is at least 2 parts longer -> not a related resource
    return false
  } else {
    for (var i = 0; i < urlPieces.length; i++) {
      if (pathPieces[i][0] == ":") {
        // variable found
        // replace the variable with the actual name
        // so our HAL links will not contain variables
        pathPieces[i] = urlPieces[i];
      } else if (pathPieces[i] != urlPieces[i]) {
        return false;
      }
    }
  }
  return true;
};
