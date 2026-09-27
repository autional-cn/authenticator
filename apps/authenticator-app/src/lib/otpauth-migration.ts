/**
 * Google Authenticator migration (otpauth-migration) parser.
 *
 * Protocol: otpauth-migration://offline?data=<base64url-encoded protobuf>
 *
 * Protobuf schema (simplified):
 *   message Payload {
 *     repeated MigrationOtp parameters = 1;
 *   }
 *   message MigrationOtp {
 *     bytes  secret    = 1;
 *     string name      = 2;
 *     string issuer    = 3;
 *     int32  algorithm = 4; // 1=SHA1, 2=SHA256, 4=SHA512
 *     int32  digits    = 5; // 1=6, 2=8
 *     int32  type      = 6; // 1=hotp, 2=totp
 *     int64  counter   = 7;
 *   }
 */

export interface MigratedAccount {
	secret: string;
	name: string;
	issuer: string;
	type?: 'totp' | 'hotp';
	algorithm: 'SHA1' | 'SHA256' | 'SHA512';
	digits: number;
	period: number;
	counter?: number;
}

function base64UrlDecode(str: string): Uint8Array {
	const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
	const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

function bytesToBase32(bytes: Uint8Array): string {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	let bits = 0;
	let value = 0;
	let output = '';
	for (let i = 0; i < bytes.length; i++) {
		value = (value << 8) | bytes[i];
		bits += 8;
		while (bits >= 5) {
			output += alphabet[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}
	if (bits > 0) {
		output += alphabet[(value << (5 - bits)) & 31];
	}
	return output;
}

/** Simple protobuf wire parser for uint8 arrays. */
class ProtobufReader {
	private view: DataView;
	private offset = 0;

	constructor(private bytes: Uint8Array) {
		this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	}

	exhausted(): boolean {
		return this.offset >= this.bytes.length;
	}

	readVarint(): number {
		let value = 0;
		let shift = 0;
		while (this.offset < this.bytes.length) {
			const byte = this.bytes[this.offset++];
			value |= (byte & 0x7f) << shift;
			if ((byte & 0x80) === 0) break;
			shift += 7;
			if (shift > 28) break; // sanity limit for 32-bit
		}
		return value >>> 0; // unsigned
	}

	readField(): { tag: number; wire: number } | null {
		if (this.exhausted()) return null;
		const v = this.readVarint();
		return { tag: v >>> 3, wire: v & 0x7 };
	}

	readLengthDelimited(): Uint8Array {
		const len = this.readVarint();
		const slice = this.bytes.subarray(this.offset, this.offset + len);
		this.offset += len;
		return slice;
	}

	readVarintField(): number {
		return this.readVarint();
	}

	skipField(wire: number): void {
		switch (wire) {
			case 0: // varint
				this.readVarint();
				break;
			case 1: // 64-bit
				this.offset += 8;
				break;
			case 2: // length-delimited
				this.readLengthDelimited();
				break;
			case 5: // 32-bit
				this.offset += 4;
				break;
			default:
				throw new Error(`Unknown wire type: ${wire}`);
		}
	}
}

function parseMigrationOtp(bytes: Uint8Array): MigratedAccount | null {
	const reader = new ProtobufReader(bytes);
	let secretBytes = new Uint8Array(0);
	let name = '';
	let issuer = '';
	let algorithm = 1; // default SHA1
	let digits = 1; // default 6
	let type = 2; // default TOTP
	let counter = 0;

	while (!reader.exhausted()) {
		const field = reader.readField();
		if (!field) break;
		const { tag, wire } = field;
		if (wire !== 2 && wire !== 0) {
			reader.skipField(wire);
			continue;
		}
		switch (tag) {
			case 1: // secret
				secretBytes = new Uint8Array(reader.readLengthDelimited());
				break;
			case 2: // name
				name = new TextDecoder().decode(reader.readLengthDelimited());
				break;
			case 3: // issuer
				issuer = new TextDecoder().decode(reader.readLengthDelimited());
				break;
			case 4: // algorithm
				algorithm = reader.readVarintField();
				break;
			case 5: // digits
				digits = reader.readVarintField();
				break;
			case 6: // type
				type = reader.readVarintField();
				break;
			case 7: // counter
				counter = reader.readVarintField();
				break;
			default:
				reader.skipField(wire);
		}
	}

	if (secretBytes.length === 0) return null;

	const algoMap: Record<number, 'SHA1' | 'SHA256' | 'SHA512'> = {
		1: 'SHA1',
		2: 'SHA256',
		4: 'SHA512',
	};

	const account: MigratedAccount = {
		secret: bytesToBase32(secretBytes),
		name: issuer || name || 'Unknown',
		issuer: issuer || '',
		algorithm: algoMap[algorithm] || 'SHA1',
		digits: digits === 2 ? 8 : 6,
		period: 30,
	};

	if (type === 1) {
		account.counter = counter;
	}

	return account;
}

export function parseOtpauthMigration(uri: string): MigratedAccount[] {
	try {
		const url = new URL(uri);
		if (url.protocol !== 'otpauth-migration:') {
			throw new Error('Not an otpauth-migration URI');
		}
		const data = url.searchParams.get('data');
		if (!data) throw new Error('Missing data parameter');

		const payload = base64UrlDecode(data);
		const reader = new ProtobufReader(payload);
		const accounts: MigratedAccount[] = [];

		while (!reader.exhausted()) {
			const field = reader.readField();
			if (!field) break;
			const { tag, wire } = field;
			if (tag === 1 && wire === 2) {
				const otpBytes = reader.readLengthDelimited();
				const otp = parseMigrationOtp(otpBytes);
				if (otp) accounts.push(otp);
			} else {
				reader.skipField(wire);
			}
		}

		return accounts;
	} catch (err) {
		console.error('Failed to parse otpauth-migration:', err);
		return [];
	}
}

export function isOtpauthMigrationUri(uri: string): boolean {
	return uri.startsWith('otpauth-migration://');
}
