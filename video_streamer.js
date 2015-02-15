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
  this._spawnVlc();
  this._writeOne();
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
  this.rpcClient.invoke('get', this.filename, this.chunk, true, this.streamId, function (err, data) {
    if (err) {
      throw new Error(err);
    }
    if (data.data === false) {
      // EOF.
      //this.vlc.wait();
    } else {
      console.log('Got chunk', this.chunk, data.data.substring(0,100));
      this.vlc.stdin.write(new Buffer(data.data, 'base64'));
      this.streamId = data.streamId;
      this.chunk++;
      setTimeout(this._writeOne.bind(this), this.getInterval);
    }
  }.bind(this));
};