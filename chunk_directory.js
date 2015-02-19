'use strict';

/*
  Datastructure from mapping what servers have which filename:chunk pairs.
  Used by a master; updated in response to server reports, registers, and deaths.

  `server` in all these is a Server datastructure
*/


var events = require('events')
  , util = require('util')
  ;

var ChunkDirectory = module.exports.ChunkDirectory = function () {
  this.fcDirectory = {}; // fc : [s1, s2, s3...]
  this.servers = {}; // server : [fc1, fc2,..]; used to avoid walking the fcDirectory 
};
util.inherits(ChunkDirectory, events.EventEmitter);

ChunkDirectory.prototype.insert = function (filename, chunk, server) {
  // insert new filename + chunk at this server
};

ChunkDirectory.prototype.remove = function (filename, chunk, server) {
  // Removes association of this filename / chunk with the server
};

ChunkDirectory.prototype.getServers = function (filename, chunk) {
  // return this fc directory
};

ChunkDirectory.prototype.removeServer = function (server) {
  // remove entire server, all entries, everything
};

