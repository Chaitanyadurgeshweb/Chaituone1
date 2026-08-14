import { Router } from "express";
import multer from "multer";
import { processNms } from "../lib/nms-processor.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/process-nms",
  upload.fields([
    { name: "masterFile", maxCount: 1 },
    { name: "companyFile", maxCount: 1 },
    { name: "sectionFiles", maxCount: 2000 },
  ]),
  async (req, res) => {
    try {
      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      const masterFile = files["masterFile"]?.[0];
      const companyFile = files["companyFile"]?.[0];
      const sectionFiles = files["sectionFiles"] ?? [];

      if (!masterFile || !companyFile || sectionFiles.length === 0) {
        res.status(400).json({
          error:
            "Missing required fields: masterFile, companyFile, sectionFiles",
        });
        return;
      }

      const sectionFileBuffers = sectionFiles.map((f) => ({
        relativePath: f.originalname,
        data: f.buffer,
      }));

      const { result, outputBuffer } = await processNms(
        masterFile.buffer,
        companyFile.buffer,
        sectionFileBuffers
      );

      const baseName = masterFile.originalname.replace(/\.[^.]+$/, "");
      const filename = `${baseName}_updated.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("X-Nms-Eligible-Locos", String(result.eligibleLocos));
      res.setHeader("X-Nms-Bad-Locos", String(result.badLocos));
      res.setHeader("X-Nms-Total-Trials", String(result.totalTrials));
      res.setHeader("X-Nms-Skipped-Files", String(result.skippedFiles.length));
      res.setHeader("X-Nms-Ignored-Groups", String(result.ignoredGroupsCount));
      res.setHeader(
        "X-Nms-Skipped-Details",
        encodeURIComponent(result.skippedFiles.slice(0, 3).join(" | "))
      );
      res.setHeader(
        "X-Nms-Unmapped-Stations",
        String(result.unmappedStations.length)
      );
      res.setHeader(
        "X-Nms-Unmapped-Stations-Details",
        encodeURIComponent(result.unmappedStations.slice(0, 20).join(", "))
      );

      res.send(outputBuffer);
    } catch (err) {
      console.error("NMS processing error:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Processing failed",
      });
    }
  }
);

export default router;
