
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const path = require('path');
const { randomUUID } = require('crypto');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function uploadToS3({ bucket, key, body, contentType }) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    // ACL: "public-read", // ⚠️ дивись блок нижче про ACL
  }));

  // Публічний URL (якщо bucket/public policy це дозволяє)
  return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

async function uploadManyToS3({ bucket, baseKeyPrefix, files }) {
  if (!Array.isArray(files) || files.length === 0) return [];
  if (!baseKeyPrefix) throw new Error('baseKeyPrefix is required');

  const uploads = files.map((file, index) => {
    const body = Buffer.isBuffer(file) ? file : file?.buffer;
    if (!body) throw new Error(`Missing file buffer at index ${index}`);
    const contentType = file?.mimetype || file?.contentType || 'application/octet-stream';
    const ext = file?.originalname ? path.extname(file.originalname) : '';
    const key = `${baseKeyPrefix}/${index + 1}-${randomUUID()}${ext}`;

    return uploadToS3({
      bucket,
      key,
      body,
      contentType,
    });
  });

  return Promise.all(uploads);
}

async function deleteFromS3({ bucket, key }) {
  await s3.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  }));
}

module.exports = { uploadToS3, uploadManyToS3, deleteFromS3 };
