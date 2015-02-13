'use strict';

/*
   Basic datastructure for a server encapsulation

   Gives a hook to a zerorpc client
*/

var zerorpc = require('zerorpc');

var Server = module.exports.Server = function (address, name) {
  this.address = address;
  this.name = name;
};

Server.prototype.getClient = function () {
	// - - - 
	// return client
};

Server.prototype.asSerializableObject = function() {
  return {name:this.name, address:this.address};
};
