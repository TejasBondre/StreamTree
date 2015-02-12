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
  this.port = options.port;
  this.name = options.name;
  this.address = 'tcp://' + options.ip + ':' + this.port;
  

  this._setupRpcServer();

  this.childTracker = new ChildTracker();
  this.ChunkDirectory = new ChunkDirectory();

  this.hasSuperMaster = false;
  this.isOnSuper = false;
  if (options.master) {
    this.chunkStore = new ChunkStore(CHUNK_STORE_CAPACITY, options.chunkdirectory);
    this.master = new Server(options.master, 'master');
    this.backup = this.master; // so we d on't llose the reference to master.
    this.reporter = new Reporter(this, this.chunkStore, this.master, this);
    this.registerWithMaster(this.chunkStore.getAllChunks());

    this.streamManager = new StreamManager(this.chunkStore, this);
    this.streamManager.on('masterTimedout', this.handleMasterFailure.bind(this));

    this.hasMaster = true;
    //check for higher master
    //right now passing in a backup master. 
    //ideally each node would know whole network topology
    if (options.supermaster) {
      this.hasSuperMaster = true;
      this.superMaster = new Server(options.supermaster, 'supermaster'); 
    }


  } else {
    this.hasMaster = false;
    if (options.videodatabase) {
      // create one.
      this.videoDatabase = new VideoDatabase(options.videodatabase);
    } else {
      this.videoDatabase = null;
    }
  }

  this.childTracker.on('serverStillAlive', function (c) {
    console.log('Still alive: ', c);
  });
  
  this.childTracker.on('childgone', function (c) {
    console.log('Child Dead: ', c);
    this.ChunkDirectory.removeServer(c.name);
  }.bind(this));

  setInterval(this.attemptContactMaster.bind(this), RETRY_MASTER_INTERVAL);
};


Node.prototype.start = function () {
  this._server.bind('tcp://0.0.0.0:' + this.port);
  console.log('Node started on ' + this.port);
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
  this._server = new zerorpc.Server({
    get: this.handleGet.bind(this)
  , report: this.handleReport.bind(this)
  , register: this.handleRegister.bind(this)
  , query: this.handleQuery.bind(this)
  , ping:  function (r) { r(); }
  });
  this._server.on('error', console.log.bind(console));
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


Node.prototype.handleReport = function (report, reply) {
	// the report protocol

	// acknowledgement
	// ok
	// not ok
	// child is here
	// child is not here
	// new additions

  console.log('Got report:', report);
  if (!this.childTracker.hasChild(report.from)) {
    //TODO: handle this better
    return reply('child not here', 'nok');
  }

  if (report.action === 'ADDED') {
    this.ChunkDirectory.insert(report.filename, report.chunk, report.from);
  } else if ( report.action === 'DELETED') {
    this.ChunkDirectory.remove(report.filename, report.chunk, report.from);
  } else {
    //WHAT?
    throw new Error('Unexpected report action: ' + report.action);
  }
  reply(null, 'ok');
};

Node.prototype.handleRegister = function (peername, peeraddress, peerchunks, reply) {
  console.log('Got register from', peername, peeraddress, peerchunks);
  var s = new Server(peeraddress, peername)
    , added = this.childTracker.add(s)
    ;
  if (! added) { // then we already had this child.. flap!
    this.ChunkDirectory.removeServer(peername);
    console.log('Child flapped');
  }
  var i
    , chunk
    ;
  for (i = 0; i<peerchunks.length; i++) {
    chunk = peerchunks[i];
    this.ChunkDirectory.insert(chunk.filename, chunk.chunk, peername);
  }

  console.log('Added child? ', added);
  
  reply(null, 'ok');
};

Node.prototype.handleQuery = function (filename, chunk, reply) {
  var serverNames = this.ChunkDirectory.getServers(filename, chunk)
    , servers = []
    ;
  serverNames.forEach(function(serverName) {
    servers.push(this.childTracker.getChild(serverName).asSerializableObject());
  }.bind(this));
  shuffle(servers);
  console.log('Serving query for ', filename, chunk, servers);
  reply(null, servers);
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
