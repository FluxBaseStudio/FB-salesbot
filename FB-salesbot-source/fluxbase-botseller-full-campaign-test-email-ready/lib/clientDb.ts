import "server-only";

import { encryptSecret } from "@/lib/cryptoSecrets";
import { hashPortalPassword } from "@/lib/clientPortalAuth";
import type { ClientPayload } from "@/lib/validation";

export function clientPayloadToDb(payload: ClientPayload) {
  const { smtp_pass, portal_password, ...plain } = payload;
  const dbPayload: Record<string, unknown> = { ...plain };

  if (smtp_pass?.trim()) {
    const encrypted = encryptSecret(smtp_pass.trim());
    dbPayload.smtp_pass_encrypted = encrypted.encrypted_value;
    dbPayload.smtp_pass_iv = encrypted.iv;
    dbPayload.smtp_pass_auth_tag = encrypted.auth_tag;
    dbPayload.smtp_pass_last4 = encrypted.value_last4;
  }

  if (portal_password?.trim()) {
    const hashed = hashPortalPassword(portal_password.trim());
    dbPayload.portal_password_hash = hashed.hash;
    dbPayload.portal_password_salt = hashed.salt;
    dbPayload.portal_password_last4 = hashed.last4;
  }

  return dbPayload;
}
