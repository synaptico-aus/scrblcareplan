import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  ListObjectsV2Command,
  PutObjectCommandInput,
  GetObjectCommandInput,
  DeleteObjectCommandInput,
  ListObjectsV2CommandInput
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

if (!process.env.AWS_ACCESS_KEY_ID) {
  throw new Error('AWS_ACCESS_KEY_ID environment variable is required');
}

if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error('AWS_SECRET_ACCESS_KEY environment variable is required');
}

if (!process.env.AWS_REGION) {
  throw new Error('AWS_REGION environment variable is required');
}

if (!process.env.AWS_S3_BUCKET_NAME) {
  throw new Error('AWS_S3_BUCKET_NAME environment variable is required');
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export async function uploadFile(
  key: string, 
  buffer: Buffer, 
  contentType?: string
): Promise<void> {
  try {
    const params: PutObjectCommandInput = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    
    console.log(`File uploaded successfully to S3: ${key}`);
  } catch (error) {
    console.error(`Error uploading file to S3 (key: ${key}):`, error);
    throw new Error(
      `Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getFile(key: string): Promise<Buffer> {
  try {
    const params: GetObjectCommandInput = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error('No file body returned from S3');
    }

    const buffer = await streamToBuffer(response.Body as Readable);
    console.log(`File retrieved successfully from S3: ${key}`);
    
    return buffer;
  } catch (error) {
    console.error(`Error getting file from S3 (key: ${key}):`, error);
    
    if (error instanceof Error && error.name === 'NoSuchKey') {
      throw new Error(`File not found in S3: ${key}`);
    }
    
    throw new Error(
      `Failed to get file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function deleteFile(key: string): Promise<void> {
  try {
    const params: DeleteObjectCommandInput = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
    
    console.log(`File deleted successfully from S3: ${key}`);
  } catch (error) {
    console.error(`Error deleting file from S3 (key: ${key}):`, error);
    throw new Error(
      `Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function listFiles(prefix?: string): Promise<string[]> {
  try {
    const params: ListObjectsV2CommandInput = {
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    };

    const command = new ListObjectsV2Command(params);
    const response = await s3Client.send(command);

    const keys = response.Contents?.map((item) => item.Key).filter((key): key is string => !!key) || [];
    
    console.log(`Listed ${keys.length} files from S3${prefix ? ` with prefix: ${prefix}` : ''}`);
    
    return keys;
  } catch (error) {
    console.error(`Error listing files from S3${prefix ? ` (prefix: ${prefix})` : ''}:`, error);
    throw new Error(
      `Failed to list files from S3: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
