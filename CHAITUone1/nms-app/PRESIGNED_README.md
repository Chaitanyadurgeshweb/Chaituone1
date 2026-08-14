# NMS app: presigned upload and download

This change set adds a presigned upload flow for the NMS app so clients can upload large Excel files directly to S3 and avoid Vercel FUNCTION_PAYLOAD_TOO_LARGE errors.

Files added/modified:
- server/routes/presign.ts — POST /api/presign returns a presigned PUT URL and key
- server/routes/nms.ts — POST /api/process-nms now accepts S3 keys and downloads files from S3 before processing
- server/lib/streamToBuffer.ts — helper to read GetObject stream into Buffer
- src/components/NmsUpload.tsx — client now uploads files to S3 via presigned URLs then calls backend with small JSON

Env vars required:
- AWS_REGION
- S3_BUCKET
- MAX_UPLOAD_BYTES (optional, default 50 MB)

Permissions:
- Presign signer: s3:PutObject on prefix nms-uploads/*
- Processor: s3:GetObject on uploaded keys

S3 CORS must allow PUT from your web origin.
