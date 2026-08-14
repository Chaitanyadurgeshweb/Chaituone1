import { Router } from "express";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { streamToBuffer } from "../lib/streamToBuffer.js";
import { processNms } from "../lib/nms-processor.js";

const router = Router();
const s3 = new S3Client({ region: process.env.AWS_REGION });
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024);

router.post("/process-nms", async (req, res) => {
  try {
    const { masterKey, companyKey, sectionKeys } = req.body as any;
    if (!masterKey || !companyKey || !Array.isArray(sectionKeys) || sectionKeys.length === 0) {
      return res.status(400).json({ error: "Missing masterKey, companyKey or sectionKeys" });
    }

    async function fetchBuffer(key: string) {
      const cmd = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key });
      const resp = await s3.send(cmd);
      const buffer = await streamToBuffer(resp.Body as any);
      return buffer;
    }

    const masterBuffer = await fetchBuffer(masterKey);
    const companyBuffer = await fetchBuffer(companyKey);

    if (masterBuffer.length > MAX_UPLOAD_BYTES || companyBuffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ error: "One of the input files exceeds the maximum allowed size" });
    }

    const sectionFileBuffers = await Promise.all(
      sectionKeys.map(async (s: { key: string; relativePath?: string }) => {
        const buf = await fetchBuffer(s.key);
        return { relativePath: s.relativePath || s.key, data: buf };
      })
    );

    // Optional: check total size limits
    const totalSize = masterBuffer.length + companyBuffer.length + sectionFileBuffers.reduce((a, b) => a + b.data.length, 0);
    console.log("Total input bytes:", totalSize);

    const { result, outputBuffer } = await processNms(masterBuffer, companyBuffer, sectionFileBuffers as any);

    const baseName = "result";
    const filename = `${baseName}_updated.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("X-Nms-Eligible-Locos", String(result.eligibleLocos));
    res.setHeader("X-Nms-Bad-Locos", String(result.badLocos));
    res.setHeader("X-Nms-Total-Trials", String(result.totalTrials));
    res.setHeader("X-Nms-Skipped-Files", String(result.skippedFiles.length));
    res.setHeader("X-Nms-Ignored-Groups", String(result.ignoredGroupsCount));
    res.setHeader(
      "X-Nms-Skipped-Details",
      encodeURIComponent(result.skippedFiles.slice(0, 3).join(" | "))
    );
    res.setHeader("X-Nms-Unmapped-Stations", String(result.unmappedStations.length));
    res.setHeader(
      "X-Nms-Unmapped-Stations-Details",
      encodeURIComponent(result.unmappedStations.slice(0, 20).join(", "))
    );

    res.send(outputBuffer);
  } catch (err: any) {
    console.error("NMS processing error:", err);
    res.status(500).json({ error: err?.message || "Processing failed" });
  }
});

export default router;
