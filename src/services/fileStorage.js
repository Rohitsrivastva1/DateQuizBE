const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { logger } = require('../utils/secureLogger');

// File type validation using magic numbers
const FILE_SIGNATURES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'audio/mpeg': [0xFF, 0xFB],
  'audio/wav': [0x52, 0x49, 0x46, 0x46],
  'audio/mp4': [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
  'audio/aac': [0xFF, 0xF1],
  'audio/ogg': [0x4F, 0x67, 0x67, 0x53]
};

// User storage quotas (in bytes)
const STORAGE_QUOTAS = {
  free: 100 * 1024 * 1024, // 100MB
  premium: 1024 * 1024 * 1024, // 1GB
  admin: 10 * 1024 * 1024 * 1024 // 10GB
};

// Configure multer for file uploads with enhanced security
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    const tempDir = path.join(__dirname, '../../temp');
    
    // Create directories if they don't exist
    [uploadDir, tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
      }
    });
    
    // Store in temp directory first for scanning
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Generate secure filename with timestamp and random hash
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${timestamp}_${random}${ext}`;
    cb(null, uniqueName);
  }
});

// Enhanced file filter with security checks
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/mp4': '.m4a',
    'audio/aac': '.aac',
    'audio/ogg': '.ogg'
  };
  
  // Check MIME type
  if (!allowedTypes[file.mimetype]) {
    return cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
  
  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!Object.values(allowedTypes).includes(ext)) {
    return cb(new Error(`File extension ${ext} is not allowed`), false);
  }
  
  // Check for suspicious patterns in filename
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|com|scr|pif|vbs|js|jar|php|asp|aspx|jsp)$/i,
    /\.(sh|bash|zsh|fish)$/i,
    /\.(ps1|psm1|psd1)$/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(file.originalname))) {
    return cb(new Error(`Suspicious file type detected: ${file.originalname}`), false);
  }
  
  // Check for directory traversal attempts
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    return cb(new Error(`Invalid filename: ${file.originalname}`), false);
  }
  
  cb(null, true);
};

// Configure multer with enhanced security
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
    files: 5, // Maximum 5 files per request
    fieldSize: 1024 * 1024, // 1MB for field data
    fieldNameSize: 100, // 100 characters max for field names
    fieldValueSize: 1024 * 1024 // 1MB max for field values
  }
});

// Image processing function
const processImage = async (filePath, options = {}) => {
  const {
    width = 1200,
    height = 1200,
    quality = 85,
    format = 'jpeg'
  } = options;
  
  try {
    const processedPath = filePath.replace(path.extname(filePath), `_processed.${format}`);
    
    await sharp(filePath)
      .resize(width, height, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality })
      .toFile(processedPath);
    
    // Replace original with processed version
    fs.unlinkSync(filePath);
    fs.renameSync(processedPath, filePath);
    
    return {
      success: true,
      processedPath: filePath
    };
  } catch (error) {
    console.error('Error processing image:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Audio processing function
const processAudio = async (filePath, options = {}) => {
  const {
    bitrate = '128k',
    format = 'mp3'
  } = options;
  
  try {
    // For now, just return the original file
    // In production, you might want to use ffmpeg for audio processing
    return {
      success: true,
      processedPath: filePath
    };
  } catch (error) {
    console.error('Error processing audio:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Enhanced file validation function
const validateFile = async (file, userId = null) => {
  const errors = [];
  
  // Check file size
  if (file.size > 50 * 1024 * 1024) {
    errors.push('File size exceeds 50MB limit');
  }
  
  // Check file type
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg'
  ];
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed`);
  }
  
  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp3', '.wav', '.m4a', '.aac', '.ogg'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    errors.push(`File extension ${fileExtension} is not allowed`);
  }
  
  // Validate file signature using magic numbers
  if (file.buffer) {
    const isValidSignature = validateFileSignature(file.buffer, file.mimetype);
    if (!isValidSignature) {
      errors.push('File signature validation failed - file may be corrupted or malicious');
    }
  }
  
  // Check for suspicious patterns in filename
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|com|scr|pif|vbs|js|jar|php|asp|aspx|jsp)$/i,
    /\.(sh|bash|zsh|fish)$/i,
    /\.(ps1|psm1|psd1)$/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(file.originalname))) {
    errors.push(`Suspicious file type detected: ${file.originalname}`);
  }
  
  // Check for directory traversal attempts
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    errors.push(`Invalid filename: ${file.originalname}`);
  }
  
  // Check user storage quota if userId provided
  if (userId) {
    try {
      const quotaCheck = await checkUserStorageQuota(userId, file.size);
      if (!quotaCheck.allowed) {
        errors.push(`Storage quota exceeded. Used: ${quotaCheck.currentUsage} bytes, Quota: ${quotaCheck.quota} bytes`);
      }
    } catch (error) {
      console.error('Error checking storage quota:', error);
      errors.push('Unable to verify storage quota');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate file signature using magic numbers
const validateFileSignature = (buffer, mimeType) => {
  const signature = FILE_SIGNATURES[mimeType];
  if (!signature) return false;
  
  return signature.every((byte, index) => buffer[index] === byte);
};

// Check user storage quota
const checkUserStorageQuota = async (userId, fileSize) => {
  try {
    const db = require('../config/db');
    
    // Get user's current storage usage
    const usageQuery = `
      SELECT COALESCE(SUM((media_metadata->>'size')::bigint), 0) as total_size,
             ui.premium_user
      FROM journal_messages jm
      LEFT JOIN user_insights ui ON jm.sender_id = ui.user_id
      WHERE jm.sender_id = $1 AND jm.media_url IS NOT NULL
      GROUP BY ui.premium_user
    `;
    
    const result = await db.query(usageQuery, [userId]);
    const currentUsage = result.rows[0]?.total_size || 0;
    const isPremium = result.rows[0]?.premium_user || false;
    
    const quota = isPremium ? STORAGE_QUOTAS.premium : STORAGE_QUOTAS.free;
    
    if (currentUsage + fileSize > quota) {
      return {
        allowed: false,
        currentUsage,
        quota,
        remaining: quota - currentUsage
      };
    }
    
    return {
      allowed: true,
      currentUsage,
      quota,
      remaining: quota - currentUsage - fileSize
    };
  } catch (error) {
    console.error('Error checking storage quota:', error);
    return { allowed: false, reason: 'Quota check failed' };
  }
};

// Scan file for malware (basic implementation)
const scanFileForMalware = async (filePath) => {
  try {
    // Check file size (suspiciously large files)
    const stats = fs.statSync(filePath);
    if (stats.size > 100 * 1024 * 1024) { // 100MB
      logger.logFileUpload('malware_scan_failed', null, path.basename(filePath), {
        reason: 'File too large',
        size: stats.size
      });
      return { clean: false, reason: 'File too large' };
    }

    // Check for suspicious patterns in file content
    const buffer = fs.readFileSync(filePath, { start: 0, end: 1024 });
    const content = buffer.toString('binary');
    
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i,
      /document\.cookie/i,
      /document\.write/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        logger.logFileUpload('malware_detected', null, path.basename(filePath), {
          reason: 'Suspicious content detected',
          pattern: pattern.toString()
        });
        return { clean: false, reason: 'Suspicious content detected' };
      }
    }

    // Check for executable signatures
    const executableSignatures = [
      [0x4D, 0x5A], // PE executable
      [0x7F, 0x45, 0x4C, 0x46], // ELF executable
      [0xFE, 0xED, 0xFA, 0xCE], // Mach-O executable
      [0xCA, 0xFE, 0xBA, 0xBE] // Java class file
    ];

    for (const signature of executableSignatures) {
      if (signature.every((byte, index) => buffer[index] === byte)) {
        logger.logFileUpload('executable_detected', null, path.basename(filePath), {
          reason: 'Executable file detected',
          signature: signature.join(',')
        });
        return { clean: false, reason: 'Executable file detected' };
      }
    }

    logger.debug('File scan completed successfully', {
      filename: path.basename(filePath),
      size: stats.size
    });

    return { clean: true };
  } catch (error) {
    logger.error('Error scanning file for malware', {
      filename: path.basename(filePath),
      error: error.message
    });
    return { clean: false, reason: 'Scan error' };
  }
};

// Generate file metadata
const generateFileMetadata = (file, processedPath) => {
  const stats = fs.statSync(processedPath);
  
  return {
    originalName: file.originalname,
    filename: path.basename(processedPath),
    mimetype: file.mimetype,
    size: stats.size,
    uploadedAt: new Date().toISOString(),
    type: file.mimetype.startsWith('image/') ? 'image' : 'audio'
  };
};

// Delete file function
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: error.message };
  }
};

// Get file info
const getFileInfo = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }
    
    const stats = fs.statSync(filePath);
    return {
      success: true,
      info: {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      }
    };
  } catch (error) {
    console.error('Error getting file info:', error);
    return { success: false, error: error.message };
  }
};

// Clean up old files (for maintenance)
const cleanupOldFiles = async (olderThanDays = 30) => {
  try {
    const uploadDir = path.join(__dirname, '../../uploads');
    const files = fs.readdirSync(uploadDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    return {
      success: true,
      deletedCount
    };
  } catch (error) {
    console.error('Error cleaning up old files:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  upload,
  processImage,
  processAudio,
  validateFile,
  generateFileMetadata,
  deleteFile,
  getFileInfo,
  cleanupOldFiles
};

