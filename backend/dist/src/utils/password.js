import bcrypt from "bcryptjs";
import { scryptSync, timingSafeEqual } from "node:crypto";
const SALT_ROUNDS = 12;
export class PasswordService {
    hash(plainText) {
        return bcrypt.hash(plainText, SALT_ROUNDS);
    }
    verify(plainText, passwordHash) {
        if (passwordHash.startsWith("$2"))
            return bcrypt.compare(plainText, passwordHash);
        const [salt, key] = passwordHash.split(":");
        if (!salt || !key || !/^[\da-f]+$/i.test(key) || key.length !== 128)
            return Promise.resolve(false);
        const actual = scryptSync(plainText, salt, 64);
        const expected = Buffer.from(key, "hex");
        return Promise.resolve(timingSafeEqual(actual, expected));
    }
    needsRehash(passwordHash) {
        return !passwordHash.startsWith("$2");
    }
    async rehash(plainText) {
        return this.hash(plainText);
    }
}
