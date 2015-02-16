'use strict';

/*
   Datastructure for storing chunks, or anything
   that needs to be indexed by filename:chunk

   Probably a thin wrapping around a hash table.

    - Used by a peer to track actual chunk data
    - Used by the master maybe as part of the chunk_directory
      data structure to track the presence of a chunk?
*/


var events = require('events')
  , util = require('util')
  , fs = require('fs')
  , path = require('path')
  , LRU = require('lru-cache')
  ;

// location enum
var LOCATION_CACHE = 0 //'inside the inner cache'
  , LOCATION_PENDING = 1 //'removed from inner cache, write pending'
  , LOCATION_DISK = 2 //'inside the disk'
  , LOCATION_NONE = -1
  ;

/* Utility */
var LinkedListNode = function (next, previous, value) {
  this.next = next;
  this.previous = previous;
  this.value = value;
  this.locked = true; // cannot be deleted yet;
};

var StoreEntry = function (filename, chunk, llNode) {
  this.filename = filename;
  this.chunk = chunk;
  this.llNode = llNode;
  this.lastUsed = (new Date()).valueOf();

  this.persisted = false;
  this.deleted = false;
  this.chunkPath = null;
  this.location = LOCATION_NONE;
};

StoreEntry.prototype.touch = function () {
  this.lastUsed = (new Date()).valueOf();
};

StoreEntry.prototype.free = function () {
  this.llNode.locked = false;
};

StoreEntry.prototype.lock = function () {
  this.llNode.locked = true;
};

var ChunkStore = module.exports.ChunkStore = function (capacity, directory) {

  this.chunks = {};
  this.count = 0;
  this.capacity = capacity;
  this.hotCacheSize = 5;
  this.directory = directory;

  this.hotCache = LRU({
    max: this.hotCacheSize
  , dispose: this.handleHotCacheEvict.bind(this)
  }); 
  this.pendingWriteChunks = {}; // pending store.
  this.sequenceNumber = 0; // for uniqueness on file writes
  this.pendingDeletes = [];

  this.lru = null; // linked list nodes
  this.mru = null; // linked list nodes

  this._loadDatastructure(); // load from disk if we can.

  setInterval(this.sync.bind(this), 1000); // too fast.
};
util.inherits(ChunkStore, events.EventEmitter);


ChunkStore.prototype.getAllChunks = function () {
  // sync returns all the chunks {filename, chunk} objects
  var chunks = []
    , fc
    , entry
    ;
  for (fc in this.chunks) {
    entry = this.chunks[fc];
    if (this.chunks.hasOwnProperty(fc)) {
      chunks.push({
        filename: entry.filename
      , chunk: entry.chunk
      });
    }
  }
  return chunks;
};

ChunkStore.prototype._getKey = function (filename, chunk) {
  return filename + ':' + chunk;
};

ChunkStore.prototype._generateChunkPath = function (filename, chunk) {
  var chunkPath = filename + ':' + chunk + ':' + this.sequenceNumber + '.chunk';
  this.sequenceNumber++;
  return path.join(this.directory, chunkPath);
};

ChunkStore.prototype.add = function (filename, chunk, data) {
  /*
  on put,
     shove it into the in-memory cache
     start writing it to disk
     once its written,
       mark it as persisted
       if it is present in the `pending` dictionary, remove it
        and update that items location
  */
  if (this.has(filename, chunk)) {
    // Because chunks immutable, we can just touch it.
    this.touch(filename, chunk);
  } else {
    var fc = this._getKey(filename, chunk);
    // Ok. create a node.
    var node = new LinkedListNode(null, null, fc)
      , entry = new StoreEntry(filename, chunk, node)
      ;

    if (this.mru === null) {
      // Then this.lru is null as well...
      this.mru = this.lru = node;
    } else {
      node.next = this.mru;
      this.mru.previous = node;
      this.mru = node;
    }

    this.hotCache.set(fc, data);
    entry.location = LOCATION_CACHE;
    this.chunks[fc] = entry;

    this.writeChunk(filename, chunk, data, function (err, chunkPath) {
      // Ok, now we can persist it.
      if (err) {
        // TODO what do we do?
        // explode for now...
        throw err;
      }
      entry.chunkPath = chunkPath;
      entry.persisted = true;
      // Check if it is in the pendingWriteChunks, delete if so,
      // and flip its location to disk
      if (this.pendingWriteChunks.hasOwnProperty(fc)) {
        // That means that the location is LOCATION_PENDING
        // by deleting it, we set location to LOCATION_DISK
        // assertion
        if (entry.location !== LOCATION_PENDING) {
          throw new Error('Found ' + fc + ' in pendingWriteChunks, but its location is' + entry.location);
        }
        delete this.pendingWriteChunks[fc];
        entry.location = LOCATION_DISK;
      }
    }.bind(this));
    this.count++;
  }

  // TODO should we still do this if we just touched?
  this.emit('addedData', {'filename':filename,'chunk':chunk,'data':data});

  this.trim();
};

ChunkStore.prototype.trim = function () {
  // keep cache size under limit
  // this is gonna be one tough funciton
};

ChunkStore.prototype.free = function (filename, chunk) {
  if (!this.has(filename, chunk)) {
    throw new Error('Attempting to free what we dont have! ' + filename + ':' + chunk);
  }
  var fc = this._getKey(filename, chunk)
    , entry = this.chunks[fc]
    ;
  entry.free();
  this.trim();
};

ChunkStore.prototype.lock = function (filename, chunk) {
  if (!this.has(filename, chunk)) {
    throw new Error('Attempting to lock what we dont have! ' + filename + ':' + chunk);
  }
  var fc = this._getKey(filename, chunk)
    , entry = this.chunks[fc]
    ;
  entry.lock();
};

ChunkStore.prototype.get = function(filename, chunk) {
  /*
  on get,
     check where it is (CACHE, PENDING, DISK), get it,
     and put it in the cache, updating position accordingly
     if it is on DISK, read it,
        put it in cache, and set location to CACHE
     if it is in CACHE, get it.
     if it is in PENDING, get it,
        __delete it from pending__
        put it in cache, and set location to CACHE.
  */
};

ChunkStore.prototype.has = function (filename, chunk) {

};

ChunkStore.prototype.touch = function (filename, chunk) {
  // careful with the concurrency here
};

ChunkStore.prototype.lruListToString = function () {
  // outputs LRU list as string;
};

ChunkStore.prototype.handleHotCacheEvict = function (fc, data) {
  /*
   on eviction from the in-memory cache,
     if it is not persisted, put it in the pending dictionary,
       set LOCATION_PENDING
       it will be removed when the write finishes,
     otherwise, if it is persisted, set LOCATION_DISK.
  */
};

ChunkStore.prototype.writeChunk = function (filename, chunk, callback) {
  // write chunk and call callback. simple.
};

ChunkStore.prototype.readChunk = function (chunkPath) {
  // asynchronous read of chunk. ASYNC!!
};


ChunkStore.prototype.sync = function () {
  /*
   on sync,
      first write out our data structure, for all entries `persisted`.
      then, delete what is in our delete queue.
  */
};

ChunkStore.prototype._writeOutDatastructure = function () { 
  // write manifesto
};

ChunkStore.prototype._doDeletes = function (entries) {
  // check if entry currently used
  // handle locks
  // delete safely
};

ChunkStore.prototype._loadDatastructure = function () {
  // Loads from this.directory/manifest.json if we have one.
  // then checks that for everything in the manifest,
  // we have that chunk on disk. then, assume it is good,
  // and build the lru queue and in-memory location stuff.

  // loading lru and mru can be done in another funciton called from here
};

}
