
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

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

async function deleteFromS3({ bucket, key }) {
  await s3.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  }));
}

module.exports = { uploadToS3, deleteFromS3 };