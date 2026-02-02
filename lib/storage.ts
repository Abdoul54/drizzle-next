// lib/storage.ts
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
    region: "us-east-1",
    endpoint: process.env.MINIO_ENDPOINT!,
    credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER!,
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD!,
    },
    forcePathStyle: true,
});

const BUCKET = process.env.MINIO_BUCKET!;

export async function uploadFile(
    key: string,
    body: Buffer | Uint8Array | Blob,
    contentType: string
) {
    await s3Client.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
        })
    );

    return { key, url: getPublicUrl(key) };
}

export async function getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 3600
) {
    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
}

export async function getPresignedDownloadUrl(
    key: string,
    expiresIn = 3600
) {
    const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteFile(key: string) {
    await s3Client.send(
        new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: key,
        })
    );
}

export async function fileExists(key: string): Promise<boolean> {
    try {
        await s3Client.send(
            new HeadObjectCommand({
                Bucket: BUCKET,
                Key: key,
            })
        );
        return true;
    } catch {
        return false;
    }
}

// Public URL for files in the public/ prefix (anonymous download enabled)
export function getPublicUrl(key: string) {
    return `${process.env.MINIO_ENDPOINT}/${BUCKET}/${key}`;
}

// Helper to generate a unique key for attachments
export function generateAttachmentKey(
    conversationId: string,
    filename: string,
    isPublic = false
) {
    const timestamp = Date.now();
    const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const prefix = isPublic ? "public" : "attachments";
    return `${prefix}/${conversationId}/${timestamp}-${sanitized}`;
}