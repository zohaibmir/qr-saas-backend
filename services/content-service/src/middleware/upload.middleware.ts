import multer from 'multer';
import { Request } from 'express';
import path from 'path';

// Configure storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Define allowed file types
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/mov'];
  const allowedDocumentTypes = ['application/pdf', 'text/plain'];
  
  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes, ...allowedDocumentTypes];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

// Create multer upload middleware
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1, // Allow only 1 file per request
  },
});

// Specific upload configurations
export const uploadSingle = (fieldName: string) => {
  return upload.single(fieldName);
};

export const uploadMultiple = (fieldName: string, maxCount = 5) => {
  return upload.array(fieldName, maxCount);
};

export const uploadFields = (fields: multer.Field[]) => {
  return upload.fields(fields);
};

// Error handling middleware for multer
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'File size must be less than 10MB',
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field',
        message: 'Unexpected file field in upload',
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files',
        message: 'Maximum number of files exceeded',
      });
    }
  }
  
  if (error.message.includes('File type') && error.message.includes('not allowed')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: error.message,
    });
  }
  
  // Generic upload error
  return res.status(500).json({
    success: false,
    error: 'Upload failed',
    message: 'An error occurred during file upload',
  });
};