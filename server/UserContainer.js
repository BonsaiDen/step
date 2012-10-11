var Class = require('../lib/Class').Class,
    List = require('./List'),
    Logger = require('./Logger'),
    NetworkError = require('../lib/Network').NetworkError;


var UserContainer = Class(function(parent, name, maxUsers) {

    this._id = ++UserContainer.$uid;

    this._parent = parent;
    this._name = name;

    this._users = new List(this, 'Users', maxUsers);

}, Logger, {

    $uid: 0,

    getId: function() {
        return this._id;
    },

    getName: function() {
        return this._name;
    },

    getParent: function() {
        return this._parent;
    },

    send: function(type, data) {
        this._users.each(function(user) {
            user.send(type, data);
        });
    },

    close: function() {

        this._users.each(function(user) {
            this.removeUser(user);

        }, this);

        this.log('Closed');

        this._id = null;
        this._parent = null;
        this._name = null;
        this._users = null;

    },

    eachUser: function(callback, scope) {
        this._users.each(function(user) {
            callback.call(this, user);

        }, scope);
    },


    isEmpty: function() {
        return this._users.isEmpty();
    },

    isFull: function() {
        return this._users.isFull();
    },

    addUser: function(user) {
        return this._users.add(user);
    },

    removeUser: function(user) {
        return this._users.remove(user);
    },

    getUserIds: function() {
        return this._users.getIds();
    },

    getUserById: function(id) {
        return this._users.getById(id);
    },

    toLog: function() {
        return '[UserContainer]';
    }

});

module.exports = UserContainer;

