// Example browser-side flow (adapt to your frontend)
export default async function uploadFile(file: File) {
  // Enforce client-side size limit (50 MB)
  const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 50 * 1024 * 1024;
  if (file.size > MAX_BYTES) throw new Error(`File too large (max ${MAX_BYTES} bytes)`);

  // 1) Request presigned URL from your server
  const presignResp = await fetch("/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
  });
  if (!presignResp.ok) {
    const err = await presignResp.json().catch(() => ({}));
    throw new Error(`failed to get presign url: ${err.error || presignResp.statusText}`);
  }
  const { url, key, maxBytes } = await presignResp.json();

  // 2) Upload directly to S3 (PUT). Ensure CORS is configured on the bucket to allow this from your origin.
  const putResp = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putResp.ok) throw new Error("upload failed");

  // 3) Notify serverless function with small payload (reference key)
  const notifyResp = await fetch("/api/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, filename: file.name }),
  });
  return notifyResp.json();
}
