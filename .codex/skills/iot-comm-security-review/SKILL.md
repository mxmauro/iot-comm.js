---
name: iot-comm-security-review
description: Review iot-comm.js for security-sensitive bugs, protocol regressions, and reliability issues. Use when Codex needs to audit handshake code, crypto helpers, Base64/buffer conversions, OTA upload paths, WebSocket connection handling, or public API misuse risks in this repository.
---

# iot-comm-security-review

Follow this workflow:

1. Read `AGENTS.md` first.
2. Read [references/checklist.md](references/checklist.md).
3. Prioritize findings in:
   - `src/client.ts`
   - `src/crypto/`
   - `src/ws/`
   - `src/utils/base64.ts`
   - `src/utils/buffer.ts`
   - `src/utils/validation.ts`
4. Look for concrete bugs first, especially:
   - browser/Node behavioral mismatches
   - malformed-input handling gaps
   - race conditions around close/reply handling
   - protocol downgrade or replay surfaces
   - secret exposure through URLs, errors, or logs
5. Treat generated `dist/` files as secondary unless the source cannot explain the issue.
6. Report findings with severity, impact, and exact file references.

Do not spend time on stylistic cleanup unless it changes risk or correctness.
