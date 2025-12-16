const crypto = require('crypto');

class SecureLogger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.sensitiveFields = [
      'password', 'password_hash', 'token', 'jwt', 'secret', 'key',
      'authorization', 'cookie', 'session', 'auth', 'credential',
      'email', 'phone', 'ssn', 'credit_card', 'cvv', 'pin'
    ];
    
    // Initialize log storage will be done separately to avoid circular dependency
  }

  // Sanitize sensitive data from objects
  sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      if (this.sensitiveFields.some(field => lowerKey.includes(field))) {
        // Replace sensitive data with masked version
        if (typeof value === 'string' && value.length > 0) {
          sanitized[key] = this.maskSensitiveData(value);
        } else {
          sanitized[key] = '[REDACTED]';
        }
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // Mask sensitive data
  maskSensitiveData(value) {
    if (!value || typeof value !== 'string') {
      return '[REDACTED]';
    }

    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }

    // Show first 2 and last 2 characters, mask the rest
    const start = value.substring(0, 2);
    const end = value.substring(value.length - 2);
    const middle = '*'.repeat(Math.max(4, value.length - 4));
    
    return `${start}${middle}${end}`;
  }

  // Secure log function
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data: this.sanitizeData(data) })
    };

    // In production, use structured logging
    if (this.isProduction) {
      console.log(JSON.stringify(logEntry));
    } else {
      // In development, use formatted logging
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
      if (data) {
        console.log('Data:', this.sanitizeData(data));
      }
    }
  }

  // Log levels
  info(message, data = null) {
    this.log('info', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  debug(message, data = null) {
    if (!this.isProduction) {
      this.log('debug', message, data);
    }
  }

  // Security-specific logging
  security(event, details = {}) {
    const securityLog = {
      event,
      timestamp: new Date().toISOString(),
      details: this.sanitizeData(details),
      severity: this.getSecuritySeverity(event)
    };

    // Log to console
    console.log(`[SECURITY] ${JSON.stringify(securityLog)}`);
    
    // Note: Log storage and alerting will be handled separately to avoid circular dependencies
  }

  // Get security event severity
  getSecuritySeverity(event) {
    const highSeverityEvents = [
      'authentication_failure',
      'authorization_failure',
      'suspicious_activity',
      'file_quarantine',
      'rate_limit_exceeded',
      'malicious_upload_attempt'
    ];

    const mediumSeverityEvents = [
      'cors_violation',
      'invalid_input',
      'file_validation_failure',
      'quota_exceeded'
    ];

    if (highSeverityEvents.includes(event)) {
      return 'HIGH';
    } else if (mediumSeverityEvents.includes(event)) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  // Log authentication events
  logAuth(event, userId, details = {}) {
    this.security(`auth_${event}`, {
      userId,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // Log file upload events
  logFileUpload(event, userId, filename, details = {}) {
    this.security(`file_${event}`, {
      userId,
      filename: this.maskSensitiveData(filename),
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // Log API access
  logApiAccess(method, path, userId, statusCode, details = {}) {
    this.security('api_access', {
      method,
      path,
      userId,
      statusCode,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // Log security violations
  logSecurityViolation(violation, details = {}) {
    this.security('security_violation', {
      violation,
      timestamp: new Date().toISOString(),
      ...details
    });
  }
}

// Create singleton instance
const secureLogger = new SecureLogger();

// Export both class and instance
module.exports = {
  SecureLogger,
  logger: secureLogger
};
