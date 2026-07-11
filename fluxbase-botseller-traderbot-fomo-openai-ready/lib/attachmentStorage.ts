import "server-only";

import { adminDb } from "@/lib/supabaseAdmin";

export const CAMPAIGN_ATTACHMENTS_BUCKET = process.env.SUPABASE_ATTACHMENTS_BUCKET || "campaign-attachments";
export const SIGNUP_ORDER_ATTACHMENTS_BUCKET = process.env.SUPABASE_ORDER_ATTACHMENTS_BUCKET || CAMPAIGN_ATTACHMENTS_BUCKET;

type StoredAttachment = {
  file_name: string;
  mime_type?: string | null;
  file_data_base64?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
};

function safePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 140) || "file";
}

export function attachmentStoragePath(args: { clientId: string; campaignId: string; attachmentId: string; fileName: string }) {
  return `${args.clientId}/${args.campaignId}/${args.attachmentId}-${safePathPart(args.fileName)}`;
}

export function signupOrderAttachmentStoragePath(args: { orderId: string; attachmentId: string; fileName: string }) {
  return `signup-orders/${args.orderId}/${args.attachmentId}-${safePathPart(args.fileName)}`;
}

export async function ensureAttachmentBucket(bucketName = CAMPAIGN_ATTACHMENTS_BUCKET) {
  const storage = adminDb().storage;
  const { data: buckets } = await storage.listBuckets();
  if (buckets?.some((bucket) => bucket.name === bucketName)) return;
  await storage.createBucket(bucketName, { public: false, fileSizeLimit: 5 * 1024 * 1024 });
}

export async function uploadAttachmentToStorage(args: { path: string; buffer: Buffer; mimeType: string; bucket?: string }) {
  const bucket = args.bucket || CAMPAIGN_ATTACHMENTS_BUCKET;
  await ensureAttachmentBucket(bucket);
  const { error } = await adminDb().storage.from(bucket).upload(args.path, args.buffer, {
    contentType: args.mimeType,
    upsert: true,
  });
  if (error) throw error;
  return { bucket, path: args.path };
}

export async function uploadCampaignAttachmentToStorage(args: { path: string; buffer: Buffer; mimeType: string }) {
  return uploadAttachmentToStorage({ ...args, bucket: CAMPAIGN_ATTACHMENTS_BUCKET });
}

export async function uploadSignupOrderAttachmentToStorage(args: { path: string; buffer: Buffer; mimeType: string }) {
  return uploadAttachmentToStorage({ ...args, bucket: SIGNUP_ORDER_ATTACHMENTS_BUCKET });
}

export async function removeCampaignAttachmentFromStorage(path: string | null | undefined, bucket = CAMPAIGN_ATTACHMENTS_BUCKET) {
  if (!path) return;
  const { error } = await adminDb().storage.from(bucket).remove([path]);
  if (error) console.error("attachment storage remove failed", error.message);
}

export async function attachmentToMailerPayload(attachment: StoredAttachment) {
  const fileName = String(attachment.file_name || "zalacznik");
  const mimeType = attachment.mime_type || "application/octet-stream";
  if (attachment.storage_path) {
    const bucket = attachment.storage_bucket || CAMPAIGN_ATTACHMENTS_BUCKET;
    const { data, error } = await adminDb().storage.from(bucket).download(attachment.storage_path);
    if (error) throw error;
    const buffer = Buffer.from(await data.arrayBuffer());
    return { file_name: fileName, mime_type: mimeType, file_data_base64: buffer.toString("base64") };
  }
  return { file_name: fileName, mime_type: mimeType, file_data_base64: String(attachment.file_data_base64 || "") };
}
