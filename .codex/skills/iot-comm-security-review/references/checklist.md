# Review Checklist

Use this checklist when auditing the repository.

## Handshake and auth

- Check whether secrets or bearer-like tokens are placed in URLs, logs, or exceptions.
- Check whether HTTP transport choices expose credentials or permit trivial interception.
- Check whether signature transcripts match the intended protocol ordering.
- Check whether invalid handshake responses are rejected early and completely.

## Encrypted framing

- Verify message counters are monotonic and enforced.
- Verify decryption failures close the session.
- Check whether pending replies can leak, hang forever, or resolve after teardown.

## Encoding and binary handling

- Compare browser and Node.js Base64 behavior on malformed inputs.
- Check for unnecessary copies on hot paths only after correctness issues are covered.
- Verify raw key import/export code enforces size and format exactly.

## OTA

- Verify declared image size and streamed byte count cannot silently diverge.
- Verify aborts and mid-stream failures attempt OTA cancel safely.

## Transport

- Check browser and Node.js WebSocket adapters for mismatch in binary handling, connect timeout handling, and error propagation.
- Check whether debug logging can expose server responses or sensitive handshake data.
