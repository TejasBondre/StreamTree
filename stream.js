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
  var client = source.getClient({
      timeout: GETTIMEOUT
    })
    , callbackCalled = false
    ;

  client.invoke('get', filename, chunk, isMaster, streamId, function (err, res) {
    client.close();
    if (!callbackCalled) {
      callbackCalled = true;
      if (err) {
        console.log('Stream', this.id, 'Error getting chunk from source' + source.name + ':' + source.address, err);
        return callback(err);
      } else {
        return callback(null, res);
      }
    }
  }.bind(this));
};


Stream.prototype.advanceCursor = function (callback) {
  if (this.isDone) {
    console.log('Advncing chunk at EOF');
    this.advanceChunkCursor();
    return callback(null, true);
  }
  // Get next chunk, from some server.
  /// Will callback with (err Err, advanced bool)
  if (this.chunkStore.has(this.filename, this.chunkCursor)) {
    // Great. Chunk store has it already
    // Then Lock it.
    this.chunkStore.lock(this.filename, this.chunkCursor);
    console.log('Stream', this.id, 'advanced chunk from chunkStore');
    // Then move.
    this.advanceChunkCursor();
    return setImmediate(function () {
      callback(null, true);
    });
 }

  if (this._chunksFromSameSource >= REQUERY_PERIOD) {
    // Just set chunk cursor to null;
    this.setSource(null);
  }


  if (this.chunkSource === null) {
    this.advanceCursorFromNullSource(callback);
  } else {
    // I have a chunk source, but it might not have my chunk :<
    this.advanceCursorFromSource(function(err, advanced) {
      if (advanced) {
        return callback(null, true);
      } else {
        this.setSource(null);
        return this.advanceCursorFromNullSource(callback);
      }
    }.bind(this));
  }
};

Stream.prototype.advanceCursorFromSource = function (callback) {
	//
};

Stream.prototype.advanceCursorFromNullSource = function (callback) {
	//
};

Stream.prototype.advanceCursorFromPossiblePeers = function (possiblePeers, callback) {
	//
};


Stream.prototype.fillBuffer = function () {
	 // Moves the buffer forward, if nothing else is.
  if (this._fillingBuffer) {
    // Someone else in on the JOB.
    // Stop being a whiteknight.
    return false;
  } else {
    this._fillingBuffer = true;
  }

  var step = function () {
    if ((this.chunkCursor - this.position) > BUFFER_SIZE_IN_CHUNKS) {
      // Great. We're done here.
      this._fillingBuffer = false; 
    } else {
      this.advanceCursor(function (err, advanced) {
        if (err) {
          throw new Error(err); // BLOW UP. TODO: DONT BLOW UP.
        } else if (advanced) {
          // Recurse.
          console.log('Advanced cursor position to', this.chunkCursor);
          step();
        } else {
          throw new Error('Failed to advance.');
        }
      }.bind(this));
    }
  }.bind(this);
  step();
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
  if (this.chunkStore.has(this.filename, this.position)) {
    this.chunkStore.free(this.filename, this.position);
  }
  this.position++;
  this.fillBuffer();
  this.emit('positionAdvanced');
};

Stream.prototype.advanceChunkCursor = function () {
  this.chunkCursor++;
  console.log('advanced position cursor', this.chunkCursor);
  this.emit('chunkCursorAdvanced');
};
