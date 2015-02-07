
/* This is how data gets out of the system */

// Open up a child processs (VLC media player) and start streaming to its stdout

var VideoStreamer = function (getInterval, source, filename) {
  // constructor
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
