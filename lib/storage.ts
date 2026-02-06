// lib/storage.ts

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import path from "path";
import fs from "fs/promises";

// Toggle between local and S3 storage
const USE_S3 = process.env.USE_S3 === "true";

// S3 Configuration
const s3Client = USE_S3
    ? new S3Client({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
    })
    : null;

const S3_BUCKET = process.env.AWS_S3_BUCKET || "quizai-uploads";

// Local storage directory
const LOCAL_UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

/**
 * Upload a file to storage (S3 or local filesystem)
 */
export async function uploadFile(file: File, folder: string = ""): Promise<string> {
    const ext = path.extname(file.name);
    const uniqueName = `${nanoid()}${ext}`;
    const key = folder ? `${folder}/${uniqueName}` : uniqueName;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (USE_S3 && s3Client) {
        // Upload to S3
        await s3Client.send(
            new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: key,
                Body: buffer,
                ContentType: file.type,
            })
        );

        // Return S3 URL
        return `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;
    } else {
        // Upload to local filesystem
        const uploadDir = path.join(LOCAL_UPLOAD_DIR, folder);
        await fs.mkdir(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, uniqueName);
        await fs.writeFile(filePath, buffer);

        // Return local URL (relative path for API access)
        return `/uploads/${key}`;
    }
}

/**
 * Get a signed URL for private file access (S3 only)
 */
export async function getSignedFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!USE_S3 || !s3Client) {
        // For local files, return the direct path
        return `/uploads/${key}`;
    }

    const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a file from storage
 */
export async function deleteFile(url: string): Promise<void> {
    if (USE_S3 && s3Client) {
        // Extract key from S3 URL
        const key = url.replace(`https://${S3_BUCKET}.s3.amazonaws.com/`, "");

        const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: S3_BUCKET,
                Key: key,
            })
        );
    } else {
        // Delete from local filesystem
        const filePath = path.join(LOCAL_UPLOAD_DIR, url.replace("/uploads/", ""));
        await fs.unlink(filePath).catch(() => {
            // Ignore if file doesn't exist
        });
    }
}