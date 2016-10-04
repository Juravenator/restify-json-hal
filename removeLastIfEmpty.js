// removes the last element from a given array if it is an empty string
// used to make /api/call/ and /api/call equivalent
module.exports = array => {
  var lastItem = array[array.length-1];
  if (!lastItem || lastItem == "") {
    array.pop();
  }
  return array;
}
