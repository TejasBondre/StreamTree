
/* Datastructure for storing chunks
*/

// location enum

/* Utility */
var LinkedListNode = function (next, previous, value) {
  // constructor
  // locking 
};

var StoreEntry = function (filename, chunk, llNode) {
  // constructor
  // concurrency-safety
};

StoreEntry.prototype.touch = function () {
  // last access vs last fetch
};

StoreEntry.prototype.free = function () {
  // locking status
};

StoreEntry.prototype.lock = function () {
  // locking status
};

var ChunkStore = module.exports.ChunkStore = function (capacity, address) {
  // construct a chunk store and return
};
// inherit event emitter

ChunkStore.prototype.getAllChunks = function () {
  // sync returns all the chunks {filename, chunk} objects
};

ChunkStore.prototype._generateChunkPath = function (filename, chunk) {
  // string concat
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

  // in memory cache MOST recently used
};

ChunkStore.prototype.trim = function () {
  // keep cache size under limit
  // this is gonna be one tough funciton
};

ChunkStore.prototype.free = function (filename, chunk) {
  // free given entry
  // garbage collector, please don't suck
};

ChunkStore.prototype.lock = function (filename, chunk) {
  // lock given entry
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
