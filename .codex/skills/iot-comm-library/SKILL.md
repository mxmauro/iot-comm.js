---
name: iot-comm-library
description: Maintain and extend the iot-comm.js TypeScript client for the esp-iot-comm protocol. Use when Codex needs to modify this repository's client API, handshake flow, OTA upload path, crypto adapters, Base64/buffer helpers, WebSocket runtime adapters, build outputs, or project documentation while preserving browser and Node.js compatibility.
---

# iot-comm-library

Follow this workflow:

1. Read `AGENTS.md` first.
2. Read [references/protocol.md](references/protocol.md) when the task touches handshake, packet encoding, counters, OTA commands, or credential-management commands.
3. Inspect both runtime implementations when changing shared behavior:
   - `src/crypto/*.browser.ts` and `src/crypto/*.node.ts`
   - `src/ws/browser.ts` and `src/ws/node.ts`
4. Prefer existing helpers in `src/utils/` instead of duplicating binary conversion, Base64, abort, or OTA chunk logic.
5. Keep protocol handling fail-closed. Reject malformed input, counter mismatches, and crypto inconsistencies explicitly.
6. Update `README.md` when public API usage, installation, or security assumptions change.
7. Run `npm run build` after behavior changes unless the user explicitly says not to.

Implementation notes:

- Preserve the runtime split: browser in `*.browser.ts`, Node.js in `*.node.ts`, fallback in `*.stub.ts`.
- Do not hand-edit `dist/` unless the task explicitly requires generated artifacts to be updated.
- Be conservative around `src/client.ts`; most user-visible behavior and protocol invariants live there.
