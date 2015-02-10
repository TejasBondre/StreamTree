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

Stream.prototype.advanceCursorFromPossiblePeers = function (possiblePeers, callback) {
  if (possiblePeers.length === 0) {
    // Then we're out of options,
    return callback(null, false);
  } else {
    // Try one.
    var nextPeer = possiblePeers.shift();
    if (nextPeer.name === this.thisNode.name) {
      // Short circuit recurse.
      return this.advanceCursorFromPossiblePeers(possiblePeers, callback);
    }

    this.setSource(nextPeer);
    this.advanceCursorFromSource(function(err, advanced) {
      if (advanced) {
        // Hurray. Nothing more do to,
        return callback(null, true);
      } else {
        // Fuck either there was an error, or the other person
        // didn't have it. TODO: distinguish these cases?
        // for now, MOVE ON.
        this.advanceCursorFromPossiblePeers(possiblePeers, callback);
      }
    }.bind(this));
  }
};

Stream.prototype.advanceCursorFromSource = function (callback) {
  if (!this.chunkSource) {
    throw new Error('WHAT ARE YOU DOING');
  }

  this._getChunkFromSource(
    this.chunkSource
  , this.filename
  , this.chunkCursor
  , this._chunkSourceIsMaster
  , this._chunkSourceStreamId
  , function (err, response) {
    if (err) {
      return callback(err, false);
    }
    
    if (response.data === false) {
      console.log('Stream', this.id, 'has reached EOF');
      this.isDone = true;
      console.log('SETTING last', this.chunkCursor);
      this.lastChunk = this.chunkCursor;
      this.advanceChunkCursor();
      return callback(null, true);
    }

    if (response.data === null) {
      console.log('Stream', this.id, 'failed to advance chunk from', this.chunkSource.name);
      return callback(null, false);
    }
    console.log('Stream', this.id, 'advanced chunk from', this.chunkSource.name);
    this.chunkStore.add(this.filename, this.chunkCursor, response.data);
    this.advanceChunkCursor();
    this._chunkSourceStreamId = response.streamId;
    this._chunksFromSameSource++;
    return callback(null, true);
  }.bind(this));
};

Stream.prototype.advanceCursorFromNullSource = function (callback) {
  // Then I need to find one.
  var client = this.thisNode.master.getClient({
    timeout : QUERYTIMEOUT
  });
  client.invoke('query', this.filename, this.chunkCursor, function (err, serializedPossiblePeers) {
    client.close();
    // Convert the raw {name: 'name', address: 'address'} peer list into a list of Servers
    if (err) {
      this.emit('masterTimedout');
      console.log('Stream ', this.id, ' error calling query on master', err);
      return setTimeout(this.advanceCursor.bind(this, callback), RETRY_WAITTIME);
    }
    var possiblePeers = []
      , peerString = ':'
      ;
    serializedPossiblePeers.forEach(function (s) {
      peerString += s.name + ':';
      possiblePeers.push(new Server(s.address, s.name));
    });
    console.log('Stream', this.id, 'response to query result>', peerString);

    if (err) {
      return callback(err);
    }
    this.advanceCursorFromPossiblePeers(possiblePeers, function (err, advanced) {
      if (err) {
        return callback(err);
      }

      if (advanced) {
        return callback(null, true);
      } else {
        // Fallback to master.
        // and need to resort to the master.
        // Dont need to check if the master has it,
        // because the master ALWAYS has it. :D
        // TODO handle error
        this.setSource(this.thisNode.master);
        this._chunkSourceIsMaster = true;
        this.advanceCursorFromSource(function(err, advanced){
          if (err) {
            this.emit('masterTimedout');
            return setTimeout(this.advanceCursor.bind(this, callback), RETRY_WAITTIME);
          } else { // assume always advance?
            callback(err, advanced);
          }
        }.bind(this));
      }
    }.bind(this));
  }.bind(this));
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

Stream.prototype.registerPositionCallback = function (chunk, callback) {
  // Registers a callback that will be called (and deleted!)
  // when:
  // - this.position === chunk AND
  // - this.chunkCursor > chunk
  //
  // returns true  if successfully stored
  // returns false if not, probably because something else is
  console.log('registered', chunk);

  if (this._positionCallbacks.hasOwnProperty(chunk)) {
    return false;
  } else {
    this._positionCallbacks[chunk] = callback;
    setImmediate(this.checkWaitingCallbacks.bind(this));
    return true;
  }
};

Stream.prototype.checkWaitingCallbacks = function () {
  // Checks the conditions are such that we 
  // can call a callback! If so, will delete it and call it.
  //
  // - get callback, if any, at position.
  // - check if k > our position.
  console.log('position', this.position);
  console.log('position cursor', this.chunkCursor);
  if (this._positionCallbacks.hasOwnProperty(this.position)) {
    if (this.chunkCursor > this.position) {
      // Great. Get it and delete it.
      var callback = this._positionCallbacks[this.position];
      delete this._positionCallbacks[this.position];
      callback();
    } else {
      // Too bad. This will be called again onChunkCursorIncrement,
      // so maybe then things will be ready.
    }
  } else {
    // Do nothing. Users cannot skip.
  }
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
