import { hkdf } from 'node:crypto';
import { promisify } from 'node:util';
import { type InputBuffer, toDataView } from '../utils/buffer';
import type { IHkdfCrypto } from './hkdf.interface';

// -----------------------------------------------------------------------------

const hkdfAsync = promisify(hkdf);

// -----------------------------------------------------------------------------

export const createHkdfCrypto = (): IHkdfCrypto => {
	return new NodeHkdfCrypto();
};

// -----------------------------------------------------------------------------

class NodeHkdfCrypto implements IHkdfCrypto {
	public async deriveKey(key: InputBuffer, salt: InputBuffer, info: InputBuffer, keyLen: number): Promise<ArrayBuffer> {
		return hkdfAsync('sha256', toDataView(key), toDataView(salt), toDataView(info), keyLen);
	}
}
