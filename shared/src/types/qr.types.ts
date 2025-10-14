export type QRDataType = 
  | 'url' 
  | 'text' 
  | 'email' 
  | 'phone' 
  | 'sms' 
  | 'wifi' 
  | 'vcard' 
  | 'calendar' 
  | 'location' 
  | 'payment';

export interface QRDesignConfig {
  size: number;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  
  // Color Configuration
  foregroundColor: string;
  backgroundColor: string;
  gradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    direction?: number;
  };
  
  // Logo Integration
  logo?: {
    url: string;
    buffer?: Buffer;
    size: number;
    position: 'center' | 'corner';
    borderRadius?: number;
    opacity?: number;
  };
  
  // Pattern and Shape Variations
  pattern: 'square' | 'dots' | 'rounded' | 'diamond' | 'circular';
  cornerRadius?: number;
  
  // Eye Pattern Customization
  eyePattern?: {
    outer: 'square' | 'rounded' | 'circle' | 'diamond';
    inner: 'square' | 'rounded' | 'circle' | 'diamond';
    color?: string;
  };
  
  // Frame Design
  frame?: {
    style: 'none' | 'square' | 'rounded' | 'circle' | 'banner';
    text?: string;
    textColor?: string;
    color?: string;
    width?: number;
    padding?: number;
  };
  
  // Background Options
  backgroundTransparent?: boolean;
  backgroundImage?: {
    url?: string;
    buffer?: Buffer;
    opacity?: number;
    blend?: 'normal' | 'multiply' | 'overlay';
  };
  
  // Advanced Effects
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  
  // Output Format
  format?: 'png' | 'svg' | 'pdf' | 'webp';
  quality?: number;
}

export interface QRValidityConfig {
  expiresAt?: Date;
  maxScans?: number;
  passwordHash?: string;
  validSchedule?: {
    validDays: number[];
    validHours: {
      start: string;
      end: string;
    };
    timezone: string;
  };
}

export interface QRCode {
  id: string;
  userId: string;
  shortId: string;
  name: string;
  type: QRDataType;
  content: any;
  designConfig: QRDesignConfig;
  targetUrl?: string;
  isActive: boolean;
  validityConfig?: QRValidityConfig;
  currentScans: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQRRequest {
  name: string;
  type: QRDataType;
  content: any;
  designConfig: QRDesignConfig;
  validityConfig?: QRValidityConfig;
}

export interface QRScanEvent {
  qrCodeId: string;
  ipHash?: string;
  userAgent?: string;
  platform?: string;
  browser?: string;
  country?: string;
  city?: string;
  referrer?: string;
  scannedAt: Date;
}