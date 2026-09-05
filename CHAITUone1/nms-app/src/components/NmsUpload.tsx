import { useRef, useState } from "react";
import {
  FileSpreadsheet,
  FolderOpen,
  Settings,
  Upload,
  CheckCircle2,
  Activity,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import uploadNmsFiles from "../client-upload";

interface ProcessResult {
  eligibleLocos: number;
  badLocos: number;
  totalTrials: number;
  skippedFiles: number;
  ignoredGroups: number;
  unmappedStations: number;
  unmappedStationsDetails: string;
  filename: string;
}

export default function NmsUpload() {
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [companyFile, setCompanyFile] = useState<File | null>(null);
  const [sectionFiles, setSectionFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProcessResult | null>(null);
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
      // Upload files directly to Supabase from the browser
      const { masterPath, companyPath, sectionPaths } = await uploadNmsFiles({
        masterFile,
        companyFile,
        sectionFiles,
      });

      // Send small JSON payload to the server with the Supabase paths
      const res = await apiFetch("/api/process-nms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterPath, companyPath, sectionPaths, filename: masterFile.name }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Processing failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename =
        res.headers.get("Content-Disposition")?.match(/filename="([^\"]+)"/)?.[1] ??
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

  const ready = !!masterFile && !!companyFile && sectionFiles.length > 0;
  const readyCount = [masterFile, companyFile, sectionFiles.length > 0].filter(Boolean).length;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0d1117", color: "#e6edf3" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: "#21262d" }}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded" style={{ background: "rgba(249,115,22,0.15)" }}>
            <Activity size={18} style={{ color: "#f97316" }} />
          </div>
          <div>
            <div className="text-sm font-bold font-mono" style={{ color: "#f97316" }}>
              Chaitu-TX-NMS
            </div>
            <div className="text-xs" style={{ color: "#8b949e" }}>
              Network Management System Analyzer
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold font-mono" style={{ color: "#e6edf3" }}>
                Data Ingestion
              </h2>
              <p className="text-xs mt-1" style={{ color: "#8b949e" }}>
                Dates are auto-detected from section files — no manual entry needed
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: ready ? "#22c55e" : "#f97316" }}
              />
              <span
                className="text-xs font-mono"
                style={{ color: ready ? "#22c55e" : "#f97316" }}
              >
                {readyCount} / 3 ready
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Master File */}
            <FileRow
              icon={<FileSpreadsheet size={18} style={{ color: masterFile ? "#22c55e" : "#f97316" }} />}
              label="Master Excel Roster"
              hint={masterFile ? masterFile.name : "No file selected — .xlsx format required"}
              accent={!masterFile}
              done={!!masterFile}
              onClick={() => masterRef.current?.click()}
            />
            <input
              ref={masterRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => setMasterFile(e.target.files?.[0] ?? null)}
            />

            {/* Company File */}
            <FileRow
              icon={<Settings size={18} style={{ color: companyFile ? "#22c55e" : "#8b949e" }} />}
              label="Company Mapping File"
              hint={companyFile ? companyFile.name : "No file selected — .xls / .xlsx / .xlsm"}
              done={!!companyFile}
              onClick={() => companyRef.current?.click()}
            />
            <input
              ref={companyRef}
              type="file"
              accept=".xls,.xlsx,.xlsm"
              className="hidden"
              onChange={(e) => setCompanyFile(e.target.files?.[0] ?? null)}
            />

            {/* Section Folder */}
            <FileRow
              icon={<FolderOpen size={18} style={{ color: sectionFiles.length > 0 ? "#22c55e" : "#8b949e" }} />}
              label="Section Data Folder"
              hint={
                sectionFiles.length > 0
                  ? `${sectionFiles.length} Excel file(s) selected`
                  : "No folder selected — contains subdirectory per section"
              }
              done={sectionFiles.length > 0}
              onClick={() => sectionRef.current?.click()}
            />
            <input
              ref={sectionRef}
              type="file"
              // @ts-expect-error webkitdirectory is non-standard
              webkitdirectory="true"
              multiple
              className="hidden"
              onChange={handleSectionFolder}
            />

            {/* Auto-date notice */}
            <div
              className="flex items-center gap-3 px-5 py-3.5 rounded-xl border"
              style={{ borderColor: "rgba(139,148,158,0.2)", background: "#161b22" }}
            >
              <CheckCircle2 size={15} style={{ color: "#58a6ff", flexShrink: 0 }} />
              <p className="text-xs font-mono" style={{ color: "#8b949e" }}>
                Trial dates are read automatically from the{" "}
                <span style={{ color: "#58a6ff" }}>date / from / trialdate</span>{" "}
                column in each section file. Multiple dates per run are fully supported.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-mono"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#f87171",
                }}
              >
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !ready}
              className="w-full py-4 rounded-xl font-mono font-bold text-base tracking-widest flex items-center justify-center gap-3 transition-all"
              style={{
                background: ready && !loading ? "#f97316" : "#161b22",
                color: ready && !loading ? "#0d1117" : "#30363d",
                border: ready && !loading ? "none" : "1px solid #21262d",
                cursor: loading ? "wait" : ready ? "pointer" : "not-allowed",
              }}
            >
              <Upload size={20} />
              {loading ? "PROCESSING..." : "INITIALIZE ANALYSIS"}
            </button>
          </form>

          {/* Result */}
          {result && downloadUrl && (
            <div
              className="mt-6 p-5 rounded-xl border"
              style={{
                background: "rgba(34,197,94,0.05)",
                borderColor: "rgba(34,197,94,0.2)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={16} style={{ color: "#22c55e" }} />
                <span className="text-sm font-mono font-bold" style={{ color: "#22c55e" }}>
                  Analysis complete
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Stat label="Eligible Locos" value={result.eligibleLocos} />
                <Stat label="Bad Locos" value={result.badLocos} color="#f87171" />
                <Stat label="Total Trials" value={result.totalTrials} color="#58a6ff" />
                <Stat label="Skipped Files" value={result.skippedFiles} />
                <Stat label="Ignored Groups" value={result.ignoredGroups} />
                <Stat
                  label="Unmapped Stations"
                  value={result.unmappedStations}
                  color={result.unmappedStations > 0 ? "#facc15" : "#e6edf3"}
                />
              </div>
              {result.unmappedStations > 0 && (
                <div
                  className="flex items-start gap-2 px-4 py-3 mb-4 rounded-xl text-xs font-mono"
                  style={{
                    background: "rgba(250,204,21,0.08)",
                    border: "1px solid rgba(250,204,21,0.25)",
                    color: "#facc15",
                  }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    {result.unmappedStations} station code(s) weren't found in the
                    station list, so their section was guessed from the upload
                    folder name instead: {result.unmappedStationsDetails}
                  </span>
                </div>
              )}
              <a
                href={downloadUrl}
                download={downloadFilename}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-mono font-bold text-sm"
                style={{ background: "#22c55e", color: "#0d1117" }}
              >
                Download {downloadFilename}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileRow({
  icon,
  label,
  hint,
  accent = false,
  done = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  accent?: boolean;
  done?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all"
      style={{
        background: "#0d1117",
        borderColor: done
          ? "rgba(34,197,94,0.3)"
          : accent
          ? "rgba(249,115,22,0.3)"
          : "#21262d",
      }}
    >
      <div
        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
        style={{
          background: done
            ? "rgba(34,197,94,0.12)"
            : accent
            ? "rgba(249,115,22,0.12)"
            : "#161b22",
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold" style={{ color: "#e6edf3" }}>
          {label}
        </div>
        <div
          className="text-xs mt-0.5 font-mono truncate"
          style={{ color: done ? "#22c55e" : "#8b949e" }}
        >
          {hint}
        </div>
      </div>
      <span
        className="text-xs px-2.5 py-1 rounded-full font-mono"
        style={{
          background: "#161b22",
          color: done ? "#22c55e" : "#8b949e",
          border: `1px solid ${done ? "rgba(34,197,94,0.3)" : "#21262d"}`,
        }}
      >
        {done ? "Ready" : "Browse"}
      </span>
    </button>
  );
}

function Stat({
  label,
  value,
  color = "#e6edf3",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div
      className="px-3 py-2.5 rounded-lg"
      style={{ background: "#161b22", border: "1px solid #21262d" }}
    >
      <div className="text-xs font-mono" style={{ color: "#8b949e" }}>
        {label}
      </div>
      <div className="text-xl font-bold font-mono mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
