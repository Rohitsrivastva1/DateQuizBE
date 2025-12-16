const { body, param, query, validationResult } = require('express-validator');
const { sanitizeBody, sanitizeParam, sanitizeQuery } = require('express-validator');
const DOMPurify = require('isomorphic-dompurify');
const validator = require('validator');

// Custom validation functions
const customValidators = {
  // Validate date format (YYYY-MM-DD)
  isValidDate: (value) => {
    if (!value) return true; // Optional field
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) return false;
    const date = new Date(value + 'T00:00:00.000Z');
    return date instanceof Date && !isNaN(date);
  },

  // Validate age range
  isValidAge: (value) => {
    if (!value) return true; // Optional field
    const age = parseInt(value);
    return !isNaN(age) && age >= 13 && age <= 120;
  },

  // Validate gender
  isValidGender: (value) => {
    if (!value) return true; // Optional field
    const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
    return validGenders.includes(value.toLowerCase());
  },

  // Validate emoji (basic check)
  isValidEmoji: (value) => {
    if (!value) return false;
    // Check if it's a valid emoji (basic check)
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
    return emojiRegex.test(value) && value.length <= 10;
  },

  // Validate journal content (XSS protection)
  isValidJournalContent: (value) => {
    if (!value) return true; // Optional field
    // Check for potential XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi
    ];
    return !xssPatterns.some(pattern => pattern.test(value));
  },

  // Validate file type by magic number
  isValidFileType: (file) => {
    if (!file || !file.buffer) return false;
    
    const buffer = file.buffer;
    const magicNumbers = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46],
      'image/webp': [0x52, 0x49, 0x46, 0x46],
      'audio/mpeg': [0xFF, 0xFB],
      'audio/wav': [0x52, 0x49, 0x46, 0x46],
      'audio/mp4': [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]
    };

    const mimeType = file.mimetype;
    const expectedMagic = magicNumbers[mimeType];
    
    if (!expectedMagic) return false;
    
    return expectedMagic.every((byte, index) => buffer[index] === byte);
  }
};

// Sanitization functions
const sanitizers = {
  // Sanitize HTML content
  sanitizeHtml: (value) => {
    if (!value) return value;
    return DOMPurify.sanitize(value, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: []
    });
  },

  // Sanitize text input
  sanitizeText: (value) => {
    if (!value) return value;
    return validator.escape(value.trim());
  },

  // Sanitize email
  sanitizeEmail: (value) => {
    if (!value) return value;
    return validator.normalizeEmail(value.trim());
  },

  // Sanitize filename
  sanitizeFilename: (value) => {
    if (!value) return value;
    return value.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 255);
  }
};

