/*
  Datastructure from mapping what servers have which filename:chunk pairs.
*/

var ChunkDirectory = module.exports.ChunkDirectory = function () {
  // constructor
};
// inherits event emitter, obviously

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

