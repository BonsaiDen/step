var Class = require('../lib/Class').Class,
    Logger = require('./Logger');

var List = Class(function(parent, id, maxItems) {

    this._parent = parent;
    this._id = id;
    this._maxItems = maxItems || 0;
    this._itemIds = [];
    this._items = {};
    this.length = 0;

}, Logger, {

    getIds: function() {
        return this._itemIds;
    },

    getById: function(id) {

        if (Object.hasOwnProperty.call(this._items, id)) {
            return this._items[id] || null;

        } else {
            return null;
        }

    },

    isEmpty: function() {
        return this._itemIds.length === 0;
    },

    isFull: function() {
        return this._maxItems !== 0 && this._itemIds.length === this._maxItems;
    },

    add: function(item) {

        if (this._itemIds.indexOf(item.getId()) === - 1 && !this.isFull()) {

            this._itemIds.push(item.getId());
            this._items[item.getId()] = item;

            this.length++;
            this.log('added', item);

            return true;

        } else {
            return false;
        }

    },

    remove: function(item) {

        if (this._itemIds.indexOf(item.getId()) === - 1) {
            return false;

        } else {
            this._itemIds.splice(this._itemIds.indexOf(item.getId()), 1);
            delete this._items[item.getId()];

            this.length--;
            this.log('removed', item);

            return true;

        }

    },

    each: function(callback, scope) {
        for(var i = 0, l = this._itemIds.length; i < l; i++) {
            callback.call(scope || null, this._items[this._itemIds[i]]);
        }
    },

    toLog: function() {
        return '[List ' + this._id + ' of ' + (this._parent.toLog()) + ']';
    }

});

module.exports = List;

