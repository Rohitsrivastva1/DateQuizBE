const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    
    // Create upload directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for allowed file types
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
  
  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5 // Maximum 5 files per request
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

// File validation function
const validateFile = (file) => {
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
  
  return {
    isValid: errors.length === 0,
    errors
  };
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

