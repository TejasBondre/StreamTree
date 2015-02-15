'use strict';

/* This is how data gets out of the system */

var childProcess = require('child_process')
  , zerorpc = require('zerorpc')
  ;

// Open up a child processs (vlc) and start streaming to its stdout

var VideoStreamer = function (getInterval, source, filename) {
  this.getInterval = parseInt(getInterval, 10);
  this.source = source;
  this.filename = filename;

  this.chunk = 0;
  this.streamId = null;

  //console.log(source);
  this.rpcClient = new zerorpc.Client();
  this.rpcClient.connect(source);
};

VideoStreamer.prototype.start = function () {
  // spawn a new VLC player instance
};

VideoStreamer.prototype._spawnVlc = function (ready) {
  // OS dependent
  // gotta google this
};

VideoStreamer.prototype._shutdown = function () {
  // again OS dependent (probably)
  // google this
};

VideoStreamer.prototype._writeOne = function () {
  // 
};
