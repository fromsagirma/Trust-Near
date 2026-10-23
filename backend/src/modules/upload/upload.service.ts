import cloudinary, { isCloudinaryConfigured } from '../../config/cloudinary';
import { UploadApiResponse, UploadApiOptions } from 'cloudinary';

export interface UploadResult {
  url: string;
  publicId: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
}

export interface SignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

/**
 * Uploads a file Buffer to Cloudinary via upload_stream.
 */
export const uploadBufferToCloudinary = (
  buffer: Buffer,
  folder: string = process.env.CLOUDINARY_FOLDER || 'trustnear'
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      // Safe fallback if Cloudinary credentials are not provided
      const base64 = buffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      return resolve({
        url: dataUrl,
        publicId: `local_${Date.now()}`,
        format: 'jpeg',
        bytes: buffer.length,
      });
    }

    const options: UploadApiOptions = {
      folder,
      resource_type: 'auto',
    };

    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          // If Cloudinary fails during upload, fallback to data URI
          const base64 = buffer.toString('base64');
          const dataUrl = `data:image/jpeg;base64,${base64}`;
          return resolve({
            url: dataUrl,
            publicId: `local_${Date.now()}`,
            format: 'jpeg',
            bytes: buffer.length,
          });
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        });
      }
    );

    stream.end(buffer);
  });
};

/**
 * Generates a signed upload signature for direct client-side uploads.
 */
export const getCloudinaryUploadSignature = (
  folder: string = process.env.CLOUDINARY_FOLDER || 'trustnear'
): SignatureResponse => {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in environment variables.'
    );
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;

  const paramsToSign = {
    timestamp,
    folder,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
  };
};
