var Class = require('../lib/Class').Class,
    Network = require('../lib/Network').Network,
    Logger = require('./Logger'),
    BISON = require('../lib/bison');


var User = Class(function(server, conn) {

    this._id = ++User.$uid;
    this._server = server;
    this._conn = conn;

    this._isBinary = false;
    this._isConnected = false;

    this._channel = null;
    this._lobby = null;
    this._game = null;

}, Logger, {

    $uid: Math.floor(Math.random() * 67182),

    getId: function() {
        return this._id;
    },

    setChannel: function(channel) {
        this._channel = channel;
    },

    getChannel: function(channel) {
        return this._channel;
    },

    setLobby: function(lobby) {
        this._lobby = lobby;
    },

    getLobby: function(lobby) {
        return this._lobby;
    },

    setGame: function(game) {
        this._game = game;
    },

    getGame: function(game) {
        return this._game;
    },

    // ------------------------------------------------------------------------
    error: function(msg, data) {
        this.log('error', msg, data);
        this.send(Network.Server.ERROR, [msg, data]);
    },

    send: function(type, data) {
        if (data === undefined) {
            data = null;
        }
        this._conn.send(BISON.encode([type, data]), this._isBinary);
    },

    connect: function(server, binary) {

        this._isBinary = binary;
        this._isConnected = true;
        this._server = server;
        this._server.addUser(this);
        this.log('connected');

    },

    disconnect: function() {

        this._isConnected = false;

        if (this.getChannel()) {
            this.getChannel().removeUser(this, true);
        }

        if (this.getLobby()) {
            this.getLobby().removeUser(this, true);
        }

        if (this.getGame()) {
            this.getGame().removeUser(this, true);
        }

        this._server.removeUser(this);
        this._server = null;
        this._conn.close();
        this.log('disconnected');

    },

    isConnected: function() {
        return this._isConnected;
    },

    toLog: function() {
        return '[User ' + this._id + ']';
    }

});

module.exports = User;

