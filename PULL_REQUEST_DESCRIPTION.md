## Add Presigned Upload Flow (50 MB limit)

This PR adds a presigned upload flow and example code to allow clients to upload files up to 50 MB directly to S3 to avoid FUNCTION_PAYLOAD_TOO_LARGE errors.

What's included
- src/presign.ts — Express endpoint to generate presigned PUT URLs, enforces MAX_UPLOAD_BYTES.
- src/function.ts — AWS Lambda handler that fetches the S3 object and verifies size.
- src/client-upload.ts — Browser example: request presign, upload file, notify serverless function.
- src/utils/streamToBuffer.ts — helper to read S3 GetObject streams.
- README_presigned_upload.md — usage and setup instructions.

Env variables
- AWS_REGION
- S3_BUCKET
- MAX_UPLOAD_BYTES (optional, default 52428800)
