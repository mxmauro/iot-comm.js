import type { InputBuffer } from './buffer';
import { chunkInputBuffer, getInputBufferSize } from './buffer';

// Describes the supported firmware image sources accepted by OTA uploads.
export type OtaImageSource = InputBuffer | Blob | Iterable<InputBuffer> | AsyncIterable<InputBuffer>;

// Reports OTA upload progress after each successfully written chunk.
export type OtaProgress = {
	sentBytes: number;
	totalBytes: number;
	chunkBytes: number;
	chunkIndex: number;
};

// Configures a full OTA firmware upload operation.
export type OtaUploadOptions = {
	image: OtaImageSource;
	imageSize?: number;
	chunkSize?: number;
	signal?: AbortSignal;
	onProgress?: (progress: OtaProgress) => void | Promise<void>;
};

const isBlob = (value: unknown): value is Blob => {
	return typeof Blob !== 'undefined' && value instanceof Blob;
};

const isAsyncIterable = (value: unknown): value is AsyncIterable<InputBuffer> => {
	return typeof value === 'object' && value !== null && Symbol.asyncIterator in value;
};

const isIterable = (value: unknown): value is Iterable<InputBuffer> => {
	return typeof value === 'object' && value !== null && Symbol.iterator in value;
};

// Validates that an OTA image size fits the protocol requirements.
export const validateOtaImageSize = (imageSize: number): number => {
	if (!Number.isInteger(imageSize) || imageSize < 1 || imageSize > 0xffffffff) {
		throw new Error('Invalid OTA image size');
	}
	return imageSize;
};

const getKnownOtaImageSize = (image: OtaImageSource): number | null => {
	if (isBlob(image)) {
		return image.size;
	}
	if (isAsyncIterable(image) || isIterable(image)) {
		return null;
	}
	return getInputBufferSize(image, 'Image');
};

// Resolves and validates the total size of an OTA image source.
export const resolveOtaImageSize = (image: OtaImageSource, imageSize?: number): number => {
	const knownSize = getKnownOtaImageSize(image);
	if (typeof imageSize === 'undefined') {
		if (knownSize === null) {
			throw new Error('imageSize is required when image is provided as an iterable source');
		}
		return validateOtaImageSize(knownSize);
	}

	validateOtaImageSize(imageSize);
	if (knownSize !== null && knownSize !== imageSize) {
		throw new Error(`imageSize does not match the provided image data (${knownSize} bytes)`);
	}

	return imageSize;
};

// Validates that an OTA chunk size stays within the allowed payload limit.
export const validateOtaChunkSize = (chunkSize: number, maxChunkSize: number): number => {
	if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > maxChunkSize) {
		throw new Error(`Invalid OTA chunk size (max ${maxChunkSize} bytes)`);
	}
	return chunkSize;
};

async function* chunkBlob(data: Blob, chunkSize: number): AsyncGenerator<Uint8Array> {
	for (let offset = 0; offset < data.size; offset += chunkSize) {
		const chunk = await data.slice(offset, Math.min(offset + chunkSize, data.size)).arrayBuffer();
		yield new Uint8Array(chunk);
	}
}

async function* chunkIterableSource(
	data: Iterable<InputBuffer> | AsyncIterable<InputBuffer>,
	chunkSize: number
): AsyncGenerator<Uint8Array> {
	for await (const part of data) {
		yield* chunkInputBuffer(part, chunkSize);
	}
}

// Produces OTA payload chunks from a supported image source.
export const iterateOtaChunks = (image: OtaImageSource, chunkSize: number): AsyncGenerator<Uint8Array> => {
	if (isBlob(image)) {
		return chunkBlob(image, chunkSize);
	}
	if (isAsyncIterable(image) || isIterable(image)) {
		return chunkIterableSource(image, chunkSize);
	}
	return chunkInputBuffer(image, chunkSize);
};
