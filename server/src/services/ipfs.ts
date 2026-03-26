import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(import.meta.dirname, '../../../.env') });

function parseLegacyApiKey() {
    const raw = process.env.IPFS_API_KEY || '';
    if (!raw) return { accessKeyId: '', secretAccessKey: '', bucket: '' };

    try {
        const decoded = Buffer.from(raw, 'base64').toString('ascii');
        const [accessKeyId = '', secretAccessKey = '', bucket = 'nft-dnd-assets'] = decoded.split(':');
        return { accessKeyId, secretAccessKey, bucket };
    } catch {
        return { accessKeyId: '', secretAccessKey: '', bucket: '' };
    }
}

const legacy = parseLegacyApiKey();

const accessKeyId = process.env.IPFS_ACCESS_KEY_ID || legacy.accessKeyId;
const secretAccessKey = process.env.IPFS_SECRET_ACCESS_KEY || legacy.secretAccessKey;
const defaultBucket = process.env.IPFS_BUCKET || legacy.bucket || 'nft-dnd-assets';

const s3Client = new S3Client({
    endpoint: 'https://s3.filebase.com',
    region: 'us-east-1',
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

export interface UploadToIpfsResult {
    success: boolean;
    key: string;
    bucket: string;
    cid: string | null;
    gatewayUrl: string | null;
    message: string;
}

const extractCidFromHead = (head: any) => {
    const meta = head?.Metadata || {};
    return (
        meta.cid ||
        meta['ipfs-hash'] ||
        meta['content-cid'] ||
        null
    );
};

export const uploadToIPFS = async (
    fileBuffer: Buffer,
    fileName: string,
    contentType: string,
    bucket = defaultBucket,
): Promise<UploadToIpfsResult> => {
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType,
    });

    await s3Client.send(command);

    let cid: string | null = null;
    try {
        const head = await s3Client.send(
            new HeadObjectCommand({
                Bucket: bucket,
                Key: fileName,
            }),
        );
        cid = extractCidFromHead(head);
    } catch (error) {
        console.warn('Uploaded to Filebase, but CID lookup failed:', error);
    }

    return {
        success: true,
        key: fileName,
        bucket,
        cid,
        gatewayUrl: cid ? `https://ipfs.filebase.io/ipfs/${cid}` : null,
        message: 'Successfully uploaded to IPFS via Filebase S3',
    };
};

export const uploadJsonToIPFS = async (
    payload: unknown,
    fileName: string,
    bucket = defaultBucket,
) => {
    const body = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');
    return uploadToIPFS(body, fileName, 'application/json', bucket);
};
