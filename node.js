'use strict';

var zerorpc = require('zerorpc')
  , ChildTracker = require('./child_tracker').ChildTracker
  , Server = require('./server').Server
  , ChunkDirectory = require('./chunk_directory').ChunkDirectory
  , ChunkStore = require('./chunk_store').ChunkStore
  , Reporter = require('./reporter').Reporter
  , Stream = require('./stream').Stream
  , StreamManager = require('./stream_manager').StreamManager
  , VideoDatabase = require('./video_database').VideoDatabase
  , shuffle = require('./shuffle')
  ;

var RETRY_MASTER_INTERVAL = 100
  , CHUNK_STORE_CAPACITY = 50
  ;

var Node = module.exports.Node = function (options) {
	// generic node constructor 
	if (options.master) {
		// master constructor

		// check for super master too
		if (options.supermaster) {
			//
		}


	} else {
		// video database
	}

};

Node.prototype.start = function () {
	//
};

Node.prototype.registerWithMaster = function(chunks) {
	// add new node to network
};

Node.prototype.handleMasterFailure = function() {
	// fall back to super master
};

Node.prototype.attemptContactMaster = function() {
	// keep attempting to contact
};

Node.prototype._setupRpcServer = function () {
	// initialize ZeroRPC js
};

Node.prototype.handleGet = function () {
	// if this is the master - something
	// if this has some master - something

	// handle if stream is null
	// handle is this is a peer
	// think up diverse fault-tolerance scenarios
};


Node.prototype.handleReport = function () {
	// the report protocol

	// acknowledgement
	// ok
	// not ok
	// child is here
	// child is not here
	// new additions
};

Node.prototype.handleRegister = function () {
	// the register protocol
};


Node.prototype.handleQuery = function (chunk) {
	// the query for chunk
};

