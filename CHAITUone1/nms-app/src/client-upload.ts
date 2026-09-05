import { createBrowserClient } from "../lib/supabaseClient";

const supabase = createBrowserClient();

export default async function uploadNmsFiles({
  masterFile,
  companyFile,
  sectionFiles,
}: {
  masterFile: File;
  companyFile: File;
  sectionFiles: File[];
}) {
  const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024);
  if (masterFile.size > MAX_BYTES || companyFile.size > MAX_BYTES) {
    throw new Error("master or company file too large");
  }
  for (const f of sectionFiles) {
    if (f.size > MAX_BYTES) throw new Error(`section file too large: ${f.name}`);
  }

  const bucket = (import.meta.env.VITE_SUPABASE_BUCKET as string) || (process.env.SUPABASE_BUCKET as string);
  if (!bucket) throw new Error("SUPABASE_BUCKET not configured");

  const ts = Date.now();
  const masterPath = `uploads/${ts}-master-${masterFile.name}`;
  const companyPath = `uploads/${ts}-company-${companyFile.name}`;

  // upload master
  let { error } = await supabase.storage.from(bucket).upload(masterPath, masterFile);
  if (error) throw error;

  // upload company
  ({ error } = await supabase.storage.from(bucket).upload(companyPath, companyFile));
  if (error) throw error;

  // upload sections (preserve relative path if possible)
  const sectionPaths: string[] = [];
  for (const f of sectionFiles) {
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    const path = `uploads/${ts}-section-${rel}`;
    const { error: err } = await supabase.storage.from(bucket).upload(path, f);
    if (err) throw err;
    sectionPaths.push(path);
  }

  // Convert uploaded object paths to public URLs (requires the bucket to be public)
  const masterUrl = supabase.storage.from(bucket).getPublicUrl(masterPath).data?.publicUrl;
  const companyUrl = supabase.storage.from(bucket).getPublicUrl(companyPath).data?.publicUrl;
  const sectionUrls = sectionPaths.map((p) => supabase.storage.from(bucket).getPublicUrl(p).data?.publicUrl || p);

  if (!masterUrl || !companyUrl) throw new Error("failed to generate public URLs");

  return { masterUrl, companyUrl, sectionUrls };
}
