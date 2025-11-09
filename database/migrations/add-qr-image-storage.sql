-- Migration to add image storage support for QR codes
-- Run this migration to add image URL and file reference to qr_codes table

-- Add image_url column to store the URL/path to the saved QR image
ALTER TABLE qr_codes ADD COLUMN image_url TEXT;

-- Add image_file_id column to reference the file_uploads table (optional, for better file management)
ALTER TABLE qr_codes ADD COLUMN image_file_id UUID REFERENCES file_uploads(id) ON DELETE SET NULL;

-- Add index for performance on image lookups
CREATE INDEX idx_qr_codes_image_file_id ON qr_codes(image_file_id);

-- Update existing QR codes to have default image URLs (optional, can be done programmatically)
-- UPDATE qr_codes SET image_url = CONCAT('/api/qr/', id, '/image?format=png&size=200') WHERE image_url IS NULL;