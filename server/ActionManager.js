var Class = require('../lib/Class').Class,
    Network = require('../lib/Network').Network,
    NetworkError = require('../lib/Network').NetworkError;


// Generic Action Container ---------------------------------------------------
function Action(user, data) {

    this.id = ++Action.uid;

    // The data
    this.data = data;

    // The id of the user which wants to perfom this action
    this.userId = user.getId();

    // List for users which either accepted, rejected or completed the action
    this.acceptedBy = [];
    this.rejectedBy = [];
    this.completedBy = [];

    // State of the action
    this.state = Action.State.PENDING;

    // Only one action can be performed by a user at a time
    user.action = this.id;

}

Action.uid = Math.floor(Math.random() * 1313123);

Action.State = {
    PENDING: 1,
    ACCEPTED: 2,
    REJECTED: 3,
    COMPLETED: 4
};


Action.prototype = {
    toLog: function() {
        return '[Action ' + this.id + ']';
    }
};



// Base Class for cross client action handling --------------------------------
var ActionManager = Class(function(parent) {
    this._parent = parent;
    this._actionQueue = [];
    this._actionUid = 0;

}, {

    getParent: function() {
        return this._parent;
    },

    message: function(user, type, data) {

        if (type === Network.Action.ADD) {
            if (this._validateActionMessage(user, null, false)) {
                if (!user.action) {
                    this.addAction(user, data);

                } else {
                    user.error(NetworkError.Action.PENDING);
                }
            }

        } else if (type === Network.Action.ACCEPT) {
            if (this._validateActionMessage(user, data)) {
                this.acceptAction(user, data);
            }

        } else if (type === Network.Action.REJECT) {
            if (this._validateActionMessage(user, data)) {
                this.rejectAction(user, data);
            }

        } else if (type === Network.Action.COMPLETE) {
            if (this._validateActionMessage(user, data)) {
                this.completeAction(user, data);
            }

        } else {
            return true;
        }

    },

    addUser: function(user) {

        for(var i = 0, l = this._actionQueue.length; i < l; i++) {

            var action = this._actionQueue[i];
            if (action.state === Action.State.PENDING) {
                user.send(Network.Action.ADD, [action.id, action.data]);
            }

        }

    },

    removeUser: function(user) {

        for(var i = 0, l = this._actionQueue.length; i < l; i++) {
            var action = this._actionQueue[i];
            action.acceptedBy.splice(action.acceptedBy.indexOf(user.getId()), 1);
            action.rejectedBy.splice(action.rejectedBy.indexOf(user.getId()), 1);
            action.completedBy.splice(action.completedBy.indexOf(user.getId()), 1);
        }

    },

    addAction: function(user, data) {

        this._checkActions();

        var action = new Action(user, data);

        // Push it into the action queue
        this._actionQueue.push(action);

        this.getParent().log(user, 'user added action', action);

        // Relay the new pending action to all users in the room
        // They have to respond with either ACCEPT or REJECT
        this.getParent().send(Network.Action.ADD, [action.id, action.data, action.userId]);

        return action.id;

    },

    acceptAction: function(user, id) {

        this._checkActions();

        var action = this._getActionById(id);
        if (action) {
            if (action.state === Action.State.PENDING) {

                var userId = user.getId();
                if (action.acceptedBy.indexOf(userId) !== -1) {
                    user.error(Network.Error.Action.ALREADY_ACCEPTED);

                } else {
                    this.getParent().log(user, 'accepted action', action);
                    action.acceptedBy.push(userId);
                    this._checkActions();
                    return true;
                }

            }

        } else {
            user.error(Network.Error.Action.NOT_FOUND);
        }

        return false;

    },

    rejectAction: function(user, id) {

        this._checkActions();

        var action = this._getActionById(id);
        if (action) {
            if (action.state === Action.State.PENDING) {

                var userId = user.getId();
                if (action.rejectedBy.indexOf(userId) !== -1) {
                    user.error(Network.Error.Action.ALREADY_REJECTED);

                } else {
                    this.getParent().log(user, 'rejected action', action);
                    action.rejectedBy.push(userId);
                    this._checkActions();
                    return true;
                }

            }

        } else {
            user.error(Network.Error.Action.NOT_FOUND);
        }

        return false;

    },

    completeAction: function(user, id) {

        this._checkActions();

        var action = this._getActionById(id);
        if (action) {
            if (action.state === Action.State.ACCEPTED) {

                var userId = user.getId();
                if (action.completedBy.indexOf(userId) !== -1) {
                    user.error(Network.Error.Action.ALREADY_COMPLETE);

                } else {
                    this.getParent().log(user, 'completed action', action);
                    action.completedBy.push(userId);
                    this._checkActions();
                    return true;
                }

            }

        } else {
            user.error(Network.Error.Action.NOT_FOUND);
        }

        return false;

    },

    _getActionById: function(id) {
        for(var i = 0, l = this._actionQueue.length; i < l; i++) {
            if (this._actionQueue[i].id === id) {
                return this._actionQueue[i];
            }
        }

        return null;
    },

    _checkActions: function() {

        // Try to update the first action in the queue and repeat in case it is
        // completed
        do {

            var action = this._actionQueue[0];
            if (!action) {
                break;
            }

            var state = this._updateActionState(action);

            // Remove actions which are completed from the queue
            if (state === Action.State.COMPLETED || state === Action.State.REJECTED) {

                this._actionQueue.shift();

                var user = this.getParent().getUserById(action.userId);
                if (user) {
                    user.action = null;
                }

            }

        } while(this._actionQueue.length > 0 && state === Action.State.COMPLETED);

    },

    _updateActionState: function(action) {

        var users = this.getParent().getUserIds(),
            userCount = users.length,
            acceptedCount = 0,
            rejectedCount = 0,
            completedCount = 0,
            i = 0;

        // Check all users and see whether the action was accepted by all of them
        // or rejected by at least 50%
        if (action.state === Action.State.PENDING) {

            for(i = 0; i < userCount; i++) {
                if (action.acceptedBy.indexOf(users[i]) !== -1) {
                    acceptedCount++;
                }
            }

            for(i = 0; i < userCount; i++) {
                if (action.rejectedBy.indexOf(users[i]) !== -1) {
                    rejectedCount++;
                }
            }

            // If at least 50% of the users we reject the action.

            // TODO this works good in rooms with more than 2 users
            // but would potentially block the actions of a good user
            // since the malicous one could just reject all actions of them.
            if (rejectedCount >= Math.ceil(userCount / 2)) {

                this.getParent().log('action rejected', action);
                action.state = Action.State.REJECTED;
                this.getParent().send(Network.Action.REJECT, action.id);

            // Otherwise, if all of the users have responded, we mark the the action as accepted
            } else if (acceptedCount + rejectedCount === userCount) {

                this.getParent().log('action accepted', action);
                action.state = Action.State.ACCEPTED;
                this.getParent().send(Network.Action.ACCEPT, action.id);

            }

        // If action was accepted we have to wait for all users to complete it
        } else if (action.state === Action.State.ACCEPTED) {

            for(i = 0; i < userCount; i++) {
                if (action.completedBy.indexOf(users[i]) !== -1) {
                    completedCount++;
                }
            }

            // If all users completed it, we can remove it from the queue
            if (completedCount === userCount) {

                this.getParent().log('action completed', action);
                action.state = Action.State.COMPLETED;

                if (this.getParent().actionComplete) {
                    this.getParent().actionComplete(action);
                }

            }

        }

        return action.state;

    },

    _validateActionMessage: function(user, id, validateId) {

        if (validateId !== false && typeof id !== 'number' && (id | 0) !== id) {
            return user.error(Network.Error.Action.INVALID_ID);
        }

        return true;

    }

});

module.exports = ActionManager;

