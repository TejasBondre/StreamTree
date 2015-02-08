/* Database for all videos! */


var VideoDatabase = module.exports.VideoDatabase = function (directory) {
  // Path to a diectory containing video chunk data base
  //
  // directory
  //    |
  //    + manifest.json
  //    + movie1
  //        \
  //        + 0.chunk
  //        + 1.chunk
  //        ...
  //        + n.chunk

  // Load the manifest information.

};

VideoDatabase.prototype._loadManifest = function () {
  // calculate manifest's path 
  // and load it from that path
};

VideoDatabase.prototype.get = function (filename, chunk, callback) {
  // if video found, call back
  // handle cases when video not found
};
