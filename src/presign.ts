import express from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const app = express();
app.use(express.json());

// Max upload size allowed (50 MB)
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024);

app.post("/presign", async (req, res) => {
  try {
    const { filename, contentType, size } = req.body;
    if (!filename) return res.status(400).json({ error: "filename required" });
    if (typeof size === "number" && size > MAX_UPLOAD_BYTES) {
      return res.status(400).json({ error: `file too large (max ${MAX_UPLOAD_BYTES} bytes)` });
    }

    const key = `uploads/${Date.now()}-${filename}`;
    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType || "application/octet-stream",
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 300 }); // 5 minutes
    res.json({ url, key, maxBytes: MAX_UPLOAD_BYTES });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "failed to create presigned url" });
  }
});

export default app;
