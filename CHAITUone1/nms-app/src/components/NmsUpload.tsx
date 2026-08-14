/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useRef } from "react";
import apiFetch from "../lib/api";

export default function NmsUpload() {
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [companyFile, setCompanyFile] = useState<File | null>(null);
  const [sectionFiles, setSectionFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState("");

  const masterRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLInputElement>(null);

  function handleSectionFolder(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      f.name.match(/\.(xls|xlsx|xlsm)$/i)
    );
    setSectionFiles(files);
  }

  async function uploadToS3(file: File) {
    // Request presigned url
    const presignResp = await fetch("/api/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
    });
    if (!presignResp.ok) {
      const err = await presignResp.json().catch(() => ({}));
      throw new Error(err.error || "Failed to get presign url");
    }
    const { url, key } = await presignResp.json();

    // Upload directly to S3
    const putResp = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!putResp.ok) throw new Error("Upload to storage failed");
    return key;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!masterFile || !companyFile || sectionFiles.length === 0) {
      setError("Please select all required files.");
      return;
    }
    setError("");
    setResult(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setLoading(true);

    try {
      // Upload files to S3 using presigned URLs
      const masterKey = await uploadToS3(masterFile);
      const companyKey = await uploadToS3(companyFile);
      const sectionKeys: any[] = [];

      for (const f of sectionFiles) {
        const relativePath = (f as any).webkitRelativePath || f.name;
        const key = await uploadToS3(f);
        sectionKeys.push({ key, relativePath });
      }

      // Notify backend with small JSON payload
      const res = await apiFetch("/api/process-nms", {
        method: "POST",
        body: JSON.stringify({ masterKey, companyKey, sectionKeys }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Processing failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename =
        res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
        "result.xlsx";

      setDownloadUrl(url);
      setDownloadFilename(filename);
      setResult({
        eligibleLocos: Number(res.headers.get("X-Nms-Eligible-Locos") ?? 0),
        badLocos: Number(res.headers.get("X-Nms-Bad-Locos") ?? 0),
        totalTrials: Number(res.headers.get("X-Nms-Total-Trials") ?? 0),
        skippedFiles: Number(res.headers.get("X-Nms-Skipped-Files") ?? 0),
        ignoredGroups: Number(res.headers.get("X-Nms-Ignored-Groups") ?? 0),
        unmappedStations: Number(res.headers.get("X-Nms-Unmapped-Stations") ?? 0),
        unmappedStationsDetails: decodeURIComponent(
          res.headers.get("X-Nms-Unmapped-Stations-Details") ?? ""
        ),
        filename,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* UI omitted for brevity — keep existing inputs and buttons */}
      <div>
        <input ref={masterRef} type="file" accept=".xls,.xlsx,.xlsm" onChange={(e) => setMasterFile(e.target.files?.[0] ?? null)} />
        <input ref={companyRef} type="file" accept=".xls,.xlsx,.xlsm" onChange={(e) => setCompanyFile(e.target.files?.[0] ?? null)} />
        <input ref={sectionRef} type="file" webkitdirectory={true as any} multiple onChange={handleSectionFolder} />
      </div>
      <button type="submit" disabled={loading}>Process</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {downloadUrl && (
        <a href={downloadUrl} download={downloadFilename}>Download result</a>
      )}
    </form>
  );
}