// Common validation rules
const commonRules = {
  // User registration validation
  userRegistration: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .custom(sanitizers.sanitizeText)
      .withMessage('Invalid characters in name'),
    
    body('email')
      .isEmail()
      .withMessage('Must be a valid email address')
      .normalizeEmail()
      .isLength({ max: 255 })
      .withMessage('Email too long'),
    
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    body('age')
      .optional()
      .isInt({ min: 13, max: 120 })
      .withMessage('Age must be between 13 and 120'),
    
    body('city')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('City name too long')
      .custom(sanitizers.sanitizeText),
    
    body('gender')
      .optional()
      .custom(customValidators.isValidGender)
      .withMessage('Invalid gender value'),
    
    body('dob')
      .optional()
      .custom(customValidators.isValidDate)
      .withMessage('Date of birth must be in YYYY-MM-DD format')
  ],

  // Journal content validation
  journalContent: [
    // Content is optional text up to 2000; coerce empty to undefined
    body('content')
      .optional({ nullable: true })
      .customSanitizer(v => {
        if (v === '') return undefined;
        if (v === null || v === undefined) return v;
        if (typeof v === 'string') return v;
        try { return String(v); } catch { return undefined; }
      })
      .isLength({ max: 2000 })
      .withMessage('Content must not exceed 2000 characters')
      .custom(customValidators.isValidJournalContent)
      .withMessage('Content contains invalid characters')
      .customSanitizer(sanitizers.sanitizeHtml),

    // Theme optional short text
    body('theme')
      .optional({ nullable: true })
      .customSanitizer(v => v === '' ? undefined : String(v))
      .trim()
      .isLength({ max: 50 })
      .withMessage('Theme must not exceed 50 characters')
      .custom(sanitizers.sanitizeText),

    // isPrivate may arrive as "true"/"false"; coerce to boolean
    body('isPrivate')
      .optional({ nullable: true })
      .customSanitizer(v => v === '' || v === null || v === undefined ? undefined : v)
      .toBoolean()
      .isBoolean().withMessage('isPrivate must be a boolean'),

    // Unlock date may be empty string; treat empty as missing
    body('unlockDate')
      .optional({ nullable: true })
      .customSanitizer(v => v === '' ? undefined : v)
      .custom(customValidators.isValidDate)
      .withMessage('Unlock date must be in YYYY-MM-DD format'),

    body('location')
      .optional({ nullable: true })
      .customSanitizer(v => v === '' ? undefined : v)
      .trim()
      .isLength({ max: 200 })
      .withMessage('Location must not exceed 200 characters')
      .custom(sanitizers.sanitizeText),

    body('weather')
      .optional({ nullable: true })
      .customSanitizer(v => v === '' ? undefined : v)
      .trim()
      .isLength({ max: 50 })
      .withMessage('Weather must not exceed 50 characters')
      .custom(sanitizers.sanitizeText)
  ],

  // Message validation
  messageContent: [
    body('content')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Message content must not exceed 2000 characters')
      .custom(customValidators.isValidJournalContent)
      .withMessage('Message contains invalid characters')
      .customSanitizer(sanitizers.sanitizeHtml),
    
    body('type')
      .isIn(['text', 'image', 'audio', 'emoji', 'system'])
      .withMessage('Invalid message type'),
    
    body('mediaUrl')
      .optional()
      .isURL()
      .withMessage('Invalid media URL'),
    
    body('mediaMetadata')
      .optional()
      .isObject()
      .withMessage('Media metadata must be an object'),
    
    body('replyToMessageId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid reply message ID')
  ],

  // Reaction validation
  reactionValidation: [
    body('emoji')
      .custom(customValidators.isValidEmoji)
      .withMessage('Invalid emoji format')
  ],

  // File upload validation
  fileUpload: [
    body('type')
      .optional()
      .isIn(['image', 'audio'])
      .withMessage('File type must be image or audio'),
    
    body('replyToMessageId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid reply message ID')
  ],

  // Parameter validation
  paramValidation: {
    userId: param('id').isInt({ min: 1 }).withMessage('Invalid user ID'),
    journalId: param('journalId').isInt({ min: 1 }).withMessage('Invalid journal ID'),
    messageId: param('messageId').isInt({ min: 1 }).withMessage('Invalid message ID'),
    coupleId: param('coupleId').isInt({ min: 1 }).withMessage('Invalid couple ID'),
    date: param('date').custom(customValidators.isValidDate).withMessage('Invalid date format'),
    year: param('year').isInt({ min: 2020, max: 2030 }).withMessage('Invalid year'),
    month: param('month').isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
    filename: param('filename')
      .isLength({ min: 1, max: 255 })
      .withMessage('Invalid filename length')
      .custom(sanitizers.sanitizeFilename)
      .withMessage('Invalid filename characters')
  },

  // Query validation
  queryValidation: {
    pagination: [
      query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ],
    
    search: [
      query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long'),
      query('status').optional().isIn(['active', 'inactive', 'pending']).withMessage('Invalid status'),
      query('sort_by').optional().isIn(['id', 'username', 'email', 'age', 'city', 'created_at']).withMessage('Invalid sort field'),
      query('sort_order').optional().isIn(['ASC', 'DESC']).withMessage('Invalid sort order')
    ]
  }
};

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    try {
      console.warn('Validation errors on', req.method, req.originalUrl, JSON.stringify(errors.array()));
    } catch (_) {}
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Rate limiting for sensitive operations
const sensitiveOperationRateLimit = (req, res, next) => {
  // This would integrate with your rate limiting middleware
  // For now, just pass through
  next();
};

// File upload security validation
const validateFileUpload = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  const errors = [];
  const maxFileSize = 50 * 1024 * 1024; // 50MB
  const maxFiles = 5;
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg'
  ];

  // Check number of files
  if (req.files.length > maxFiles) {
    errors.push(`Maximum ${maxFiles} files allowed per upload`);
  }

  for (const file of req.files) {
    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File ${file.originalname} exceeds 50MB limit`);
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} not allowed for ${file.originalname}`);
    }

    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp3', '.wav', '.m4a', '.aac', '.ogg'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(`File extension ${fileExtension} not allowed for ${file.originalname}`);
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
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'File validation failed',
      details: errors
    });
  }

  next();
};

module.exports = {
  customValidators,
  sanitizers,
  commonRules,
  handleValidationErrors,
  sensitiveOperationRateLimit,
  validateFileUpload
};
