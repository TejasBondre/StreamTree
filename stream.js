'use strict';

var util = require('util')
  , events = require('events')
  , uuid = require('node-uuid')
  , Server = require('./server').Server
  ;

var BUFFER_SIZE_IN_CHUNKS = 10 // buffer size in chunks. good comment bro.
  , GETTIMEOUT = 3 // seconds we wait to connect a client
  , QUERYTIMEOUT = 1
  , RETRY_WAITTIME = 100
  , REQUERY_PERIOD = 10 // after how many chunks should we re-query?
  ;

var Stream = module.exports.Stream = function (filename, initialChunk, chunkStore, thisNode) {
  // Position is NEXT thing that is allowed to be read.
  // chunkCursor is the chunk __after__ the last one we have,
  //  __or______ the NEXT one we have to get.

  this.filename = filename;
  this.initialChunk = initialChunk;
  this.chunkCursor = initialChunk;
  this.position = initialChunk;
  this.thisNode = thisNode;

  this.chunkSource = null;
  this._chunkSourceIsMaster = false;
  this._chunkSourceStreamId = null;
  this._chunksFromSameSource = 0;

  this.chunkStore = chunkStore;

  this._positionCallbacks = {};

  // State to mutex advanceCursor* and friends.
  this._fillingBuffer = false;
  this.id = uuid.v4();

  this.lastAccess = (new Date()).valueOf();
  this.isDone = false;
  this.lastChunk = this.chunkCursor;

  this.on('positionAdvanced', this.checkWaitingCallbacks.bind(this));
  this.on('chunkCursorAdvanced', this.checkWaitingCallbacks.bind(this));
};
util.inherits(Stream, events.EventEmitter);

Stream.prototype.setSource = function (server) {
  // Reset source state and set to given server.
  this.chunkSource = server;
  this._chunkSourceIsMaster = false;
  this._chunkSourceStreamId = null;
  this._chunksFromSameSource = 0;
};

Stream.prototype._getChunkFromSource = function (source, filename, chunk, isMaster, streamId, callback) {
	// 

};


Stream.prototype.advanceCursor = function (callback) {
	//
};

// advance Cusror from source
// advance Cursor from Null source
// advance Cursor from candidate peers


Stream.prototype.fillBuffer = function () {
	//
};


Stream.prototype.variousCallbacks = function () {
	// register position callback
	//	// Registers a callback that will be called (and deleted!)
	//	// when:
	//	// - this.position === chunk AND
	//	// - this.chunkCursor > chunk
	
	// check waiting callback

};


Stream.prototype.advancePosition = function () {
	//
};

Stream.prototype.advanceChunkCursor = function () {
	//
};
