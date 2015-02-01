/*
Holds a bunch of streams
@author Tejas Bondre
*/


var StreamManager = module.exports.StreamManager = function (chunkStore, thisNode) {
  // constructor
};



StreamManager.prototype.get = function (filename, chunk, streamId) {
  // Returns a Stream.
  // streamId can be left out, in which case a NEW STREAM is returned
  // If streamId is included but the specified stream cannot be found, then return null
};
