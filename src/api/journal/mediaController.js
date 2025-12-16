const fileStorage = require('../../services/fileStorage');
const messageQueries = require('../../services/db/messageQueries');
const { validationResult } = require('express-validator');
const { validateFileUpload } = require('../../middleware/inputValidation');
const path = require('path');
const fs = require('fs');

// Upload media files
const uploadMedia = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No files uploaded' 
      });
    }

    const { journalId } = req.params;
    const { type, replyToMessageId } = req.body;

    // Check if user has access to this journal
    const hasAccess = await messageQueries.hasJournalAccess(req.user.id, journalId);
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to upload media to this journal' 
      });
    }

    const uploadedFiles = [];
    const uploadErrors = [];

    for (const file of req.files) {
      try {
        // Enhanced file validation with user quota check
        const validation = await fileStorage.validateFile(file, req.user.id);
        if (!validation.isValid) {
          uploadErrors.push({
            filename: file.originalname,
            errors: validation.errors
          });
          continue;
        }

        // Scan file for malware
        const scanResult = await fileStorage.scanFileForMalware(file.path);
        if (!scanResult.clean) {
          uploadErrors.push({
            filename: file.originalname,
            errors: [`File rejected: ${scanResult.reason}`]
          });
          continue;
        }

        // Validate file signature
        const fileBuffer = fs.readFileSync(file.path);
        const isValidSignature = fileStorage.validateFileSignature(fileBuffer, file.mimetype);
        if (!isValidSignature) {
          uploadErrors.push({
            filename: file.originalname,
            errors: ['File signature validation failed - file may be corrupted or malicious']
          });
          continue;
        }

        let processedPath = file.path;
        let processingResult;

        // Process file based on type
        if (file.mimetype.startsWith('image/')) {
          processingResult = await fileStorage.processImage(file.path, {
            width: 1200,
            height: 1200,
            quality: 85
          });
        } else if (file.mimetype.startsWith('audio/')) {
          processingResult = await fileStorage.processAudio(file.path);
        }

        if (!processingResult.success) {
          uploadErrors.push({
            filename: file.originalname,
            errors: [processingResult.error]
          });
          continue;
        }

        // Generate enhanced metadata with security info
        const metadata = fileStorage.generateFileMetadata(file, processedPath);
        metadata.security = {
          scanned: true,
          clean: true,
          signatureValid: true,
          scannedAt: new Date().toISOString()
        };

        // Create message record
        const message = await messageQueries.createMessage({
          journalId,
          senderId: req.user.id,
          type: type || (file.mimetype.startsWith('image/') ? 'image' : 'audio'),
          content: null,
          mediaUrl: `/uploads/${path.basename(processedPath)}`,
          mediaMetadata: metadata,
          replyToMessageId
        });

        uploadedFiles.push({
          messageId: message.messageId,
          filename: file.originalname,
          mediaUrl: message.mediaUrl,
          metadata
        });

      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        uploadErrors.push({
          filename: file.originalname,
          errors: [error.message]
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        uploadedFiles,
        errors: uploadErrors.length > 0 ? uploadErrors : undefined
      }
    });

  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload media' 
    });
  }
};

// Get media gallery for a journal
const getMediaGallery = async (req, res) => {
  try {
    const { journalId } = req.params;
    const { type, page = 1, limit = 20 } = req.query;

    // Check if user has access to this journal
    const hasAccess = await messageQueries.hasJournalAccess(req.user.id, journalId);
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to view media in this journal' 
      });
    }

    const offset = (page - 1) * limit;
    const media = await messageQueries.getMediaGallery(journalId, type, limit, offset);

    res.json({
      success: true,
      data: {
        media,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: media.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting media gallery:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get media gallery' 
    });
  }
};

// Delete media file
const deleteMedia = async (req, res) => {
  try {
    const { messageId } = req.params;

    // Check if user owns this message
    const message = await messageQueries.getMessageById(messageId);
    if (!message) {
      return res.status(404).json({ 
        success: false, 
        error: 'Message not found' 
      });
    }

    if (message.senderId !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to delete this media' 
      });
    }

    // Delete the file from storage
    if (message.mediaUrl) {
      const filePath = path.join(__dirname, '../../uploads', path.basename(message.mediaUrl));
      const deleteResult = fileStorage.deleteFile(filePath);
      
      if (!deleteResult.success) {
        console.warn('Failed to delete file:', deleteResult.error);
      }
    }

    // Delete the message record
    await messageQueries.deleteMessage(messageId);

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete media' 
    });
  }
};

// Get media file info
const getMediaInfo = async (req, res) => {
  try {
    const { messageId } = req.params;

    // Check if user has access to this message
    const hasAccess = await messageQueries.hasMessageAccess(req.user.id, messageId);
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to view this media' 
      });
    }

    const message = await messageQueries.getMessageById(messageId);
    if (!message || !message.mediaUrl) {
      return res.status(404).json({ 
        success: false, 
        error: 'Media not found' 
      });
    }

    const filePath = path.join(__dirname, '../../uploads', path.basename(message.mediaUrl));
    const fileInfo = fileStorage.getFileInfo(filePath);

    if (!fileInfo.success) {
      return res.status(404).json({ 
        success: false, 
        error: 'Media file not found' 
      });
    }

    res.json({
      success: true,
      data: {
        messageId: message.messageId,
        mediaUrl: message.mediaUrl,
        metadata: message.mediaMetadata,
        fileInfo: fileInfo.info
      }
    });

  } catch (error) {
    console.error('Error getting media info:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get media info' 
    });
  }
};

// Serve media files
const serveMedia = async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid filename' 
      });
    }

    const filePath = path.join(__dirname, '../../uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'File not found' 
      });
    }

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error serving media:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to serve media' 
    });
  }
};

module.exports = {
  uploadMedia,
  getMediaGallery,
  deleteMedia,
  getMediaInfo,
  serveMedia
};
