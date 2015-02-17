'use strict';
/* Database for all videos! */

var path = require('path')
  , fs = require('fs')
  ;

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

  this.directory = directory;

  // Load the manifest information.
  this._loadManifest();

};

VideoDatabase.prototype._loadManifest = function () {
  var manifestPath = './' + path.join(this.directory, 'manifest.json');
  this.manifest = require(manifestPath);
};

VideoDatabase.prototype.get = function (filename, chunk, callback) {
  // if video found, call back
  // handle cases when video not found
};


if (require.main === module) {
  var argv = require('optimist').demand(['directory', 'filename']).argv
    , vd = new VideoDatabase(argv.directory)
    ;

  // Now write a file to stdout until completion.
  var chunk = 0
    , writeOne = function () {
        vd.get(argv.filename, chunk, function (err, data) {
          if (err) {
            throw new Error(err);
          }
          if (data === false) {
            // fine, we're done.
          } else {
            process.stdout.write(data);
            chunk++;
            setImmediate(writeOne);
          }
        });
    }
    ;
  writeOne();
}
