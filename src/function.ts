import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { streamToBuffer } from "./utils/streamToBuffer";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024);

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { key } = body;
    if (!key) return { statusCode: 400, body: JSON.stringify({ error: "missing key" }) };

    const get = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key });
    const resp = await s3.send(get);
    const buffer = await streamToBuffer(resp.Body as any);

    if (buffer.length > MAX_UPLOAD_BYTES) {
      return {
        statusCode: 413,
        body: JSON.stringify({ error: `uploaded object too large: ${buffer.length} bytes (max ${MAX_UPLOAD_BYTES})` }),
      };
    }

    // TODO: process buffer (e.g., parse, scan, transcode). Keep response small.
    return { statusCode: 200, body: JSON.stringify({ ok: true, size: buffer.length }) };
  } catch (err: any) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "processing failed" }) };
  }
};
