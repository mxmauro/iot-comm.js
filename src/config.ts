import { type InputBuffer, toDataView } from './utils/buffer';

// -----------------------------------------------------------------------------

export const GPIO_NOT_CONNECTED = 0xff;
export const LIGHTING_TARGET_ALL = 'all' as const;

const CONFIG_VERSION = 1;
const LIGHTING_MAX_COUNT = 2;
const DMX_UNIVERSE_SIZE = 128;
const DMX_MAX_FIXTURES = 16;
const DMX_MAX_FIXTURE_TYPE_BYTES = 32;
const DMX_MAX_FIXTURE_CHANNELS = 32;
const DMX_DYNAMIC_COLORING_MIN = 0x0100;
const DMX_DYNAMIC_COLORING_MAX = 0x0110;

// -----------------------------------------------------------------------------

export type InputConfig = {
	resetGpio: number;
	irGpio: number;
};

export type DmxFixture = {
	type: string;
	startChannel: number;
	coloring: number[];
};

export type DmxLightingConfig = {
	type: 'dmx';
	txGpio: number;
	fixtures: DmxFixture[];
};

export type Rgb5050LightingConfig = {
	type: 'rgb5050';
	redGpio: number;
	greenGpio: number;
	blueGpio: number;
	activeLow: boolean;
};

export type LightingConfig = (DmxLightingConfig | Rgb5050LightingConfig)[];

export type LightingTarget = 0 | 1 | typeof LIGHTING_TARGET_ALL;

// -----------------------------------------------------------------------------

// Decodes the versioned input section returned by CMD_GET_INPUT_CONFIG.
export const decodeInputConfig = (data: InputBuffer): InputConfig => {
	const reader = new Reader(data, 'Input configuration');
	if (reader.byte() !== CONFIG_VERSION) {
		throw new Error('Unsupported input configuration version');
	}

	const config = {
		resetGpio: reader.gpio(true),
		irGpio: reader.gpio(true)
	};
	reader.assertFinished();
	return config;
};

// Encodes the complete versioned input section required by CMD_SET_INPUT_CONFIG.
export const encodeInputConfig = (config: InputConfig): ArrayBuffer => {
	if (typeof config !== 'object' || config === null) {
		throw new Error('Input configuration must be an object');
	}

	return Uint8Array.from([CONFIG_VERSION, validateGpio(config.resetGpio, true, 'Reset GPIO'), validateGpio(config.irGpio, true, 'IR GPIO')])
		.buffer;
};

// Decodes the versioned ordered-lighting section returned by CMD_GET_LIGHTING_CONFIG.
export const decodeLightingConfig = (data: InputBuffer): LightingConfig => {
	const reader = new Reader(data, 'Lighting configuration');
	if (reader.byte() !== CONFIG_VERSION) {
		throw new Error('Unsupported lighting configuration version');
	}

	const count = reader.byte();
	if (count > LIGHTING_MAX_COUNT) {
		throw new Error('Lighting configuration has too many outputs');
	}

	const config: LightingConfig = [];
	const usedGpios = new Set<number>();
	let hasDmx = false;
	for (let slot = 0; slot < count; slot++) {
		const type = reader.byte();
		if (type === 1) {
			if (hasDmx) {
				throw new Error('Lighting configuration has more than one DMX output');
			}
			hasDmx = true;
			const output = decodeDmxLightingConfig(reader);
			claimGpio(usedGpios, output.txGpio, `DMX output ${slot}`);
			config.push(output);
		} else if (type === 2) {
			const output = decodeRgb5050LightingConfig(reader);
			claimGpio(usedGpios, output.redGpio, `RGB5050 output ${slot}`);
			claimGpio(usedGpios, output.greenGpio, `RGB5050 output ${slot}`);
			claimGpio(usedGpios, output.blueGpio, `RGB5050 output ${slot}`);
			config.push(output);
		} else {
			throw new Error('Lighting configuration contains an unsupported output type');
		}
	}

	reader.assertFinished();
	return config;
};

