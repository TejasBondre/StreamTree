
var Stream = module.exports.Stream = function (filename, initialChunk, chunkStore, thisNode) {
	// Position is NEXT thing that is allowed to be read.
	// 
};
util.inherits(Stream, events.EventEmitter);

Stream.prototype.setSource = function (server) {
	// Reset source state and set to given server.
	// 
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
