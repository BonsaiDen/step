var Class = require('../lib/Class').Class,
    WebSocketServer = require('../lib/WebSocket'),
    BISON = require('../lib/bison'),
    List = require('./List'),
    User = require('./User'),
    Logger = require('./Logger'),
    Channel = require('./Channel'),
    Lobby = require('./Lobby'),
    Network = require('../lib/Network').Network,
    NetworkError = require('../lib/Network').NetworkError;


var Server = Class(function(port) {

    this._channels = new List(this, 'Channels');
    this._users = new List(this, 'Users');
    this._lobbies = new List(this, 'Lobbies');
    this._games = new List(this, 'Games');

    new Channel(this, 'main');
    new Channel(this, 'other');

    this._init(port);

}, Logger, {

    $VERSION: '0.1',

    addUser: function(user) {
        if (this._users.add(user)) {
            user.send(Network.Server.CONNECT, user.getId());
            user.send(Network.Server.CHANNELS, this.getChannelMap());
        }
    },

    removeUser: function(user) {
        if (this._users.remove(user)) {
            user.send(Network.Server.DISCONNECT);
        }
    },

    addChannel: function(channel) {
        if (this._channels.add(channel)) {
            this.send(Network.Server.CHANNELS, this.getChannelMap());
        }
    },

    removeChannel: function(channel) {
        if (this._channels.remove(channel)) {
            this.send(Network.Server.CHANNELS, this.getChannelMap());
        }
    },

    addLobby: function(lobby) {
        this._lobbies.add(lobby);
    },

    removeLobby: function(lobby) {
        this._lobbies.remove(lobby);
    },

    addGame: function(game) {
        this._games.add(game);
    },

    removeGame: function(game) {
        this._games.remove(game);
    },

    getUserById: function(id) {
        return this._users.getById(id);
    },

    getChannelById: function(id) {
        return this._channels.getById(id);
    },

    getChannelMap: function() {

        var map = {};
        this._channels.each(function(channel) {
            map[channel.getId()] = channel.getName();
        });

        return map;

    },

    getLobbyById: function(id) {
        return this._lobbies.getById(id);
    },

    getGameById: function(id) {
        return this._games.getById(id);
    },

    send: function(type, data) {
        this._users.each(function(user) {
            user.send(type, data);
        });
    },

    message: function(user, type, data) {

        this.log('user message', user, type, data);

        var lobby = user.getLobby(),
            channel = user.getChannel(),
            game = user.getGame();

        if (game) {
            this.gameMessage(game, user, type, data)
            && game.actionMessage(user, type, data)
            && this.baseMessage(user, type, data)
            && this.invalidMessage(user, type, data);

        } else if (lobby) {
            this.lobbyMessage(lobby, user, type, data)
            && lobby.actionMessage(user, type, data)
            && this.baseMessage(user, type, data)
            && this.invalidMessage(user, type, data);

        } else if (channel) {
            this.channelMessage(channel, user, type, data)
            && this.globalMessage(user, type, data)
            && this.baseMessage(user, type, data)
            && this.invalidMessage(user, type, data);

        } else {
            this.globalMessage(user, type, data)
            && this.baseMessage(user, type, data)
            && this.invalidMessage(user, type, data);
        }

    },

    globalMessage: function(user, type, data) {

        if (type === Network.Channel.JOIN) {

            if (!this.validID(data)) {
                user.error(NetworkError.Channel.INVALID_ID, data);

            } else {

                var channel = this.getChannelById(data);
                if (channel) {
                    channel.addUser(user);

                } else {
                    user.error(NetworkError.Channel.NOT_FOUND, data);
                }

            }

        } else if (type === Network.Lobby.OPEN) {

            if (user.getLobby()) {
                user.error(NetworkError.Lobby.PENDING, user.getLobby.getId());

            } else {
                new Lobby(this, user).addUser(user);
            }

        } else if (type === Network.Lobby.JOIN) {

            if (!this.validID(data)) {
                user.error(NetworkError.Lobby.INVALID_ID, data);

            } else {

                var lobby = this.getLobbyById(data);
                if (lobby) {
                    lobby.addUser(user);

                } else {
                    user.error(NetworkError.Lobby.NOT_FOUND, data);
                }

            }

        } else {
            return true;
        }

    },

    channelMessage: function(channel, user, type, data) {

        if (type === Network.Chat.MESSAGE) {

            if (!this.validMessage(data)) {
                user.error(NetworkError.Chat.INVALID_MESSAGE);

            } else {
                channel.send(Network.Chat.MESSAGE, [user.getId(), data]);
            }

        } else if (type === Network.Channel.LEAVE) {
            channel.removeUser(user);

        } else {
            return true;
        }

    },

    lobbyMessage: function(lobby, user, type, data) {

        if (type === Network.Chat.MESSAGE) {

            if (!this.validMessage(data)) {
                user.error(NetworkError.Chat.INVALID_MESSAGE);

            } else {
                lobby.send(Network.Chat.MESSAGE, [user.getId(), data]);
            }

        } else if (type === Network.Lobby.READY) {
            lobby.setUserReady(user);

        } else if (type === Network.Lobby.NOT_READY) {
            lobby.setUserNotReady(user);

        } else if (type === Network.Lobby.CLOSE) {
            lobby.closeByUser(user);

        } else if (type === Network.Lobby.LEAVE) {
            lobby.removeUser(user);

        } else {
            return true;
        }

    },

    gameMessage: function(game, user, type, data) {

        if (type === Network.Chat.MESSAGE) {

            if (!this.validMessage(data)) {
                user.error(NetworkError.Chat.INVALID_MESSAGE);

            } else {
                game.send(Network.Chat.MESSAGE, [user.getId(), data]);
            }

        } else if (type === Network.Game.LEAVE) {
            game.removeUser(user);

        } else {
            return true;
        }

    },

    baseMessage: function(user, type, data) {

        if (type === Network.Chat.SEND) {

            if (!this.validID(data[0])) {
                user.error(NetworkError.User.INVALID_ID, data[0]);

            } else {

                var to = this.getUserById(data[0]);
                if (to) {

                    if (!this.validMessage(data[1])) {
                        user.error(NetworkError.Chat.INVALID_MESSAGE);

                    } else {
                        user.send(Network.Chat.SEND, [to.getId(), data[1]]);
                        to.send(Network.Chat.RECEIVE, [user.getId(), data[1]]);
                    }

                } else {
                    user.error(NetworkError.User.NOT_FOUND, data[0]);
                }

            }

        } else if (type === Network.Server.DISCONNECT) {
            user.disconnect();

        } else {
            return true;
        }

    },

    invalidMessage: function(user, type, data) {
        user.error(NetworkError.Server.UNKNOWN_COMMAND, [type, data]);
    },

    validID: function(id) {
        return typeof id === 'number' && !isNaN(id) && (id | 0) === id;
    },

    validMessage: function(string) {
        return typeof string === 'string' && string.length <= 255;
    },

    toLog: function() {
        return '[Server ' + this._users.length + ' user(s)]';
    },


    // ========================================================================
    _init: function(port) {

        var that = this;
        this._server = new WebSocketServer(2048);
        this._server.on('connection', function(conn) {
            that._connection(conn);
        });

        this._server.listen(port);

    },

    _connection: function(conn) {

        var user = new User(this, conn),
            that = this;

        conn.on('data', function(data, isBinary) {
            that._connectioData(user, data, isBinary);
        });

        conn.on('end', function() {
            that._connectionClose(user);
        });

    },

    _connectioData: function(user, data, isBinary) {

        var msg;
        try {
            msg = BISON.decode(data);

        } catch(e) {
            return user.error(NetworkError.Server.INVALID_MESSAGE, true);
        }

        // Basic message check
        if (!msg || msg.length !== 2 || !(msg instanceof Array)) {
            user.error(NetworkError.Server.INVALID_MESSAGE);
            user.disconnect();

        // Wait for Network.CONNECT message
        } else if (!user.isConnected()) {

            if (msg[0] === Network.Server.CONNECT && msg[1].length === 2 && (msg[1] instanceof Array)) {

                if (msg[1][0] === Server.$VERSION) {

                    if (typeof msg[1][1] === 'boolean') {
                        if (msg[1][1] && !isBinary) {
                            user.error(NetworkError.Server.INVALID_MESSAGE);
                            user.disconnect();

                        } else {
                            user.connect(this, msg[1][1]);
                        }

                    } else {
                        user.error(NetworkError.Server.INVALID_MESSAGE);
                        user.disconnect();
                    }

                } else {
                    user.error(NetworkError.Server.WRONG_VERSION);
                    user.disconnect();
                }

            } else {
                user.error(NetworkError.Server.INVALID_MESSAGE);
                user.disconnect();
            }

        // Handle all other messages
        } else {
            this.message(user, msg[0], msg[1]);
        }

    },

    _connectionClose: function(user) {
        if (user.isConnected()) {
            user.disconnect();
        }
    }

});

module.exports = Server;