// Encodes the complete versioned ordered-lighting section required by CMD_SET_LIGHTING_CONFIG.
export const encodeLightingConfig = (config: LightingConfig): ArrayBuffer => {
	if (!Array.isArray(config) || config.length > LIGHTING_MAX_COUNT) {
		throw new Error(`Lighting configuration must contain at most ${LIGHTING_MAX_COUNT} outputs`);
	}

	const bytes: number[] = [CONFIG_VERSION, config.length];
	const usedGpios = new Set<number>();
	let hasDmx = false;
	for (const [slot, output] of config.entries()) {
		if (typeof output !== 'object' || output === null) {
			throw new Error(`Lighting output ${slot} must be an object`);
		}
		if (output.type === 'dmx') {
			if (hasDmx) {
				throw new Error('Lighting configuration cannot contain more than one DMX output');
			}
			hasDmx = true;
			bytes.push(1);
			encodeDmxLightingConfig(bytes, output, usedGpios, slot);
		} else if (output.type === 'rgb5050') {
			bytes.push(2);
			encodeRgb5050LightingConfig(bytes, output, usedGpios, slot);
		} else {
			throw new Error(`Lighting output ${slot} has an unsupported type`);
		}
	}

	return Uint8Array.from(bytes).buffer;
};

// Validates a lighting-slot target accepted by AudioLight control commands.
export const isLightingTarget = (value: unknown): value is LightingTarget => {
	return value === 0 || value === 1 || value === LIGHTING_TARGET_ALL;
};

// Encodes the target byte and RGB16 values used by the set-color command.
export const encodeSetColor = (target: LightingTarget, red: number, green: number, blue: number): ArrayBuffer => {
	return encodeColor(target, red, green, blue);
};

// Encodes the target byte and RGB16 values used by the fade-to-color command.
export const encodeFadeToColor = (target: LightingTarget, red: number, green: number, blue: number, milliseconds: number): ArrayBuffer => {
	const bytes = new Uint8Array(9);
	const view = new DataView(bytes.buffer);
	view.setUint8(0, validateLightingTarget(target));
	view.setUint16(1, validateUint16(red, 'Red'), false);
	view.setUint16(3, validateUint16(green, 'Green'), false);
	view.setUint16(5, validateUint16(blue, 'Blue'), false);
	view.setUint16(7, validateUint16(milliseconds, 'Fade duration'), false);
	return bytes.buffer;
};

// Encodes the target byte and RGB16 values used by the set-and-fade-to-color command.
// biome-ignore format: preserve custom parameter layout
export const encodeSetAndFadeToColor = (
	target: LightingTarget, startRed: number, startGreen: number, startBlue: number, endRed: number, endGreen: number, endBlue: number,
	milliseconds: number
): ArrayBuffer => {
	const bytes = new Uint8Array(15);
	const view = new DataView(bytes.buffer);
	view.setUint8(0, validateLightingTarget(target));
	view.setUint16(1, validateUint16(startRed, 'Start red'), false);
	view.setUint16(3, validateUint16(startGreen, 'Start green'), false);
	view.setUint16(5, validateUint16(startBlue, 'Start blue'), false);
	view.setUint16(7, validateUint16(endRed, 'End red'), false);
	view.setUint16(9, validateUint16(endGreen, 'End green'), false);
	view.setUint16(11, validateUint16(endBlue, 'End blue'), false);
	view.setUint16(13, validateUint16(milliseconds, 'Fade duration'), false);
	return bytes.buffer;
};

// Encodes a target, one-based DMX range, and raw channel data.
export const encodeRawDmxChannels = (target: LightingTarget, startChannel: number, data: InputBuffer): ArrayBuffer => {
	const channels = toDataView(data, 'DMX channel data');
	if (channels.byteLength < 1 || channels.byteLength > DMX_UNIVERSE_SIZE) {
		throw new Error(`DMX channel data must contain 1 to ${DMX_UNIVERSE_SIZE} bytes`);
	}
	if (!Number.isInteger(startChannel) || startChannel < 1 || startChannel + channels.byteLength - 1 > DMX_UNIVERSE_SIZE) {
		throw new Error(`DMX channel range must stay within 1 to ${DMX_UNIVERSE_SIZE}`);
	}

	const bytes = new Uint8Array(5 + channels.byteLength);
	const view = new DataView(bytes.buffer);
	view.setUint8(0, validateLightingTarget(target));
	view.setUint16(1, startChannel, false);
	view.setUint16(3, channels.byteLength, false);
	bytes.set(new Uint8Array(channels.buffer, channels.byteOffset, channels.byteLength), 5);
	return bytes.buffer;
};

// -----------------------------------------------------------------------------

class Reader {
	private readonly bytes: Uint8Array;
	private offset = 0;

	public constructor(
		data: InputBuffer,
		private readonly label: string
	) {
		const view = toDataView(data, label);
		this.bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
	}

	public byte(): number {
		this.require(1);
		return this.bytes[this.offset++];
	}

	public uint16(): number {
		this.require(2);
		const value = (this.bytes[this.offset] << 8) | this.bytes[this.offset + 1];
		this.offset += 2;
		return value;
	}

