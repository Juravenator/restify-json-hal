// removes the last element from a given array if it is an empty string or a query parameter
// used to make /api/call/ and /api/call equivalent
module.exports = array => {
  var lastItem = array[array.length-1];
  if (!lastItem || lastItem == "") {
    array.pop();
  } else if (lastItem.indexOf("?") > -1) {
    array[array.length-1] = lastItem.substring(0, lastItem.indexOf("?"));
  }
  return array;
}
