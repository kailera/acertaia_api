import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

// Create an admin client for server-side Storage access.
// Requires SUPABASE_URL and SUPABASE_SERVICE_KEY to be set.
export const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

export type UploadTarget = {
  bucket: string;
  path: string; // e.g. "userId/unique-file.ext"
};

export async function ensureBucketExists(bucket: string, isPublic = false) {
  if (!supabaseAdmin) {
    throw new Error(
      "Supabase Storage not configured: set SUPABASE_URL and SUPABASE_SERVICE_KEY",
    );
  }
  const { data, error } = await supabaseAdmin.storage.getBucket(bucket);
  if (error && error.message && !/not found/i.test(error.message)) {
    // If got an unexpected error, bubble it up
    throw error;
  }
  if (!data) {
    const { error: createErr } = await supabaseAdmin.storage.createBucket(
      bucket,
      { public: isPublic },
    );
    if (createErr) throw createErr;
  }
}

export async function uploadBuffer(
  target: UploadTarget,
  buffer: Buffer,
  contentType?: string,
) {
  if (!supabaseAdmin) {
    throw new Error(
      "Supabase Storage not configured: set SUPABASE_URL and SUPABASE_SERVICE_KEY",
    );
  }

  const { bucket, path } = target;
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });
  if (error) throw error;
  return data;
}

export async function createSignedUrl(
  target: UploadTarget,
  expiresInSeconds = 600,
) {
  if (!supabaseAdmin) {
    throw new Error(
      "Supabase Storage not configured: set SUPABASE_URL and SUPABASE_SERVICE_KEY",
    );
  }
  const { bucket, path } = target;
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
