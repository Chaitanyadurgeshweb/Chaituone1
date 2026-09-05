import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { processNms } from "../lib/nms-processor.js";

const router = Router();
const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const BUCKET = process.env.SUPABASE_BUCKET!;
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024);

router.post("/process-nms", express.json(), async (req, res) => {
  try {
    const { masterPath, companyPath, sectionPaths = [], filename } = req.body;
    if (!masterPath || !companyPath || !Array.isArray(sectionPaths) || sectionPaths.length === 0) {
      return res.status(400).json({ error: "missing masterPath, companyPath or sectionPaths" });
    }

    // Helper to download from Supabase and return a Buffer
    async function downloadToBuffer(path: string): Promise<Buffer> {
      const { data, error } = await supa.storage.from(BUCKET).download(path);
      if (error || !data) throw error || new Error("download failed");
      const ab = await (data as any).arrayBuffer();
      const buf = Buffer.from(ab);
      if (buf.length > MAX_UPLOAD_BYTES) throw new Error(`file too large: ${path} (${buf.length} bytes)`);
      return buf;
    }

    const masterBuf = await downloadToBuffer(masterPath);
    const companyBuf = await downloadToBuffer(companyPath);
    const sectionFileBuffers = await Promise.all(
      sectionPaths.map(async (p: string) => ({
        relativePath: p.split("/").slice(1).join("/"), // keep a readable relative path
        data: await downloadToBuffer(p),
      }))
    );

    const { result, outputBuffer } = await processNms(masterBuf, companyBuf, sectionFileBuffers);

    const baseName = (filename || masterPath.split("/").pop() || "result").replace(/\.[^.]+$/, "");
    const outFilename = `${baseName}_updated.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${outFilename}"`);
    res.setHeader("X-Nms-Eligible-Locos", String(result.eligibleLocos));
    res.setHeader("X-Nms-Bad-Locos", String(result.badLocos));
    res.setHeader("X-Nms-Total-Trials", String(result.totalTrials));
    res.setHeader("X-Nms-Skipped-Files", String(result.skippedFiles.length));
    res.setHeader("X-Nms-Ignored-Groups", String(result.ignoredGroupsCount));
    res.setHeader("X-Nms-Skipped-Details", encodeURIComponent(result.skippedFiles.slice(0, 3).join(" | ")));
    res.setHeader("X-Nms-Unmapped-Stations", String(result.unmappedStations.length));
    res.setHeader("X-Nms-Unmapped-Stations-Details", encodeURIComponent(result.unmappedStations.slice(0, 20).join(", ")));

    res.send(outputBuffer);
  } catch (err: any) {
    console.error("Supabase NMS processing error:", err);
    if (err.message && err.message.startsWith("file too large")) {
      return res.status(413).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || "processing failed" });
  }
});

export default router;
