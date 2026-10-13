import {
  randomBytes,
  scrypt,
  timingSafeEqual
} from "node:crypto";

const SCRYPT_N = 2 ** 17;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 192 * 1024 * 1024;
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const FORMAT = "scrypt";
const DUMMY_SALT = Buffer.alloc(SALT_BYTES, 0xa5);
const DUMMY_KEY = Buffer.alloc(KEY_BYTES, 0x5a);

function derivePasswordKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_BYTES,
      {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: SCRYPT_MAXMEM
      },
      (error, derivedKey) => {
        if (error !== null) {
          reject(error);
          return;
        }

        resolve(Buffer.from(derivedKey));
      }
    );
  });
}

type ParsedPasswordHash = Readonly<{
  salt: Buffer;
  key: Buffer;
}>;

function parsePasswordHash(encodedHash: string): ParsedPasswordHash | null {
  const [format, n, r, p, saltEncoded, keyEncoded, ...rest] = encodedHash.split("$");

  if (
    rest.length > 0 ||
    format !== FORMAT ||
    n !== String(SCRYPT_N) ||
    r !== String(SCRYPT_R) ||
    p !== String(SCRYPT_P) ||
    saltEncoded === undefined ||
    keyEncoded === undefined
  ) {
    return null;
  }

  const salt = Buffer.from(saltEncoded, "base64url");
  const key = Buffer.from(keyEncoded, "base64url");

  if (salt.length !== SALT_BYTES || key.length !== KEY_BYTES) {
    return null;
  }

  return { salt, key };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derivePasswordKey(password, salt);

  return [
    FORMAT,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    key.toString("base64url")
  ].join("$");
}

export async function verifyPassword(
  password: string,
  encodedHash: string | null
): Promise<boolean> {
  const parsed = encodedHash === null ? null : parsePasswordHash(encodedHash);

  if (parsed === null) {
    const derived = await derivePasswordKey(password, DUMMY_SALT);
    timingSafeEqual(derived, DUMMY_KEY);
    return false;
  }

  const derived = await derivePasswordKey(password, parsed.salt);
  return timingSafeEqual(derived, parsed.key);
}
