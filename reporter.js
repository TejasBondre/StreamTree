'use strict';

/*
  listener of chunk store and router of chunks
*/


var Reporter = module.exports.Reporter = function (node, chunkStore, recipient, fromWhom) {
  // chunkStore is a ChunkStore
  // recipient is a Server
  // fromWhome is a Server
  this.chunkStore = chunkStore;
  this.recipient = recipient;
  this.fromWhom = fromWhom;
  this.node = node;
  this.chunkStore.on('addedData', this.sendReport.bind(this, 'ADDED'));
  this.chunkStore.on('deletedData', this.sendReport.bind(this, 'DELETED'));
};

Reporter.prototype.sendReport = function (action) {
  // depending on where in hierarchy we are,
  // prepare a report 
  // and take action
};
