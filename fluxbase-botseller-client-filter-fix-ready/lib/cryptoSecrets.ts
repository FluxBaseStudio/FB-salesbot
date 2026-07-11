import "server-only";

import crypto from "crypto";

function encryptionKey() {
  const raw = process.env.SECRET_ENCRYPTION_KEY;
  if (!raw || raw.length < 24) throw new Error("SECRET_ENCRYPTION_KEY musi mieć co najmniej 24 znaki.");
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(secret: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted_value: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    auth_tag: tag.toString("base64"),
    value_last4: secret.slice(-4),
  };
}

export function decryptSecret(record: { encrypted_value: string; iv: string; auth_tag: string }) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(record.iv, "base64"));
  decipher.setAuthTag(Buffer.from(record.auth_tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.encrypted_value, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
