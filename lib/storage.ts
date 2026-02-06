// lib/storage.ts
import crypto from "crypto";
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_PUBLIC_ENDPOINT =
    process.env.MINIO_PUBLIC_ENDPOINT ?? MINIO_ENDPOINT;
const MINIO_BUCKET = process.env.MINIO_BUCKET;

function normalizeEndpoint(endpoint?: string) {
    if (!endpoint) {
        throw new Error("MINIO_ENDPOINT is not configured");
    }
    return endpoint.startsWith("http://") || endpoint.startsWith("https://")
        ? endpoint
        : `http://${endpoint}`;
}

const s3Client = new S3Client({
    region: "us-east-1",
    endpoint: normalizeEndpoint(MINIO_ENDPOINT),
    credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER ?? "",
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? "",
    },
    forcePathStyle: true,
});

function getBucket() {
    if (!MINIO_BUCKET) {
        throw new Error("MINIO_BUCKET is not configured");
    }
    return MINIO_BUCKET;
}

export async function uploadFile(
    key: string,
    body: Buffer | Uint8Array | Blob,
    contentType: string
) {
    await s3Client.send(
        new PutObjectCommand({
            Bucket: getBucket(),
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
        Bucket: getBucket(),
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
        Bucket: getBucket(),
        Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteFile(key: string) {
    await s3Client.send(
        new DeleteObjectCommand({
            Bucket: getBucket(),
            Key: key,
        })
    );
}

export async function fileExists(key: string): Promise<boolean> {
    try {
        await s3Client.send(
            new HeadObjectCommand({
                Bucket: getBucket(),
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
    const endpoint = normalizeEndpoint(MINIO_PUBLIC_ENDPOINT);
    return `${endpoint}/${getBucket()}/${key}`;
}

// Helper to generate a unique key for attachments
export function generateAttachmentKey(
    quizId: string,
    filename: string,
    conversationId?: string,
    isPublic = false
) {
    const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const prefix = isPublic ? "public" : "attachments";
    const suffix = crypto.randomUUID();
    const scope = conversationId
        ? `quiz-${quizId}/conversation-${conversationId}`
        : `quiz-${quizId}/global`;
    return `${prefix}/${scope}/${suffix}-${sanitized}`;
}