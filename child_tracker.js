/*
   Keeps track of children using heartbeat.
*/

// So we'll notice within HEARTBEAT_TIMEOUT + PING_INTERVAL seconds.
// risk of false death is low.

var ChildTracker = module.exports.ChildTracker = function (options) {
  // constructor
};
// inherits event emitter obviously

ChildTracker.prototype.add = function (server) {
  // Adds a server to track. Should ping this server
  // until it is dead, at which point emit a 'childgone' event.
};

ChildTracker.prototype.getChild = function (serverName) {
  // Returns the Server object if we have it, or null;
};

ChildTracker.prototype.hasChild = function (serverName) {
  // return if server has child (anymore)
};

ChildTracker.prototype._ping = function (server) {
  // ping server to check if alive or dead
};

ChildTracker.prototype._serverDead = function (server) {
  // remove it from the tracking
  // and emit an event
};