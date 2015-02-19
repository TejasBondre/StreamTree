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


if (require.main === module) {
  var Server = require('./server').Server;
  

  var cd = new ChunkDirectory();

  cd.on('inserted', function (s) {
    console.log('inserted', s.filename, s.chunk, 'on', s.server.name);
  });

  cd.on('deleted', function (s) {
    console.log('deleted', s.filename, s.chunk, 'on', s.server.name);
  });

  cd.on('serverRemoved', function (s) {
    console.log('removed server', s.name);
  });

  var s1 = new Server('inproc://foo1', 's1');
  var s2 = new Server('inproc://foo2', 's2');

  var f1 = 'file1';
  var f2 = 'file2';
  cd.insert(f1, 1, s1);
  cd.insert(f1, 1, s2);
  cd.insert(f2, 1, s1);
  cd.insert(f1, 1, s1);
  cd.insert(f1, 1, s1);
  cd.insert(f1, 1, s1);
  console.log('servers that have f1-1', cd.getServers(f1, 1));

  cd.remove(f1, 1, s1);
  cd.insert(f1, 1, s1);
  console.log('servers that have f1-1', cd.getServers(f1, 1));
  console.log('servers that have f2-1', cd.getServers(f2, 1));
  cd.removeServer(s1);
  console.log('servers that have f1-1', cd.getServers(f1, 1));
  console.log('servers that have f2-1', cd.getServers(f2, 1));
  
}
