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
  console.log('Sending register to master', this.master.address);
  var client = this.master.getClient();
  client.invoke('register', this.name, this.address, chunks, function (err, response) {
    client.close();
  });
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

Node.prototype.handleGet = function (filename, chunk, fromChild, streamId, reply) {


  if (!this.hasMaster) {
    console.log('Serving get for', filename, chunk);
    if (this.videoDatabase) {
      return this.videoDatabase.get(filename, chunk, function (err, data) {
        reply(err, {data:data, streamId: null});
      });
    } else {
      var data = filename + ':' + chunk;
      if (chunk >= 1000) {
        return reply(null, {data:false, streamId:null});
      }
      return reply(null, {data:data, streamId: null});
    }
  }

  console.log('GET: ', filename, ':', chunk, fromChild, streamId);
  if (fromChild) {
    console.log('Serving get from child', filename, ':', chunk);

    // TODO what if stream is null
    var stream = this.streamManager.get(filename, chunk, streamId);
    //if (stream.isDone) {
    //  reply(null, {data:false, streamId:null});
    //}

    if (chunk < stream.position) {
      return reply('Chunk requested for file', filename, ':', chunk, 'is less than stream', streamId, 'position', stream.position);
    }

    if (stream.isDone && chunk > stream.lastChunk) {
      return reply(null, {data:false, streamId:stream.id});
    }

    var registered = stream.registerPositionCallback(chunk, function () {
      console.log('REGISTERED CALLBCK');
      var data;
      if (stream.isDone && chunk >= stream.lastChunk) {
        data = false;
      } else {
        data = this.chunkStore.get(filename, chunk);
      }
      stream.advancePosition();
      reply(null, {data:data, streamId: stream.id});
      
    }.bind(this));
    if (!registered) {
      // Then the callback to registerPositionCallback will NOT
      // be called, so we're not calling reply twice.
      reply('Already Waiting for', filename, ':', chunk, ' stop sending duplicates');
    }

  } else {
    // It's a peer, so just give what we have. Perform our best.
    reply(null, {data:this.chunkStore.get(filename, chunk), streamId: null});
  }
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

if (require.main === module) {
  var argv = require('optimist')
    .demand(['port', 'name', 'ip'])
    .describe('master', 'optionally specify master')
    .describe('supermaster', 'optionally specify your masters master')
    .describe('videodatabase', 'specificy directory to use as video database for masterless nodes')
    .describe('chunkdirectory', 'where do i keep my chunk cache?')
    .argv
    , n = new Node({
      name: argv.name
    , port: argv.port
    , master: argv.master
    , supermaster: argv.supermaster
    , videodatabase: argv.videodatabase
    , chunkdirectory: argv.chunkdirectory
    , ip: argv.ip
    })
    ;

  n.start();
}
