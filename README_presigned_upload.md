# Presigned upload flow (S3) — allow uploads up to 50 MB

This branch adds a presigned-upload flow so clients can upload large files (up to 50 MB) directly to S3, avoiding FUNCTION_PAYLOAD_TOO_LARGE errors when calling serverless functions.

Environment variables
- AWS_REGION - e.g. us-east-1
- S3_BUCKET - bucket name to upload to
- MAX_UPLOAD_BYTES - optional override (default 50 * 1024 * 1024 = 50 MB)

Notes and setup
1) CORS: Make sure your S3 bucket has CORS configured to allow PUT from your web origin. Example CORS:

```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
  </CORSRule>
</CORSConfiguration>
```

2) Server-side checks: The presign endpoint will reject client requests that include a size field larger than MAX_UPLOAD_BYTES. The processing function will also fetch the object and reject it if the stored object exceeds MAX_UPLOAD_BYTES.

3) Client-side checks: The provided client example enforces the same 50 MB limit before requesting a presigned URL.

4) Enforce size on the bucket (optional): For stronger server-side enforcement at upload time, consider using presigned POST with content-length-range conditions or S3 bucket policies.

Usage
- POST /presign { filename, contentType, size } -> { url, key }
- PUT the file bytes to returned url
- POST /api/process { key } -> serverless function reads the object from S3 and processes it

This avoids sending the large payload through serverless function invocations and supports uploads up to 50 MB.
