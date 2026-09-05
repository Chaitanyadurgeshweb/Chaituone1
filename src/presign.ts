import express from "express";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const app = express();
app.use(express.json());

// Max upload size allowed (default 50 MB)
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024);

app.post("/presign", async (req, res) => {
  try {
    const { filename, contentType, size } = req.body;
    if (!filename) return res.status(400).json({ error: "filename required" });
    if (typeof size === "number" && size > MAX_UPLOAD_BYTES) {
      return res.status(400).json({ error: `file too large (max ${MAX_UPLOAD_BYTES} bytes)` });
    }

    const key = `uploads/${Date.now()}-${filename}`;

    // Create a presigned POST with a content-length-range condition so S3 enforces the max size
    const post = await createPresignedPost(s3, {
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Conditions: [["content-length-range", 0, MAX_UPLOAD_BYTES]],
      Expires: 300, // seconds
    });

    res.json({ url: post.url, fields: post.fields, key, maxBytes: MAX_UPLOAD_BYTES });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "failed to create presigned post" });
  }
});

export default app;
