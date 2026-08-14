Redeploy triggered by Copilot on 2026-08-14T06:35:00Z

This is a no-op commit to trigger a redeploy on Vercel. If deployment fails, ensure the following are set in Vercel Project > Settings > Environment Variables:
- AWS_REGION
- S3_BUCKET
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- MAX_UPLOAD_BYTES (optional, default 52428800)

Also make sure S3 CORS and IAM permissions are configured as described in CHAITUone1/nms-app/PRESIGNED_README.md
