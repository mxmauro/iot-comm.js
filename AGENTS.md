# iot-comm.js Agent Notes

## Scope
- These instructions apply to the whole repository.
- Treat this as a TypeScript library first. Preserve the current split between protocol/client code in `src/client.ts`, runtime-specific
  adapters under `src/crypto/` and `src/ws/`, reusable helpers under `src/utils/`, examples under `examples/`, and generated bundles under
  `dist/`.
- Make the smallest change that solves the task. Do not reformat unrelated code.
- Do not touch unrelated user changes. This repository may be dirty.

## File format
- Use LF line endings for text files.
- Use UTF-8 or plain ASCII. Do not introduce a different encoding unless the file already requires it.
- Keep trailing whitespace out of handwritten files.
- Do not generate lines longer than 140 characters unless splitting the content is impractical or would make it less correct.
- Preserve the existing spacing and blank-line rhythm in touched files instead of normalizing entire files.

## General coding style
- Indent with tabs in TypeScript and JavaScript files, matching the current source style.
- Preserve the existing comment and separator style when it already helps structure a file:

```ts
// -----------------------------------------------------------------------------
```

- Prefer sparse comments that explain intent, invariants, or security constraints. Do not narrate obvious statements.
- Match existing naming and export patterns instead of renaming identifiers for taste.
- Keep public API changes deliberate. If behavior or signatures change, update the README or examples that would otherwise become
  misleading.

## TypeScript and packaging guidance
- Preserve the current runtime split: browser-specific code in `*.browser.ts`, Node.js-specific code in `*.node.ts`, and unsupported
  fallbacks in `*.stub.ts`.
- Keep cross-runtime interfaces aligned. When changing a crypto or WebSocket capability, update the corresponding interface and both runtime
  implementations unless the task explicitly targets one environment.
- Preserve the current module/export layout in `package.json`, `rslib.config.ts`, and the `dist/` outputs. Edit built artifacts only when
  the task explicitly requires regenerated bundles.
- Prefer existing helpers in `src/utils/` over ad hoc binary conversions, Base64 helpers, abort handling, or OTA chunk logic.
- Avoid introducing Node-only globals into browser paths unless the build already injects them intentionally.

## Protocol and security expectations
- Favor fail-closed behavior. On malformed protocol data, invalid key material, decryption failure, counter mismatch, or handshake
  inconsistency, throw or close the connection instead of continuing.
- Preserve or improve input validation, bounds checks, length checks, and protocol invariants. Do not weaken them for convenience.
- Be careful with code that handles keys, signatures, counters, nonces, session derivation, Base64 transport fields, OTA streams, or
  WebSocket handshake parameters.
- Do not log secrets, private keys, raw signatures, session tokens, cookies, derived keys, or full protocol payloads.
- Keep browser and Node crypto behavior equivalent. If one runtime changes encoding, key import/export, IV construction, or signature
  format, verify the other runtime still matches.
- Keep connection teardown safe. On failure, leave the client reusable and reject pending operations instead of leaking partial state.
- Prefer explicit size limits and input normalization on all externally supplied data.

## Review and testing guidance
- Read nearby code before editing and match its local style.
- Prefer focused patches over broad cleanup.
- When behavior changes, run the relevant project checks. The current baseline is `npm run build`, which also runs Biome checks before
  bundling.
- Add or update automated tests if the repository gains a test harness. Until then, call out manual verification needs clearly for protocol,
  browser, Node.js, or OTA paths you change.
- Do not fix unrelated bugs while editing unless they block the requested change.

## Documentation and generated output
- Keep Markdown concise and consistent with the repository's current tone.
- Update `README.md` when public usage, security assumptions, installation flow, or API behavior changes.
- Treat `dist/` as generated output. Prefer editing source files and regenerating artifacts rather than hand-editing built bundles.

## Editing rules for agents
- Before changing a file, read the nearby code and match its local style.
- Preserve untouched regions exactly.
- If a task creates tension between style and security, prioritize security while keeping the diff as small as possible.
