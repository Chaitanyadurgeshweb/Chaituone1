import { Readable } from "stream";

export async function streamToBuffer(stream: any): Promise<Buffer> {
  // AWS SDK v3 may return a Readable stream
  if (!stream) return Buffer.alloc(0);
  if (stream instanceof Readable) {
    const chunks: any[] = [];
    for await (const chunk of stream) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    return Buffer.concat(chunks);
  }

  // Fallback async iterator
  const chunks: any[] = [];
  for await (const chunk of stream) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}
