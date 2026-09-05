import express, { Router } from "express";
import { processNms } from "../lib/nms-processor.js";

const router = Router();
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024);

router.post("/process-nms", express.json(), async (req, res) => {
  try {
    const { masterUrl, companyUrl, sectionUrls = [], filename } = req.body;
    if (!masterUrl || !companyUrl || !Array.isArray(sectionUrls) || sectionUrls.length === 0) {
      return res.status(400).json({ error: "missing masterUrl, companyUrl or sectionUrls" });
    }

    async function downloadUrlToBuffer(url: string): Promise<Buffer> {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`download failed: ${r.status} ${r.statusText}`);
      const ab = await r.arrayBuffer();
      const buf = Buffer.from(ab);
      if (buf.length > MAX_UPLOAD_BYTES) throw new Error(`file too large: ${url} (${buf.length} bytes)`);
      return buf;
    }

    const masterBuf = await downloadUrlToBuffer(masterUrl);
    const companyBuf = await downloadUrlToBuffer(companyUrl);
    const sectionFileBuffers = await Promise.all(
      sectionUrls.map(async (u: string) => ({
        relativePath: new URL(u).pathname.split("/").pop() || u,
        data: await downloadUrlToBuffer(u),
      }))
    );

    const { result, outputBuffer } = await processNms(masterBuf, companyBuf, sectionFileBuffers);

    const baseName = (filename || (new URL(masterUrl).pathname.split("/").pop() || "result")).replace(/\.[^.]+$/, "");
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
    console.error("Public-bucket NMS processing error:", err);
    if (err.message && err.message.startsWith("file too large")) {
      return res.status(413).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || "processing failed" });
  }
});

export default router;
