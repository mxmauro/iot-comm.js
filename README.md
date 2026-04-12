# iot-comm.js

A JavaScript client library for secure communication with ESP IoT devices running the [esp-iot-comm](https://github.com/mxmauro/esp-components/tree/master/esp_iot_comm) server component.

## Overview

`iot-comm.js` provides a secure, WebSocket-based client for connecting to ESP32 IoT devices that use the esp-iot-comm component. It implements the same cryptographic protocols and communication patterns as the server, ensuring end-to-end security and reliable device control.

## Key Features

- **Secure Communication**: AES-256 encryption with ECDH key exchange, ECDSA authentication, and challenge-response protection against replay attacks.
- **WebSocket Transport**: Real-time bidirectional communication.
- **User Management**: Create, delete, and manage user accounts on the device.
- **Credential Management**: Change and reset user credentials securely.
- **Device Configuration**: Set mDNS hostname for device discovery.
- **Cross-Platform**: Works in both Node.js and browser environments.
- **Event-Driven**: Listen for messages and connection events.
- **TypeScript Support**: Full TypeScript definitions included.

## Installation

### NodeJS

Install from GitHub Packages:

```bash
npm config set @mxmauro:registry https://npm.pkg.github.com/
npm install @mxmauro/iot-comm.js
```

Or install directly by specifying the registry:

```bash
npm install @mxmauro/iot-comm.js --registry https://npm.pkg.github.com/
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
	privateKey: '<base64-private-key>'
});
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

For browser use, `Blob` is the simplest input type. For Node.js or advanced cases, you can also pass an `ArrayBuffer`, `Uint8Array`, `Buffer`, or a sync/async iterable of chunks. When the image source is iterable, you must also provide `imageSize`.

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

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please ensure all changes maintain compatibility with the esp-iot-comm server protocol.
