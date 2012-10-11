/*global Class, MozWebSocket, BISON, Network */
var Client = Class(function() {

    this._isBinary = false;
    this._socket = null;

    this._actionIds = [];
    this._actionData = {};

    this._randomSeed = 0;
    this._randomState = 0;

}, {

    $VERSION: '0.1',

    /**
      * {Boolean|Null} Connects with the server at (@host {String} : @port {Number})
      *
      * Returns:
      *
      * - `false` in the case that there is already an open connection.
      * - `null` in the case that WebSockets aren't supported.
      */
    connect: function(host, port) {

        // Figure out which object to use
        var ws = typeof WebSocket !== 'undefined' ? WebSocket : MozWebSocket;

        // Setup the socket
        // If the connection get's rejected, this won't throw but instead
        // call `onclose()`
        try {
            this._socket = new ws('ws://' + host + (port !== undefined ? ':' + port : ''));
            this._isBinary = typeof ArrayBuffer !== 'undefined' && typeof this._socket.binaryType !== 'undefined';
            if (this._isBinary) {
                this._socket.binaryType = 'arraybuffer';
            }

        } catch(e) {
            return null;
        }

        // Setup event handlers, also send intial message
        var that = this;
        this._socket.onopen = function() {
            that.send(Network.Server.CONNECT, [Client.$VERSION, that._isBinary]);
            that.onConnectionOpen();
        };

        this._socket.onmessage = function(msg) {

            var data = msg.data;
            if (msg.data instanceof ArrayBuffer) {
                var bytes = new Uint8Array(msg.data);
                data = String.fromCharCode.apply(null, bytes);
            }

            msg = BISON.decode(data);
            that._message(msg[0], msg[1]);

        };

        this._socket.onclose = function(msg) {
            that.onConnectionClose(!msg.wasClean, msg.code);
        };

        return true;

    },

    /**
      * {Boolean} Disconnects the client from the server it's currently connected to.
      *
      * Returns `false` in case there is no server to disconnect from.
      */
    disconnect: function() {

        if (!this.isConnected()) {
            return false;

        } else {
            this._socket.close();
            this._socket = null;
            return true;
        }

    },

    /**
      * {Boolean} Whether the client is currently connected to any server or not.
      */
    isConnected: function() {
        return !!this._socket;
    },

    /**
      * {Float} Returns a synced random number between `0` and `1`.
      *
      * Note: The sync happens each time a "ACCEPT" is received from the server.
      */
    getRandom: function() {
        this._randomState = (1103515245 * (this._randomState + this._randomSeed) + 12345) % 0x100000000;
        return this._randomState / 0x100000000;
    },

    send: function(type, data) {

        if (data === undefined) {
            data = null;
        }

        console.log('sending:', type, data);
        var encoded = BISON.encode([type, data]);
        if (this._isBinary) {

            var len = encoded.length,
                bytes = new Uint8Array(len);

            for(var i = 0; i < len; i++) {
                bytes[i] = encoded.charCodeAt(i);
            }

            encoded = bytes.buffer;

        }

        this._socket.send(encoded);

    },


    // Abstract Methods -------------------------------------------------------
    onConnectionOpen: function() {
        console.log('network connection opened');
    },

    onConnectionClose: function() {
        console.log('network connection closed');
    },

    onConnected: function(remoteId) {
        console.log('connected as', remoteId);
        this.send(Network.Room.JOIN, 'foo');
    },

    onRoomJoin: function(roomId) {
        console.log('joined room', roomId);
    },

    onRoomLeave: function(roomId) {
        console.log('left room', roomId);
    },

    onRoomList: function(rooms) {
        console.log('room list', rooms);
    },

    onRemotesList: function(remotes) {
        console.log('remote list', remotes);
    },

    performAction: function(data) {
        console.log('run action', data);
    },

    verifyAction: function(data, callback) {
        console.log('verify action', data);
        return true;
    },


    // Internals --------------------------------------------------------------
    _message: function(type, data) {

        var that = this;
        switch(type) {

            case Network.Action.ADD:
                this._actionIds.push(data[0]);
                this._actionData[data[0]] = data[1];

                if (this.verifyAction(data[1])) {
                    this.send(Network.Action.ACCEPT, data[0]);

                } else {
                    this.send(Network.Action.REJECT, data[0]);
                }
                break;

            case Network.Action.ACCEPT:
            case Network.Action.REJECT:

                var id = data;
                data = this._actionData[id];

                this._actionIds.splice(this._actionIds.indexOf(id), 1);
                delete this._actionData[id];

                if (type === Network.Action.ACCEPT) {
                    ++this._randomState;
                    this.performAction(data);
                    this.send(Network.Action.COMPLETE, id);
                }
                break;

            default:
                console.log('msg: ', type, data);
                break;
        }

    }

});


var client = new Client();
client.connect('localhost', 4000);