	public gpio(optional: boolean): number {
		return validateGpio(this.byte(), optional, `${this.label} GPIO`);
	}

	public string(): string {
		const start = this.offset;
		while (this.offset < this.bytes.byteLength && this.bytes[this.offset] !== 0) {
			this.offset += 1;
		}
		if (this.offset === this.bytes.byteLength) {
			throw new Error(`${this.label} contains an unterminated string`);
		}

		let value: string;
		try {
			value = new TextDecoder('utf-8', { fatal: true }).decode(this.bytes.slice(start, this.offset));
		} catch (_err) {
			throw new Error(`${this.label} contains an invalid UTF-8 string`);
		}
		this.offset += 1;
		return value;
	}

	public assertFinished(): void {
		if (this.offset !== this.bytes.byteLength) {
			throw new Error(`${this.label} contains trailing data`);
		}
	}

	private require(length: number): void {
		if (this.offset + length > this.bytes.byteLength) {
			throw new Error(`${this.label} is truncated`);
		}
	}
}

const decodeDmxLightingConfig = (reader: Reader): DmxLightingConfig => {
	if (reader.uint16() !== DMX_UNIVERSE_SIZE) {
		throw new Error('Unsupported DMX universe size');
	}

	const txGpio = reader.gpio(false);
	const fixtureCount = reader.byte();
	if (fixtureCount > DMX_MAX_FIXTURES) {
		throw new Error('DMX configuration has too many fixtures');
	}

	const fixtures: DmxFixture[] = [];
	const usedChannels = new Set<number>();
	for (let index = 0; index < fixtureCount; index++) {
		const type = reader.string();
		validateFixtureType(type, `DMX fixture ${index + 1} type`);
		const startChannel = reader.uint16();
		const channelCount = reader.byte();
		validateFixtureChannels(startChannel, channelCount, index);

		const coloring: number[] = [];
		for (let channel = 0; channel < channelCount; channel++) {
			const channelNumber = startChannel + channel;
			if (usedChannels.has(channelNumber)) {
				throw new Error(`DMX channel ${channelNumber} is assigned to more than one fixture`);
			}
			usedChannels.add(channelNumber);
			coloring.push(validateColoring(reader.uint16(), `DMX fixture ${index + 1} channel ${channel + 1}`));
		}
		fixtures.push({ type, startChannel, coloring });
	}

	return { type: 'dmx', txGpio, fixtures };
};

const decodeRgb5050LightingConfig = (reader: Reader): Rgb5050LightingConfig => {
	const redGpio = reader.gpio(false);
	const greenGpio = reader.gpio(false);
	const blueGpio = reader.gpio(false);
	const activeLow = reader.byte();
	if (activeLow > 1) {
		throw new Error('RGB5050 configuration has an invalid activeLow value');
	}

	return { type: 'rgb5050', redGpio, greenGpio, blueGpio, activeLow: activeLow === 1 };
};

const encodeDmxLightingConfig = (bytes: number[], output: DmxLightingConfig, usedGpios: Set<number>, slot: number): void => {
	const txGpio = validateGpio(output.txGpio, false, `DMX output ${slot} TX GPIO`);
	claimGpio(usedGpios, txGpio, `DMX output ${slot}`);
	if (!Array.isArray(output.fixtures) || output.fixtures.length > DMX_MAX_FIXTURES) {
		throw new Error(`DMX output ${slot} must contain at most ${DMX_MAX_FIXTURES} fixtures`);
	}

	writeUint16(bytes, DMX_UNIVERSE_SIZE);
	bytes.push(txGpio, output.fixtures.length);
	const usedChannels = new Set<number>();
	for (const [index, fixture] of output.fixtures.entries()) {
		if (typeof fixture !== 'object' || fixture === null) {
			throw new Error(`DMX fixture ${index + 1} must be an object`);
		}
		validateFixtureType(fixture.type, `DMX fixture ${index + 1} type`);
		if (!Array.isArray(fixture.coloring)) {
			throw new Error(`DMX fixture ${index + 1} coloring must be an array`);
		}
		validateFixtureChannels(fixture.startChannel, fixture.coloring.length, index);

		bytes.push(...new TextEncoder().encode(fixture.type), 0);
		writeUint16(bytes, fixture.startChannel);
		bytes.push(fixture.coloring.length);
		for (const [channel, coloring] of fixture.coloring.entries()) {
			const channelNumber = fixture.startChannel + channel;
			if (usedChannels.has(channelNumber)) {
				throw new Error(`DMX channel ${channelNumber} is assigned to more than one fixture`);
			}
			usedChannels.add(channelNumber);
			writeUint16(bytes, validateColoring(coloring, `DMX fixture ${index + 1} channel ${channel + 1}`));
		}
	}
};

