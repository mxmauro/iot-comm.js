# Protocol Notes

Read this file when a task changes authentication, encrypted framing, or OTA behavior.

## Handshake

- The client currently performs HTTP `POST` requests to `ws/init` and `ws/auth` before opening the WebSocket.
- `ws/init` sends:
  - `userName`
  - `clientNonce`
  - `clientPublicKey`
- `ws/auth` sends:
  - `token`
  - `authNonce`
  - `signature`
- The client signs the handshake transcript with the user's ECDSA private key.
- Session material is derived with HKDF from:
  - ECDH shared secret
  - `SHA-256("ws-login-v1" || serverNonce || clientNonce || cookie)`
  - `SHA-256("ws-login-v1" || serverNonce || clientNonce || cookie || wsNonce)`

## Encrypted transport

- Packet header layout is:
  - version: 1 byte
  - command: 2 bytes, big-endian
  - filler: 1 byte
  - reply counter: 4 bytes, big-endian
  - packet counter: 4 bytes, big-endian
  - filler: 4 bytes
- `MAX_MSG_SIZE` is 2000 bytes.
- The IV is derived by XORing the last four bytes of the base IV with the packet counter.
- RX counters are strictly sequential and should close the connection on mismatch.
- Replies are matched by the transmitted counter, stored in `waitingReplyMap`.

## OTA

- OTA begin sends a 4-byte big-endian image size.
- OTA write sends raw chunk payloads.
- OTA cancel should run on partial upload failure when the session is still connected.
- Iterable OTA sources require `imageSize`; fixed-size inputs should be validated against their actual byte length.

## Review focus

- Keep browser and Node.js crypto behavior identical.
- Reject malformed Base64, key material, and unexpected message framing.
- Avoid logging handshake tokens, raw packets, private keys, or signatures.
