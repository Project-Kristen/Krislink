# Krislink
A voice server that receives and sends voice, inspired by Lavalink and Nexus.

# Requirements
Node.js v16.6.x up,
Python 3.7 up

# Build
Currently you cannot build this server.

# How does it work?
Connecting:

Client -> Server ACK1 ACK=1

Server -> Client ACK2 ACK=2

Client -> Server HELLO1 ACK=2

Server -> Client HELLO2 ACK=2

Client -> Server OKAY # It's recommend to send OKAY when Client is ready.

Client <-> Server Confirm connection

---

Client VOICE_STATE_UPDATE:

Client -> Server VOICE_STATE_UPDATE

Server -> Client VOICE_STATE_DONE

---

# Safe Connection

When safemode is enabled, When Client gets a HELLO from Server, it will send a KEY_EXCHANGE to Server.

Server will send a KEY_EXCHANGE to Client too.

Both's publicKey will be exchange on both side.

Recommend settings for safe connection is to use a RSA 4096 key pair (if you think your server can generate a 8192 bits one in a few seconds, try it).