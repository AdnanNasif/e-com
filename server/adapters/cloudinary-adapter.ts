import { v2 as cloudinary } from 'cloudinary';
import { UploadResponse } from '../core/types';

export class CloudinaryAdapter {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async upload(file: Express.Multer.File): Promise<UploadResponse> {
    if (!file.buffer) {
      throw new Error('File buffer is empty - check multer configuration');
    }
    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = "data:" + file.mimetype + ";base64," + b64;
    
    const response = await cloudinary.uploader.upload(dataURI, {
      folder: 'products',
      resource_type: 'auto',
    });

    return { url: response.secure_url };
  }
}
