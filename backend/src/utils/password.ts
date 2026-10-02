import bcrypt from "bcryptjs";
import { scryptSync, timingSafeEqual } from "node:crypto";

const SALT_ROUNDS = 12;

export class PasswordService {
  hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, SALT_ROUNDS);
  }

  verify(plainText: string, passwordHash: string): Promise<boolean> {
    if (passwordHash.startsWith("$2")) return bcrypt.compare(plainText, passwordHash);
    const [salt, key] = passwordHash.split(":");
    if (!salt || !key || !/^[\da-f]+$/i.test(key) || key.length !== 128)
      return Promise.resolve(false);
    const actual = scryptSync(plainText, salt, 64);
    const expected = Buffer.from(key, "hex");
    return Promise.resolve(timingSafeEqual(actual, expected));
  }

  needsRehash(passwordHash: string): boolean {
    return !passwordHash.startsWith("$2");
  }

  async rehash(plainText: string): Promise<string> {
    return this.hash(plainText);
  }
}
