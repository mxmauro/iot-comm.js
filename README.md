# iot-comm.js

A JavaScript client library for secure communication with ESP IoT devices running the
[esp-iot-comm](https://github.com/mxmauro/esp-components/tree/master/esp_iot_comm) server component.

## Overview

`iot-comm.js` provides a secure, WebSocket-based client for connecting to ESP32 IoT devices that use the esp-iot-comm component. It
implements the same cryptographic protocols and communication patterns as the server, ensuring end-to-end security and reliable device
control.

## Key Features

- **Secure Communication**: AES-256 encryption with ECDH key exchange, ECDSA authentication, and challenge-response protection against
  replay attacks.
- **WebSocket Transport**: Real-time bidirectional communication.
- **User Management**: Create, delete, and manage user accounts on the device.
- **Credential Management**: Change and reset user credentials securely.
- **Device Configuration**: Set mDNS hostname for device discovery.
- **Cross-Platform**: Works in both Node.js and browser environments.
- **Event-Driven**: Listen for messages and connection events.
- **TypeScript Support**: Full TypeScript definitions included.
- **Server Identity Hook**: Optional SHA-256 fingerprint approval callback before authentication continues.

## Installation

### NodeJS

Install from npm:

```bash
npm install @mxmauro/iot-comm.js
```

### CDN

You can use the library directly in the browser via jsDelivr CDN without installing it:

```html
<script src="https://cdn.jsdelivr.net/gh/mxmauro/iot-comm.js@v0.1.0/dist/umd/index.js"></script>
```

Replace `v0.1.0` with the desired version tag.

## Examples

See the `examples/` directory for complete implementations:

- `examples/browser/` - Web browser demo with user interface
- `examples/nodejs/` - Node.js console and key generation examples

## Quick Start

### Generate ECDSA key pair

```ts
import { Client, toB64 } from '@mxmauro/iot-comm.js';

const { privateKey, publicKey } = await Client.generateECDSAKeyPair();

console.log('Private key:', toB64(privateKey));
console.log('Public key:', toB64(publicKey));
```

### Connect to a device

```ts
import { Client } from '@mxmauro/iot-comm.js';

const client = new Client();

await client.connect({
	hostname: '192.168.1.25:80',
	username: 'admin',
	privateKey: '<base64-private-key>',
	verifyServerFingerprint: async (fingerprint) => {
		return fingerprint === '<sha256-device-public-key-hex>';
	}
});
```

The `verifyServerFingerprint` callback receives the uppercase hexadecimal `SHA-256(devicePublicKey)` fingerprint derived
from the `/ws/init` response after the library verifies the server-provided device signature. Returning `true` continues
the connection, returning `false` aborts it with `ConnectionAbortedError`, and thrown errors are propagated from
`connect()`.

After a successful connection, `client.maxPacketSize` reports the maximum packet size advertised by the device and
`client.isAdmin` indicates whether the authenticated user has administrator privileges.

### Cancel connection setup

Pass an `AbortSignal` to cancel an in-progress `connect()` call. The signal affects only setup; aborting it after a
successful connection does not close the session.

```ts
const abortController = new AbortController();
const connecting = client.connect({
	hostname: '192.168.1.25:80',
	username: 'admin',
	privateKey: '<base64-private-key>',
	signal: abortController.signal
});

abortController.abort(new Error('Connection cancelled'));
await connecting;
```

### Upload firmware with OTA

```ts
await client.uploadFirmware({
	image: firmwareBlob,
	onProgress: ({ sentBytes, totalBytes }) => {
		console.log(`Uploaded ${sentBytes}/${totalBytes}`);
	}
});
```

For browser use, `Blob` is the simplest input type. For Node.js or advanced cases, you can also pass an `ArrayBuffer`, `Uint8Array`,
`Buffer`, or a sync/async iterable of chunks. When the image source is iterable, you must also provide `imageSize`.

```ts
await client.uploadFirmware({
	image: async function* () {
		yield chunk1;
		yield chunk2;
		yield chunk3;
	}(),
	imageSize: totalFirmwareSize,
	chunkSize: 1024,
	signal: abortController.signal
});
```

The lower-level command methods are also available when you need manual control over the OTA session:

```ts
await client.otaBeginCommand(firmwareSize);
await client.otaWriteCommand(chunk);
await client.otaCancelCommand();
```

### Configure AudioLight multi-output devices

AudioLightNode V2 stores input and lighting separately. Read or update each complete section over the same authenticated session,
then reboot only after all requested updates succeed:

```ts
const input = await client.getInputConfigCommand();
const lighting = await client.getLightingConfigCommand();

await client.setInputConfigCommand({ ...input, resetGpio: undefined });
await client.setLightingConfigCommand([
	{ type: 'rgb5050', redGpio: 4, greenGpio: 5, blueGpio: 6, activeLow: false },
	{ type: 'ws281x', dataGpio: 7, ledCount: 60 }
]);
await client.rebootCommand();
```

Omit optional input or WS281x mirror GPIOs to leave them disconnected. The protocol's `0xff` representation is translated to and from
`undefined` internally. Lighting outputs are ordered slots; the first output is slot `0`. The client rejects truncated replies and invalid
configuration sections before sending them. Configuration changes are saved but do not take effect until `rebootCommand()` succeeds.

Color, fade, set-and-fade, raw-DMX, and raw-WS281x methods accept a slot target (`0` or `1`), `LIGHTING_TARGET_ALL`, or `undefined`.
The latter two target every active slot. A slot target must refer to an active slot; a raw command on an incompatible lighting type is a
valid no-op on the device. WS281x raw data is provided as consecutive red, green, blue bytes;
`setRawWs281xRgbDataCommand(target, firstLed, data)` addresses LEDs from one.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please ensure all changes maintain compatibility with the esp-iot-comm server protocol.
