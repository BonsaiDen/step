(function(g) {

    g.Network = {

        Server: {
            CONNECT: 1,
            DISCONNECT: 2,
            ERROR: 3,
            CHANNELS: 4
        },

        Chat: {
            MESSAGE: 10,
            SEND: 11,
            RECEIVE: 12
        },

        Channel: {
            OPEN: 20,
            CLOSE: 21,
            JOIN: 22,
            LEAVE: 23,
            USERS: 24,
            PENDING: 25
        },

        Lobby: {
            OPEN: 30,
            CLOSE: 31,
            JOIN: 32,
            LEAVE: 33,
            USERS: 34,
            PENDING: 35,
            SETTINGS: 36,
            CREATOR: 37,
            READY: 38,
            NOT_READY: 39,
            USERS_READY: 40,
            STARTING: 41,
            COUNTDOWN: 42
        },

        Game: {
            SETTINGS: 50,
            USERS: 51,
            START: 52,
            LEAVE: 53
        },

        Action: {
            ADD: 60,
            ACCEPT: 61,
            REJECT: 62,
            COMPLETE: 63
        }

    };

    g.NetworkError = {

        Server: {
            INVALID_MESSAGE: 1,
            WRONG_VERSION: 2,
            UNKNOWN_COMMAND: 3
        },

        Chat: {
            INVALID_MESSAGE: 10
        },

        Channel: {
            INVALID_ID: 20,
            NOT_FOUND: 21,
            FULL: 22
        },

        Lobby: {
            INVALID_ID: 30,
            NOT_FOUND: 31,
            FULL: 32,
            NOT_CREATOR: 33,
            PENDING: 34,
            NOT_READY: 35
        },

        Game: {
            INVALID_ID: 40,
            NOT_FOUND: 41
        },

        Action: {
            INVALID_ID: 50,
            NOT_FOUND: 51,
            PENDING: 52,
            ALREADY_ACCEPTED: 53,
            ALREADY_REJECTED: 54,
            ALREADY_COMPLETE: 55
        },

        User: {
            INVALID_ID: 60,
            NOT_FOUND: 61
        }

    };

})(typeof window !== 'undefined' ? window : module.exports);

