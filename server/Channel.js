var Class = require('../lib/Class').Class,
    UserContainer = require('./UserContainer'),
    Network = require('../lib/Network').Network,
    NetworkError = require('../lib/Network').NetworkError;

var Channel = Class(function(parent, name, maxUsers) {
    UserContainer(this, parent, name, maxUsers);
    this.getParent().addChannel(this);

}, UserContainer, {

    addUser: function(user) {

        if (this.isFull()) {
            user.error(NetworkError.Channel.FULL, this.getId());

        } else if (UserContainer.addUser(this, user)) {

            if (user.getChannel()) {
                user.getChannel().removeUser(user);
            }

            user.setChannel(this);
            user.send(Network.Channel.JOIN, this.getId());
            this.send(Network.Channel.USERS, this.getUserIds());

        }

    },

    removeUser: function(user) {
        if (UserContainer.removeUser(this, user)) {
            user.setChannel(null);
            user.send(Network.Channel.LEAVE, this.getId());
            this.send(Network.Channel.USERS, this.getUserIds());
        }
    },

    close: function() {
        this.getParent().removeChannel(this);
        UserContainer.close(this);
    },

    toLog: function() {
        return '[Channel ' + this._id + ']';
    }

});

module.exports = Channel;

