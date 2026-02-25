import fs from "node:fs";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

function toTrimmedString(value) {
  return String(value || "").trim();
}

function toNormalizedPathFragment(value) {
  return toTrimmedString(value)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function parseBucketConfiguration(rawBucketName) {
  let normalized = toTrimmedString(rawBucketName);
  if (!normalized) {
    return {
      bucketName: "",
      bucketPrefix: "",
    };
  }

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      normalized = toTrimmedString(parsed.pathname || "");
    } catch {
      // Keep the raw value if URL parsing fails.
    }
  }

  normalized = toNormalizedPathFragment(normalized);
  if (!normalized) {
    return {
      bucketName: "",
      bucketPrefix: "",
    };
  }

  const parts = normalized
    .split("/")
    .map((entry) => toNormalizedPathFragment(entry))
    .filter(Boolean);

  const [bucketName = "", ...prefixParts] = parts;
  return {
    bucketName,
    bucketPrefix: prefixParts.join("/"),
  };
}

function buildBasePrefix(bucketPrefix, folderPrefix) {
  const normalizedBucketPrefix = toNormalizedPathFragment(bucketPrefix);
  const normalizedFolderPrefix = toNormalizedPathFragment(folderPrefix);

  if (!normalizedBucketPrefix) return normalizedFolderPrefix;
  if (!normalizedFolderPrefix) return normalizedBucketPrefix;
  if (normalizedBucketPrefix === normalizedFolderPrefix) {
    return normalizedBucketPrefix;
  }
  if (normalizedBucketPrefix.endsWith(`/${normalizedFolderPrefix}`)) {
    return normalizedBucketPrefix;
  }

  return `${normalizedBucketPrefix}/${normalizedFolderPrefix}`;
}

const rawEndpoint = toTrimmedString(process.env.SCALEWAY_ENDPOINT);
const endpoint = rawEndpoint.replace(/\/+$/, "");
const region = toTrimmedString(process.env.SCALEWAY_REGION);
const accessKeyId = toTrimmedString(process.env.SCALEWAY_ACCESS_KEY);
const secretAccessKey = toTrimmedString(process.env.SCALEWAY_SECRET_KEY);

const { bucketName, bucketPrefix } = parseBucketConfiguration(
  process.env.SCALEWAY_BUCKET_NAME,
);
const folderPrefix = toNormalizedPathFragment(process.env.SCALEWAY_FOLDER);
const basePrefix = buildBasePrefix(bucketPrefix, folderPrefix);

const missingEnv = [];
if (!accessKeyId) missingEnv.push("SCALEWAY_ACCESS_KEY");
if (!secretAccessKey) missingEnv.push("SCALEWAY_SECRET_KEY");
if (!endpoint) missingEnv.push("SCALEWAY_ENDPOINT");
if (!bucketName) missingEnv.push("SCALEWAY_BUCKET_NAME");
if (!region) missingEnv.push("SCALEWAY_REGION");

let s3Client = null;

