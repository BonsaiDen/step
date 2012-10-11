var Class = require('../lib/Class').Class;

var Logger = Class({

    log: function() {

        var args = Array.prototype.slice.call(arguments);

        args.unshift(this);
        for(var i = 0, l = args.length; i < l; i++) {
            var arg = args[i];
            if (arg && typeof arg.toLog === 'function') {
                args[i] = arg.toLog();
            }
        }

        console.log.apply(console, args);

    }

});

module.exports = Logger;

