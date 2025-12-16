const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

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

class EnhancedFileStorage {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads');
    this.tempDir = path.join(__dirname, '../../temp');
    this.quarantineDir = path.join(__dirname, '../../quarantine');
    
    // Create directories if they don't exist
    this.ensureDirectories();
    
    // Initialize multer with enhanced security
    this.initializeMulter();
  }

  ensureDirectories() {
    [this.uploadDir, this.tempDir, this.quarantineDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
      }
    });
  }

  initializeMulter() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        // Store in temp directory first for scanning
        cb(null, this.tempDir);
      },
      filename: (req, file, cb) => {
        // Generate secure filename
        const uniqueName = this.generateSecureFilename(file.originalname);
        cb(null, uniqueName);
      }
    });

    this.upload = multer({
      storage: storage,
      fileFilter: this.fileFilter.bind(this),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB per file
        files: 5, // Maximum 5 files per request
        fieldSize: 1024 * 1024 // 1MB for field data
      }
    });
  }

  fileFilter(req, file, cb) {
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
  }

  generateSecureFilename(originalName) {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    return `${timestamp}_${random}${ext}`;
  }

  // Validate file using magic numbers
  async validateFileSignature(filePath, expectedMimeType) {
    try {
      const buffer = fs.readFileSync(filePath, { start: 0, end: 32 });
      const signature = FILE_SIGNATURES[expectedMimeType];
      
      if (!signature) return false;
      
      return signature.every((byte, index) => buffer[index] === byte);
    } catch (error) {
      console.error('Error validating file signature:', error);
      return false;
    }
  }

  // Scan file for malware (basic implementation)
  async scanFileForMalware(filePath) {
    try {
      // Check file size (suspiciously large files)
      const stats = fs.statSync(filePath);
      if (stats.size > 100 * 1024 * 1024) { // 100MB
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
          return { clean: false, reason: 'Executable file detected' };
        }
      }

      return { clean: true };
    } catch (error) {
      console.error('Error scanning file for malware:', error);
      return { clean: false, reason: 'Scan error' };
    }
  }

  // Check user storage quota
  async checkUserStorageQuota(userId, fileSize) {
    try {
      const db = require('../config/db');
      
      // Get user's current storage usage
      const usageQuery = `
        SELECT COALESCE(SUM(metadata->>'size')::bigint, 0) as total_size,
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
  }

  // Process and validate uploaded file
  async processUploadedFile(file, userId) {
    const tempPath = file.path;
    const finalPath = path.join(this.uploadDir, path.basename(tempPath));
    
    try {
      // 1. Validate file signature
      const isValidSignature = await this.validateFileSignature(tempPath, file.mimetype);
      if (!isValidSignature) {
        await this.quarantineFile(tempPath, 'Invalid file signature');
        throw new Error('File signature validation failed');
      }

      // 2. Scan for malware
      const scanResult = await this.scanFileForMalware(tempPath);
      if (!scanResult.clean) {
        await this.quarantineFile(tempPath, scanResult.reason);
        throw new Error(`File rejected: ${scanResult.reason}`);
      }

      // 3. Check storage quota
      const quotaCheck = await this.checkUserStorageQuota(userId, file.size);
      if (!quotaCheck.allowed) {
        throw new Error(`Storage quota exceeded. Used: ${quotaCheck.currentUsage} bytes, Quota: ${quotaCheck.quota} bytes`);
      }

      // 4. Process file based on type
      let processedPath = tempPath;
      if (file.mimetype.startsWith('image/')) {
        const processResult = await this.processImage(tempPath, finalPath);
        if (!processResult.success) {
          throw new Error(processResult.error);
        }
        processedPath = finalPath;
      } else if (file.mimetype.startsWith('audio/')) {
        const processResult = await this.processAudio(tempPath, finalPath);
        if (!processResult.success) {
          throw new Error(processResult.error);
        }
        processedPath = finalPath;
      } else {
        // Move file to final location
        fs.renameSync(tempPath, finalPath);
      }

      // 5. Generate file metadata
      const metadata = this.generateFileMetadata(file, processedPath);

      return {
        success: true,
        filePath: processedPath,
        metadata
      };

    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw error;
    }
  }

  // Process image with security enhancements
  async processImage(inputPath, outputPath) {
    try {
      const metadata = await sharp(inputPath).metadata();
      
      // Check for suspicious metadata
      if (metadata.exif) {
        const exif = metadata.exif;
        if (exif.GPSLatitude || exif.GPSLongitude) {
          console.warn('Image contains GPS data - removing for privacy');
        }
      }

      // Process image with security settings
      await sharp(inputPath)
        .resize(1200, 1200, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 85,
          progressive: true,
          mozjpeg: true
        })
        .toFile(outputPath);

      // Remove original temp file
      fs.unlinkSync(inputPath);

      return { success: true, outputPath };
    } catch (error) {
      console.error('Error processing image:', error);
      return { success: false, error: error.message };
    }
  }

  // Process audio with security enhancements
  async processAudio(inputPath, outputPath) {
    try {
      // For now, just move the file and validate it's actually audio
      // In production, you might want to use ffmpeg for audio processing
      
      // Basic validation - check if file is actually audio
      const buffer = fs.readFileSync(inputPath, { start: 0, end: 12 });
      const isValidAudio = this.validateFileSignature(inputPath, 'audio/mpeg') ||
                          this.validateFileSignature(inputPath, 'audio/wav') ||
                          this.validateFileSignature(inputPath, 'audio/mp4');
      
      if (!isValidAudio) {
        throw new Error('Invalid audio file');
      }

      fs.renameSync(inputPath, outputPath);
      return { success: true, outputPath };
    } catch (error) {
      console.error('Error processing audio:', error);
      return { success: false, error: error.message };
    }
  }

  // Quarantine suspicious files
  async quarantineFile(filePath, reason) {
    try {
      const quarantinePath = path.join(this.quarantineDir, path.basename(filePath));
      fs.renameSync(filePath, quarantinePath);
      
      // Log quarantine event
      console.warn(`File quarantined: ${path.basename(filePath)} - Reason: ${reason}`);
      
      // In production, you might want to store this in a database
      const quarantineLog = {
        filename: path.basename(filePath),
        reason,
        timestamp: new Date().toISOString(),
        originalPath: filePath
      };
      
      const logPath = path.join(this.quarantineDir, 'quarantine.log');
      fs.appendFileSync(logPath, JSON.stringify(quarantineLog) + '\n');
      
    } catch (error) {
      console.error('Error quarantining file:', error);
    }
  }

  // Generate secure file metadata
  generateFileMetadata(file, processedPath) {
    const stats = fs.statSync(processedPath);
    const hash = crypto.createHash('sha256');
    const fileBuffer = fs.readFileSync(processedPath);
    hash.update(fileBuffer);
    
    return {
      originalName: this.sanitizeFilename(file.originalname),
      filename: path.basename(processedPath),
      mimetype: file.mimetype,
      size: stats.size,
      hash: hash.digest('hex'),
      uploadedAt: new Date().toISOString(),
      type: file.mimetype.startsWith('image/') ? 'image' : 'audio',
      processed: true
    };
  }

  // Sanitize filename
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }

  // Delete file securely
  async deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        // Overwrite file with random data before deletion (secure deletion)
        const stats = fs.statSync(filePath);
        const randomData = crypto.randomBytes(stats.size);
        fs.writeFileSync(filePath, randomData);
        
        // Delete the file
        fs.unlinkSync(filePath);
        return { success: true };
      }
      return { success: false, error: 'File not found' };
    } catch (error) {
      console.error('Error deleting file:', error);
      return { success: false, error: error.message };
    }
  }

  // Clean up old files
  async cleanupOldFiles(olderThanDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      let deletedCount = 0;
      const files = fs.readdirSync(this.uploadDir);
      
      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          await this.deleteFile(filePath);
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
  }

  // Get file info securely
  getFileInfo(filePath) {
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
  }
}

module.exports = new EnhancedFileStorage();