function getS3Client() {
  if (missingEnv.length > 0) {
    throw new Error(
      `Configuration S3 manquante: ${missingEnv.join(", ")}`,
    );
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return s3Client;
}

function buildStorageObjectKey(relativeObjectKey) {
  const normalizedRelativeKey = toNormalizedPathFragment(relativeObjectKey);
  if (!normalizedRelativeKey) {
    throw new Error("Cle objet S3 invalide.");
  }

  if (!basePrefix) return normalizedRelativeKey;
  return `${basePrefix}/${normalizedRelativeKey}`;
}

function encodeObjectKeyForPublicUrl(objectKey) {
  return String(objectKey || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildPublicObjectUrl(objectKey) {
  const encodedKey = encodeObjectKeyForPublicUrl(objectKey);
  return `${endpoint}/${bucketName}/${encodedKey}`;
}

function getPublicObjectUrlPrefix() {
  if (!endpoint || !bucketName) return "";
  const prefix = `${endpoint}/${bucketName}`;
  if (!basePrefix) return `${prefix}/`;
  return `${prefix}/${encodeObjectKeyForPublicUrl(basePrefix)}/`;
}

function guessContentType(localFilePath) {
  const ext = path.extname(localFilePath || "").toLowerCase();
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".srt") return "application/x-subrip";
  return "application/octet-stream";
}

function shouldRetryWithoutAcl(error) {
  const code = String(error?.name || error?.Code || error?.code || "");
  const message = String(error?.message || "");
  return (
    /AccessControlListNotSupported|NotImplemented/i.test(code)
    || /access control list|acl/i.test(message)
  );
}

async function putObjectWithAclFallback(commandInput) {
  const client = getS3Client();
  const withAcl = {
    ...commandInput,
    ACL: "public-read",
  };

  try {
    await client.send(new PutObjectCommand(withAcl));
  } catch (error) {
    if (!shouldRetryWithoutAcl(error)) {
      throw error;
    }
    await client.send(new PutObjectCommand(commandInput));
  }
}

export function isObjectStorageConfigured() {
  return missingEnv.length === 0;
}

export function getObjectStorageMissingEnv() {
  return [...missingEnv];
}

export function getObjectStorageSummary() {
  return {
    configured: isObjectStorageConfigured(),
    endpoint,
    region,
    bucketName,
    basePrefix,
    publicUrlPrefix: getPublicObjectUrlPrefix(),
  };
}

export function isPublicObjectStorageUrl(value) {
  if (!isObjectStorageConfigured()) return false;
  const raw = toTrimmedString(value);
  if (!raw) return false;
  return raw.startsWith(getPublicObjectUrlPrefix());
}

function decodeObjectKeyFromPath(pathname) {
  return String(pathname || "")
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
}

export function extractObjectKeyFromPublicUrl(publicUrl) {
  const raw = toTrimmedString(publicUrl);
  if (!raw || !isPublicObjectStorageUrl(raw)) return null;

  try {
    const parsed = new URL(raw);
    const normalizedPath = String(parsed.pathname || "").replace(/^\/+/, "");
    const decodedPath = decodeObjectKeyFromPath(normalizedPath);
    const bucketPrefix = `${bucketName}/`;
    if (!decodedPath.startsWith(bucketPrefix)) return null;
    return decodedPath.slice(bucketPrefix.length);
  } catch {
    return null;
  }
}

function buildStoragePrefix(relativePrefix) {
  const normalizedRelativePrefix = toNormalizedPathFragment(relativePrefix);
  if (!basePrefix) {
    return normalizedRelativePrefix;
  }
  if (!normalizedRelativePrefix) {
    return `${basePrefix}/`;
  }
  return `${basePrefix}/${normalizedRelativePrefix}`;
}

export async function uploadFileToObjectStorage({
  localFilePath,
  objectKey,
  contentType,
  cacheControl,
}) {
  const safeLocalFilePath = toTrimmedString(localFilePath);
  if (!safeLocalFilePath || !fs.existsSync(safeLocalFilePath)) {
    throw new Error("Fichier local introuvable pour upload S3.");
  }

  const storageObjectKey = buildStorageObjectKey(objectKey);
  const commandInput = {
    Bucket: bucketName,
    Key: storageObjectKey,
    Body: fs.createReadStream(safeLocalFilePath),
    ContentType: contentType || guessContentType(safeLocalFilePath),
  };

  if (cacheControl) {
    commandInput.CacheControl = cacheControl;
  }

  await putObjectWithAclFallback(commandInput);

  return {
    bucketName,
    objectKey: storageObjectKey,
    url: buildPublicObjectUrl(storageObjectKey),
  };
}

export async function deleteObjectFromPublicUrl(publicUrl) {
  const objectKey = extractObjectKeyFromPublicUrl(publicUrl);
  if (!objectKey) {
    return {
      deleted: false,
      skipped: true,
      reason: "not_object_storage_url",
      objectKey: null,
    };
  }

  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    }),
  );

  return {
    deleted: true,
    skipped: false,
    reason: null,
    objectKey,
  };
}

export async function downloadObjectFromPublicUrl(publicUrl) {
  const objectKey = extractObjectKeyFromPublicUrl(publicUrl);
  if (!objectKey) {
    return null;
  }

  const client = getS3Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    }),
  );

  return {
    objectKey,
    stream: response?.Body || null,
    contentType: response?.ContentType || "application/octet-stream",
    contentLength: Number.isFinite(Number(response?.ContentLength))
      ? Number(response.ContentLength)
      : null,
  };
}

export async function deleteObjectByKey(objectKey) {
  const safeKey = toNormalizedPathFragment(objectKey);
  if (!safeKey) {
    throw new Error("Cle objet S3 invalide pour suppression.");
  }

  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: safeKey,
    }),
  );

  return {
    deleted: true,
    objectKey: safeKey,
  };
}

export async function listObjectKeysByPrefix(relativePrefix) {
  const client = getS3Client();
  const prefix = buildStoragePrefix(relativePrefix);
  const keys = [];
  let continuationToken = undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix || undefined,
        ContinuationToken: continuationToken,
      }),
    );

    const contents = Array.isArray(response?.Contents) ? response.Contents : [];
    contents.forEach((item) => {
      const key = String(item?.Key || "").trim();
      if (key) keys.push(key);
    });

    continuationToken = response?.IsTruncated ? response?.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}
