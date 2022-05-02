module.exports = {
    INVALID: 0, // Used to send an error message to the client that the message/method is invalid.

    ACK: 1000, // Acknowledge, used to confirm a client has received a message.
    HELLO: 1001, // If the client sent a ACK back, send this to confirm the server has received the message.
    PING: 1002, // Ping, used to check if the client is still connected.
    PONG: 1003, // Pong, used to check if the server is still connected.
    COMMAND: 1004, // Command, used to send a command to the server.
    COMMAND_RESPONSE: 1005, // Command response, used to send a response to a command.

    DISCONNECT: 2000, // Disconnect, used to tell the client to disconnect.
    RECONNECT: 2001, // Reconnect, used to tell the client to reconnect.

    KEY_EXCHANGE: 3000, // Used to exchange public keys between client and server.
    NEW_SESSION: 3001, // Used to tell the client that server sent a session key to client.
    DO_KEY_EXCHANGE_AGAIN: 3002, // Used to tell the client to do key exchange again.
    AUTHENTICATE: 3003, // Client only, used to authenticate the client.

    ERROR: 4000, // Used to send an error message to the client.
    NOT_AUTHENTICATED: 4001, // The client's the session key is invalid, please notice that if client didn't auth on HELLO, do not send NOT_AUTHENTICATED, instead of AUTHENTICATE_REQUIRED.
    INVALID_PUBLIC_KEY: 4002, // The client sent an invalid public key, or the message cannot be decrypted by using the public key that client sent.
    AUTHENTICATE_REQUIRED: 4003, // If the client didn't auth on HELLO, send this to tell the client to auth.

    OKAY: 4500, // Used to send an okay message to the client, server will send this if nothing can send.

    DEPRECATED: 5000, // Used to send a message to the client that the method is deprecated, if something was wrong, server will send error instead.
    UNKNOWN_OPCODE: 5001, // Used to send an error message to the client that the opcode is unknown.

    EMPTY: 9000, // Used to tell the client that the server does not want to send a response.
    FORCE_CLOSE: 9999, // Used to force the client to disconnect.

    ENCRYPTED: 10000, // Used to tell the client that the message is encrypted.

    DJS_VOICE_PAYLOAD: 11000, // Used to tell the client that the voice state has been updated.
    DJS_VOICE_SERVER_UPDATE: 11001, // Used to tell the client that the voice server has been updated.
    DJS_VOICE_STATE_UPDATE: 11002, // Used to tell the client that the voice state has been updated.
}