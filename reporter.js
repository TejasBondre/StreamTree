/*
  listener of chunk store and router of chunks
*/

var Reporter = module.exports.Reporter = function (node, chunkStore, recipient) {
  // chunkStore is a ChunkStore
  // recipient is a Server
  // fromWhome is a Server

  // constructor
};

Reporter.prototype.sendReport = function (action) {
  // depending on where in hierarchy we are,
  // prepare a report 
  // and take action
};
