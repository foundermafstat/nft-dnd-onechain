import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(import.meta.dirname, '../../../.env') });

// Parse Filebase IPFS API Key (format usually KEY:SECRET:BUCKET or just KEY:SECRET)
const ipfsApiKey = process.env.IPFS_API_KEY || '';
const decodedKey = Buffer.from(ipfsApiKey, 'base64').toString('ascii');
const [accessKeyId, secretAccessKey, defaultBucket = 'nft-dnd-assets'] = decodedKey.split(':');

const s3Client = new S3Client({
    endpoint: 'https://s3.filebase.com',
    region: 'us-east-1',
    credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || ''
    }
});

export const uploadToIPFS = async (fileBuffer: Buffer, fileName: string, contentType: string) => {
    try {
        const command = new PutObjectCommand({
            Bucket: defaultBucket,
            Key: fileName,
            Body: fileBuffer,
            ContentType: contentType,
        });

        await s3Client.send(command);

        // Filebase specific: you can fetch the IPFS CID from the object headers or use the gateway
        const gatewayUrl = `https://ipfs.filebase.io/ipfs/`; // You usually need the CID to form the full URL
        // However, Filebase automatically pins the object. To get the CID, you can HEAD the object, 
        // or just return the standard S3 URL for now, or expect Filebase to return it in the ETag.

        return {
            success: true,
            fileName,
            message: 'Successfully uploaded to IPFS via Filebase S3'
        };
    } catch (error) {
        console.error('Error uploading to IPFS:', error);
        throw error;
    }
};
