import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { config } from "../config.js";

export function getS3Client() {
  if (!config.storage.accessKeyId || !config.storage.secretAccessKey) {
    throw new Error("AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is not configured");
  }

  return new S3Client({
    region: config.storage.region,
    endpoint: config.storage.endpoint,
    credentials: {
      accessKeyId: config.storage.accessKeyId,
      secretAccessKey: config.storage.secretAccessKey,
    },
    forcePathStyle: true, // Required for Neon Object Storage
  });
}

export async function testObjectStorage() {
  const s3 = getS3Client();
  const bucket = config.storage.bucket;
  const testKey = `analytics-report-${Date.now()}.json`;
  const reportData = {
    reportId: testKey,
    reportTitle: "Creator Analytics Summary",
    generatedAt: new Date().toISOString(),
    metrics: {
      totalImpressions: 540000,
      engagementRate: "7.8%",
      topVideo: "Getting Started with Neon",
    },
  };

  // 1. Upload an object to the bucket
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: JSON.stringify(reportData, null, 2),
      ContentType: "application/json",
    })
  );

  // 2. Download the object back
  const getRes = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: testKey,
    })
  );
  const downloadedText = await getRes.Body?.transformToString();

  // 3. List objects in the bucket
  const listRes = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      MaxKeys: 10,
    })
  );

  return {
    service: "Object Storage",
    success: true,
    bucket,
    uploadedKey: testKey,
    downloadVerified: downloadedText ? JSON.parse(downloadedText).reportTitle === reportData.reportTitle : false,
    totalObjects: listRes.KeyCount || 0,
  };
}

