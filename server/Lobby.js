var Class = require('../lib/Class').Class,
    UserContainer = require('./UserContainer'),
    List = require('./List'),
    Game = require('./Game'),
    ActionManager = require('./ActionManager'),
    Network = require('../lib/Network').Network,
    NetworkError = require('../lib/Network').NetworkError;

var Lobby = Class(function(parent, user, maxUsers) {

    this._settings = {};
    this._channel = user.getChannel();
    this._creator = user;

    this._ready = new List(this, 'Ready');
    this._isStarting = false;
    this._isClosing = false;

    this._actionManager = new ActionManager(this);

    UserContainer(this, parent, '', maxUsers);
    this.getParent().addLobby(this);

}, UserContainer, {

    isStarting: function() {
        return this._isStarting;
    },

    startGame: function() {

        if (this._isStarting) {
            return false;
        }

        this._isStarting = true;

        var countdown = 4,
            that = this;

        that.send(Network.Lobby.STARTING, that.getId());

        function count() {

            if (that.isEmpty()) {
                return;
            }

            countdown--;
            that.send(Network.Lobby.COUNTDOWN, [that.getId(), countdown]);

            if (countdown === 0) {

                var channel = that._channel;
                that._channel = null;

                that.getParent().addGame(new Game(that, channel, that._settings));
                that._isStarting = false;
                that.close();

            } else {
                setTimeout(count, 1000);
            }

        }

        count();
        return true;

    },

    actionMessage: function(user, type, data) {

        if (this._isStarting) {
            user.error(NetworkError.Lobby.PENDING);
            return true;

        } else {
            return this._actionManager.message(user, type, data);
        }

    },

    setUserReady: function(user) {

        if (this.isStarting()) {
            user.error(NetworkError.Lobby.PENDING);

        } else if (this._ready.add(user)) {
            this.send(Network.Lobby.READY, user.getId());

            if (this._ready.length === this._users.length) {
                this.startGame();
            }

        }
    },

    setUserNotReady: function(user) {

        if (this.isStarting()) {
            user.error(NetworkError.Lobby.PENDING);

        } else {
            if (!this._ready.remove(user)) {
                user.error(NetworkError.Lobby.NOT_READY);
            }
        }

    },

    addUser: function(user) {

        if (this.isStarting()) {
            user.error(NetworkError.Lobby.PENDING, this.getId());

        } else if (this.isFull()) {
            user.error(NetworkError.Lobby.FULL, this.getId());

        } else if (UserContainer.addUser(this, user)) {

            this._actionManager.addUser(user);

            if (user.getChannel()) {
                user.getChannel().removeUser(user);
            }

            user.setChannel(null);
            user.setLobby(this);

            user.send(Network.Lobby.JOIN, this.getId());
            this.send(Network.Lobby.USERS, this.getUserIds());
            user.send(Network.Lobby.SETTINGS, this._settings);
            user.send(Network.Lobby.CREATOR, this._creator.getId());
            user.send(Network.Lobby.USERS_READY, this._ready.getIds());

        }

    },

    removeUser: function(user, byDisconnect) {

        if (this.isStarting() && !byDisconnect) {
            user.error(NetworkError.Lobby.PENDING, this.getId());

        } else if (UserContainer.removeUser(this, user)) {

            this._actionManager.removeUser(user);

            if (this._channel) {
                this._channel.addUser(user);
            }

            user.setChannel(this._channel);
            user.setLobby(null);

            if (this._ready.remove(user)) {
                this.send(Network.Lobby.NOT_READY, user.getId());
            }

            user.send(Network.Lobby.LEAVE, this.getId());
            this.send(Network.Lobby.USERS, this.getUserIds());

            if (this.isEmpty()) {
                this.close();

            } else if (user === this._creator) {
                this._creator = this._users[0];
                this.send(Network.Lobby.CREATOR, this._creator.getId());
            }

        }

    },

    getChannel: function() {
        return this._channel;
    },

    closeByUser: function(user) {

        if (this.isStarting()) {
            user.error(NetworkError.Lobby.PENDING, this.getId());

        } else if (user === this._creator) {
            this.close();

        } else if (user) {
            user.error(NetworkError.Lobby.NOT_CREATOR, this.getId());
        }

    },

    close: function() {

        if (this._isClosing) {
            return;
        }

        this._isClosing = true;

        this.send(Network.Lobby.CLOSE, this.getId());
        this.getParent().removeLobby(this);
        UserContainer.close(this);

        this._settings = null;
        this._channel = null;
        this._creator = null;

        this._ready = null;
        this._isStarting = null;

    },

    toLog: function() {
        return '[Lobby ' + this._id + ']';
    }

});

module.exports = Lobby;

