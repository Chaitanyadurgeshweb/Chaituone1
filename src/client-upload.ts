// Example browser-side flow (adapt to your frontend)
export default async function uploadFile(file: File) {
  // Enforce client-side size limit (50 MB)
  const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 50 * 1024 * 1024;
  if (file.size > MAX_BYTES) throw new Error(`File too large (max ${MAX_BYTES} bytes)`);

  // 1) Request presigned POST fields from your server
  const presignResp = await fetch("/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
  });
  if (!presignResp.ok) {
    const err = await presignResp.json().catch(() => ({}));
    throw new Error(`failed to get presign post: ${err.error || presignResp.statusText}`);
  }
  const { url, fields, key, maxBytes } = await presignResp.json();

  // 2) Upload directly to S3 using FormData (presigned POST)
  const form = new FormData();
  Object.entries(fields || {}).forEach(([k, v]) => form.append(k, v as any));
  form.append("file", file);
  const uploadResp = await fetch(url, { method: "POST", body: form });
  if (!uploadResp.ok) throw new Error("upload failed");

  // 3) Notify your processing endpoint with small payload (S3 key)
  const notifyResp = await fetch("/api/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, filename: file.name }),
  });
  return notifyResp.json();
}
