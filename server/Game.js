var Class = require('../lib/Class').Class,
    UserContainer = require('./UserContainer'),
    ActionManager = require('./ActionManager'),
    List = require('./List'),
    Network = require('../lib/Network').Network,
    NetworkError = require('../lib/Network').NetworkError;


var Game = Class(function(lobby, channel, settings) {

    this._channel = channel;
    this._settings = settings;
    this._randomSeed = 500000 + Math.floor((Math.random() * 1000000));
    this._randomState = Math.floor(Math.random(1000));

    UserContainer(this, lobby.getParent(), '');
    this.getParent().addLobby(this);

    this._actionManager = new ActionManager(this);

    this._running = false;
    lobby.eachUser(function(user) {
        this.addUser(user);

    }, this);

    this.send(Network.Game.SETTINGS, [this._settings, this._randomSeed, this._randomState]);
    this.send(Network.Game.USERS, this.getUserIds());
    this.send(Network.Game.START);

    this._running = true;

    this.log('Created');

}, UserContainer, {

    actionMessage: function(user, type, data) {
        return this._actionManager.message(user, type, data);
    },

    actionComplete: function() {

    },

    addUser: function(user) {

        if (!this._running) {
            if (UserContainer.addUser(this, user)) {
                this._actionManager.addUser(user);
                user.setGame(this);

            } else {
                return false;
            }

        } else {
            return false;
        }

    },

    removeUser: function(user) {

        if (UserContainer.removeUser(this, user)) {

            this._actionManager.removeUser(user);

            if (this._channel) {
                this._channel.addUser(user);
            }

            user.setChannel(this._channel);
            user.setGame(null);

            user.send(Network.Game.LEAVE, this.getId());

            // TODO howto determine winner / looser?
            if (this.isEmpty()) {
                this.end();
            }

        }

    },

    end: function() {
        this.send(Network.Game.END, this.getId());
        this.getParent().removeGame(this);
        UserContainer.close(this);

        this._channel = null;
        this._settings = null;
        this._randomSeed = null;
        this._randomState = null;

    },

    toLog: function() {
        return '[Game ' + this._id + ']';
    }

});

module.exports = Game;

