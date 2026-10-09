import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Ensure uploads folder exists locally
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Memory storage keeps buffer in memory so we can upload to Cloudinary or fallback to disk
const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!') as any, false);
    }
  },
});

export const uploadToCloudinaryOrLocal = async (
  file: Express.Multer.File,
  req: any
): Promise<string> => {
  // 1. Attempt Cloudinary upload stream
  try {
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'user-profiles', resource_type: 'image' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(file.buffer);
    });

    if (result && result.secure_url) {
      console.log('[Upload] Successfully uploaded to Cloudinary:', result.secure_url);
      return result.secure_url;
    }
  } catch (err: any) {
    console.warn('[Upload] Cloudinary upload returned error (falling back to local storage):', err.message);
  }

  // 2. Fallback to saving file in local /uploads folder
  const ext = path.extname(file.originalname) || '.png';
  const filename = `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const filePath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(filePath, file.buffer);

  let host = req.get('host') || '192.168.31.252:5000';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    host = '192.168.31.252:5000';
  }
  const protocol = req.protocol || 'http';
  const localUrl = `${protocol}://${host}/uploads/${filename}`;
  console.log('[Upload] Saved locally at:', localUrl);
  return localUrl;
};

export default cloudinary;