const encodeRgb5050LightingConfig = (bytes: number[], output: Rgb5050LightingConfig, usedGpios: Set<number>, slot: number): void => {
	const redGpio = validateGpio(output.redGpio, false, `RGB5050 output ${slot} red GPIO`);
	const greenGpio = validateGpio(output.greenGpio, false, `RGB5050 output ${slot} green GPIO`);
	const blueGpio = validateGpio(output.blueGpio, false, `RGB5050 output ${slot} blue GPIO`);
	if (typeof output.activeLow !== 'boolean') {
		throw new Error(`RGB5050 output ${slot} activeLow must be a boolean`);
	}
	claimGpio(usedGpios, redGpio, `RGB5050 output ${slot}`);
	claimGpio(usedGpios, greenGpio, `RGB5050 output ${slot}`);
	claimGpio(usedGpios, blueGpio, `RGB5050 output ${slot}`);
	bytes.push(redGpio, greenGpio, blueGpio, output.activeLow ? 1 : 0);
};

const validateGpio = (value: number, optional: boolean, label: string): number => {
	if (Number.isInteger(value) && value >= 0 && value <= 0x7f) {
		return value;
	}
	if (optional && value === GPIO_NOT_CONNECTED) {
		return value;
	}
	throw new Error(`${label} must be a GPIO from 0 to 127${optional ? ' or 255 for not connected' : ''}`);
};

const claimGpio = (usedGpios: Set<number>, gpio: number, label: string): void => {
	if (usedGpios.has(gpio)) {
		throw new Error(`${label} reuses GPIO ${gpio}`);
	}
	usedGpios.add(gpio);
};

const validateFixtureType = (type: unknown, label: string): void => {
	if (typeof type !== 'string' || type.includes('\0')) {
		throw new Error(`${label} must be a NUL-free string`);
	}
	const length = new TextEncoder().encode(type).byteLength;
	if (length < 1 || length > DMX_MAX_FIXTURE_TYPE_BYTES) {
		throw new Error(`${label} must contain 1 to ${DMX_MAX_FIXTURE_TYPE_BYTES} UTF-8 bytes`);
	}
};

const validateFixtureChannels = (startChannel: number, channelCount: number, index: number): void => {
	if (!Number.isInteger(startChannel) || startChannel < 1 || startChannel > DMX_UNIVERSE_SIZE) {
		throw new Error(`DMX fixture ${index + 1} start channel must be from 1 to ${DMX_UNIVERSE_SIZE}`);
	}
	if (!Number.isInteger(channelCount) || channelCount < 1 || channelCount > DMX_MAX_FIXTURE_CHANNELS) {
		throw new Error(`DMX fixture ${index + 1} must contain 1 to ${DMX_MAX_FIXTURE_CHANNELS} channels`);
	}
	if (startChannel + channelCount - 1 > DMX_UNIVERSE_SIZE) {
		throw new Error(`DMX fixture ${index + 1} extends past channel ${DMX_UNIVERSE_SIZE}`);
	}
};

const validateColoring = (value: number, label: string): number => {
	if (!Number.isInteger(value) || value < 0 || (value > 0xff && (value < DMX_DYNAMIC_COLORING_MIN || value > DMX_DYNAMIC_COLORING_MAX))) {
		throw new Error(`${label} must be a fixed value from 0 to 255 or a supported dynamic coloring value`);
	}
	return value;
};

const encodeColor = (target: LightingTarget, red: number, green: number, blue: number): ArrayBuffer => {
	const bytes = new Uint8Array(7);
	const view = new DataView(bytes.buffer);
	view.setUint8(0, validateLightingTarget(target));
	view.setUint16(1, validateUint16(red, 'Red'), false);
	view.setUint16(3, validateUint16(green, 'Green'), false);
	view.setUint16(5, validateUint16(blue, 'Blue'), false);
	return bytes.buffer;
};

const validateLightingTarget = (target: LightingTarget): number => {
	if (!isLightingTarget(target)) {
		throw new Error('Lighting target must be slot 0, slot 1, or all');
	}
	return target === LIGHTING_TARGET_ALL ? 0xff : target;
};

const validateUint16 = (value: number, label: string): number => {
	if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
		throw new Error(`${label} must be an unsigned 16-bit integer`);
	}
	return value;
};

const writeUint16 = (bytes: number[], value: number): void => {
	bytes.push((value >>> 8) & 0xff, value & 0xff);
};
