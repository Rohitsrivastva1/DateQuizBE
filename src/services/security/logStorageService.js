const fs = require('fs').promises;
const path = require('path');

class LogStorageService {
  constructor() {
    this.logDir = process.env.LOG_DIR || './logs';
    this.maxLogSize = parseInt(process.env.MAX_LOG_SIZE) || 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = parseInt(process.env.MAX_LOG_FILES) || 10;
    this.retentionDays = parseInt(process.env.LOG_RETENTION_DAYS) || 30;
    
    this.ensureLogDirectory();
  }

  // Ensure log directory exists
  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
      console.log('✅ Log directory ensured:', this.logDir);
    } catch (error) {
      console.error('❌ Failed to create log directory:', {
        error: error.message,
        logDir: this.logDir
      });
    }
  }

  // Store security event
  async storeSecurityEvent(event, details = {}) {
    try {
      const timestamp = new Date();
      const dateStr = timestamp.toISOString().split('T')[0];
      const logFile = path.join(this.logDir, `security-${dateStr}.log`);
      
      const logEntry = {
        timestamp: timestamp.toISOString(),
        event,
        details: this.sanitizeLogDetails(details),
        severity: this.getEventSeverity(event),
        source: 'security_monitor'
      };

      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
      
      // Check if log rotation is needed
      await this.checkLogRotation(logFile);
      
      console.log('🔒 Security event stored:', event, path.basename(logFile));

    } catch (error) {
      console.error('❌ Failed to store security event:', {
        error: error.message,
        event,
        details
      });
    }
  }

  // Store general application log
  async storeApplicationLog(level, message, details = {}) {
    try {
      const timestamp = new Date();
      const dateStr = timestamp.toISOString().split('T')[0];
      const logFile = path.join(this.logDir, `app-${dateStr}.log`);
      
      const logEntry = {
        timestamp: timestamp.toISOString(),
        level,
        message,
        details: this.sanitizeLogDetails(details),
        source: 'application'
      };

      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
      
      // Check if log rotation is needed
      await this.checkLogRotation(logFile);

    } catch (error) {
      console.error('❌ Failed to store application log:', {
        error: error.message,
        level,
        message
      });
    }
  }

  // Store error log
  async storeErrorLog(error, context = {}) {
    try {
      const timestamp = new Date();
      const dateStr = timestamp.toISOString().split('T')[0];
      const logFile = path.join(this.logDir, `error-${dateStr}.log`);
      
      const logEntry = {
        timestamp: timestamp.toISOString(),
        level: 'error',
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        context: this.sanitizeLogDetails(context),
        source: 'error_handler'
      };

      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
      
      // Check if log rotation is needed
      await this.checkLogRotation(logFile);

    } catch (err) {
      console.error('❌ Failed to store error log:', {
        error: err.message,
        originalError: error.message
      });
    }
  }

  // Check and perform log rotation
  async checkLogRotation(logFile) {
    try {
      const stats = await fs.stat(logFile);
      
      if (stats.size > this.maxLogSize) {
        await this.rotateLogFile(logFile);
      }
    } catch (error) {
      // File doesn't exist yet, that's okay
      if (error.code !== 'ENOENT') {
        console.error('❌ Failed to check log rotation:', {
          error: error.message,
          logFile
        });
      }
    }
  }

  // Rotate log file
  async rotateLogFile(logFile) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = `${logFile}.${timestamp}`;
      
      // Rename current file
      await fs.rename(logFile, rotatedFile);
      
      // Compress rotated file
      await this.compressLogFile(rotatedFile);
      
      // Clean up old log files
      await this.cleanupOldLogs(path.dirname(logFile));
      
      console.log('🔄 Log file rotated:', {
        originalFile: path.basename(logFile),
        rotatedFile: path.basename(rotatedFile)
      });

    } catch (error) {
      console.error('❌ Failed to rotate log file:', {
        error: error.message,
        logFile
      });
    }
  }

  // Compress log file
  async compressLogFile(filePath) {
    try {
      const zlib = require('zlib');
      const gzip = zlib.createGzip();
      const input = require('fs').createReadStream(filePath);
      const output = require('fs').createWriteStream(`${filePath}.gz`);
      
      input.pipe(gzip).pipe(output);
      
      return new Promise((resolve, reject) => {
        output.on('finish', () => {
          // Delete original file after compression
          fs.unlink(filePath).then(() => resolve()).catch(reject);
        });
        output.on('error', reject);
      });

    } catch (error) {
      console.error('❌ Failed to compress log file:', {
        error: error.message,
        filePath
      });
    }
  }

  // Clean up old log files
  async cleanupOldLogs(logDir) {
    try {
      const files = await fs.readdir(logDir);
      const logFiles = files
        .filter(file => file.endsWith('.log') || file.endsWith('.log.gz'))
        .map(file => ({
          name: file,
          path: path.join(logDir, file),
          stats: null
        }));

      // Get file stats
      for (const file of logFiles) {
        try {
          file.stats = await fs.stat(file.path);
        } catch (error) {
          // File might have been deleted, skip
          continue;
        }
      }

      // Sort by modification time (oldest first)
      logFiles.sort((a, b) => a.stats.mtime - b.stats.mtime);

      // Remove old files beyond retention limit
      const filesToDelete = logFiles.slice(0, Math.max(0, logFiles.length - this.maxLogFiles));
      
      for (const file of filesToDelete) {
        try {
          await fs.unlink(file.path);
          console.log('🗑️ Old log file deleted:', {
            fileName: file.name,
            age: Date.now() - file.stats.mtime
          });
        } catch (error) {
          console.error('❌ Failed to delete old log file:', {
            error: error.message,
            fileName: file.name
          });
        }
      }

      // Remove files older than retention period
      const cutoffDate = new Date(Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000));
      
      for (const file of logFiles) {
        if (file.stats && file.stats.mtime < cutoffDate) {
          try {
            await fs.unlink(file.path);
            console.log('🗑️ Expired log file deleted:', {
              fileName: file.name,
              age: Date.now() - file.stats.mtime
            });
          } catch (error) {
            console.error('❌ Failed to delete expired log file:', {
              error: error.message,
              fileName: file.name
            });
          }
        }
      }

    } catch (error) {
      console.error('❌ Failed to cleanup old logs:', {
        error: error.message,
        logDir
      });
    }
  }

  // Get log statistics
  async getLogStatistics() {
    try {
      const files = await fs.readdir(this.logDir);
      const logFiles = files.filter(file => file.endsWith('.log') || file.endsWith('.log.gz'));
      
      let totalSize = 0;
      let fileCount = 0;
      const fileStats = [];

      for (const file of logFiles) {
        try {
          const filePath = path.join(this.logDir, file);
          const stats = await fs.stat(filePath);
          
          totalSize += stats.size;
          fileCount++;
          
          fileStats.push({
            name: file,
            size: stats.size,
            modified: stats.mtime,
            isCompressed: file.endsWith('.gz')
          });
        } catch (error) {
          // File might have been deleted, skip
          continue;
        }
      }

      return {
        totalFiles: fileCount,
        totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        files: fileStats.sort((a, b) => b.modified - a.modified),
        retentionDays: this.retentionDays,
        maxLogSize: this.maxLogSize,
        maxLogFiles: this.maxLogFiles
      };

    } catch (error) {
      console.error('❌ Failed to get log statistics:', {
        error: error.message
      });
      return null;
    }
  }

  // Search logs
  async searchLogs(query, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        level = null,
        event = null,
        limit = 100
      } = options;

      const files = await fs.readdir(this.logDir);
      const logFiles = files
        .filter(file => file.endsWith('.log') && !file.endsWith('.gz'))
        .sort()
        .reverse(); // Start with most recent

      const results = [];
      let processedFiles = 0;

      for (const file of logFiles) {
        if (results.length >= limit) break;

        try {
          const filePath = path.join(this.logDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const lines = content.trim().split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (results.length >= limit) break;

            try {
              const logEntry = JSON.parse(line);
              
              // Apply filters
              if (startDate && new Date(logEntry.timestamp) < new Date(startDate)) continue;
              if (endDate && new Date(logEntry.timestamp) > new Date(endDate)) continue;
              if (level && logEntry.level !== level) continue;
              if (event && logEntry.event !== event) continue;
              
              // Search in message and details
              const searchText = JSON.stringify(logEntry).toLowerCase();
              if (query && !searchText.includes(query.toLowerCase())) continue;

              results.push(logEntry);
            } catch (parseError) {
              // Skip malformed JSON lines
              continue;
            }
          }

          processedFiles++;
        } catch (error) {
          console.error('❌ Failed to read log file during search:', {
            error: error.message,
            file
          });
        }
      }

      return {
        results: results.slice(0, limit),
        total: results.length,
        processedFiles,
        query,
        options
      };

    } catch (error) {
      console.error('❌ Failed to search logs:', {
        error: error.message,
        query
      });
      return null;
    }
  }

  // Sanitize log details
  sanitizeLogDetails(details) {
    if (!details || typeof details !== 'object') {
      return details;
    }

    const sanitized = { ...details };
    const sensitiveFields = [
      'password', 'password_hash', 'token', 'jwt', 'secret', 'key',
      'authorization', 'cookie', 'session', 'auth', 'credential',
      'email', 'phone', 'ssn', 'credit_card', 'cvv', 'pin'
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  // Get event severity
  getEventSeverity(event) {
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

  // Initialize log storage
  async initialize() {
    await this.ensureLogDirectory();
    await this.cleanupOldLogs(this.logDir);
    
    console.log('✅ Log storage service initialized:', {
      logDir: this.logDir,
      maxLogSize: this.maxLogSize,
      maxLogFiles: this.maxLogFiles,
      retentionDays: this.retentionDays
    });
  }
}

// Create singleton instance
const logStorageService = new LogStorageService();

module.exports = logStorageService;
