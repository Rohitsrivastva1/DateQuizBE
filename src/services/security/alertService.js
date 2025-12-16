const nodemailer = require('nodemailer');

class AlertService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.emailTransporter = this.createEmailTransporter();
    this.alertThresholds = {
      HIGH: 1,      // Immediate alert
      MEDIUM: 5,    // Alert after 5 events in 10 minutes
      LOW: 10       // Alert after 10 events in 30 minutes
    };
    this.alertCounts = new Map(); // Track alert counts
    this.alertCooldowns = new Map(); // Prevent spam
  }

  // Create email transporter
  createEmailTransporter() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email credentials not configured. Alerts will be logged only.');
      return null;
    }

    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'schoolabe10@gmail.com',
        pass: process.env.EMAIL_PASS || 'ejmv hrau cogi qqxx'
      }
    });
  }

  // Send security alert
  async sendSecurityAlert(severity, event, details = {}) {
    try {
      // Check if we should send alert based on thresholds
      if (!this.shouldSendAlert(severity, event)) {
        return;
      }

      // Create alert message
      const alertMessage = this.createAlertMessage(severity, event, details);
      
      // Send email alert
      if (this.emailTransporter) {
        await this.sendEmailAlert(severity, alertMessage, details);
      }

      // Log the alert
      console.log('🚨 Security alert sent:', {
        severity,
        event,
        details: this.sanitizeAlertDetails(details)
      });

      // Update alert counts
      this.updateAlertCount(severity, event);

    } catch (error) {
      console.error('❌ Failed to send security alert:', {
        error: error.message,
        severity,
        event
      });
    }
  }

  // Check if we should send alert based on thresholds and cooldowns
  shouldSendAlert(severity, event) {
    const now = Date.now();
    const eventKey = `${severity}_${event}`;
    
    // Check cooldown (prevent spam)
    const cooldownKey = `${eventKey}_cooldown`;
    const lastAlert = this.alertCooldowns.get(cooldownKey);
    const cooldownPeriod = this.getCooldownPeriod(severity);
    
    if (lastAlert && (now - lastAlert) < cooldownPeriod) {
      return false;
    }

    // Check threshold
    const threshold = this.alertThresholds[severity];
    const currentCount = this.alertCounts.get(eventKey) || 0;
    
    if (currentCount >= threshold) {
      this.alertCooldowns.set(cooldownKey, now);
      return true;
    }

    return false;
  }

  // Get cooldown period based on severity
  getCooldownPeriod(severity) {
    switch (severity) {
      case 'HIGH': return 5 * 60 * 1000;    // 5 minutes
      case 'MEDIUM': return 15 * 60 * 1000; // 15 minutes
      case 'LOW': return 60 * 60 * 1000;    // 1 hour
      default: return 30 * 60 * 1000;       // 30 minutes
    }
  }

  // Update alert count
  updateAlertCount(severity, event) {
    const eventKey = `${severity}_${event}`;
    const currentCount = this.alertCounts.get(eventKey) || 0;
    this.alertCounts.set(eventKey, currentCount + 1);

    // Reset count after threshold period
    setTimeout(() => {
      this.alertCounts.delete(eventKey);
    }, this.getThresholdPeriod(severity));
  }

  // Get threshold period
  getThresholdPeriod(severity) {
    switch (severity) {
      case 'HIGH': return 5 * 60 * 1000;     // 5 minutes
      case 'MEDIUM': return 10 * 60 * 1000;  // 10 minutes
      case 'LOW': return 30 * 60 * 1000;     // 30 minutes
      default: return 15 * 60 * 1000;        // 15 minutes
    }
  }

  // Create alert message
  createAlertMessage(severity, event, details) {
    const timestamp = new Date().toISOString();
    const severityEmoji = this.getSeverityEmoji(severity);
    
    return {
      subject: `${severityEmoji} Security Alert: ${event} - ${severity} Severity`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${this.getSeverityColor(severity)}; color: white; padding: 20px; text-align: center;">
            <h1>${severityEmoji} Security Alert</h1>
            <h2>${event}</h2>
            <p>Severity: ${severity}</p>
            <p>Time: ${timestamp}</p>
          </div>
          
          <div style="padding: 20px; background-color: #f5f5f5;">
            <h3>Event Details:</h3>
            <pre style="background-color: white; padding: 15px; border-radius: 5px; overflow-x: auto;">
${JSON.stringify(details, null, 2)}
            </pre>
          </div>
          
          <div style="padding: 20px; background-color: #e8f4f8;">
            <h3>Recommended Actions:</h3>
            <ul>
              ${this.getRecommendedActions(severity, event)}
            </ul>
          </div>
          
          <div style="padding: 20px; text-align: center; color: #666;">
            <p>This is an automated security alert from DateQuiz Security System.</p>
            <p>If you believe this is a false positive, please contact the security team.</p>
          </div>
        </div>
      `,
      text: `
Security Alert: ${event}
Severity: ${severity}
Time: ${timestamp}

Details:
${JSON.stringify(details, null, 2)}

Recommended Actions:
${this.getRecommendedActionsText(severity, event)}
      `
    };
  }

  // Get severity emoji
  getSeverityEmoji(severity) {
    switch (severity) {
      case 'HIGH': return '🚨';
      case 'MEDIUM': return '⚠️';
      case 'LOW': return 'ℹ️';
      default: return '📢';
    }
  }

  // Get severity color
  getSeverityColor(severity) {
    switch (severity) {
      case 'HIGH': return '#dc3545';
      case 'MEDIUM': return '#ffc107';
      case 'LOW': return '#17a2b8';
      default: return '#6c757d';
    }
  }

  // Get recommended actions
  getRecommendedActions(severity, event) {
    const actions = {
      'authentication_failure': [
        'Check for brute force attacks',
        'Review failed login attempts',
        'Consider implementing account lockout',
        'Monitor for suspicious IP addresses'
      ],
      'file_quarantine': [
        'Review quarantined file',
        'Check for malware patterns',
        'Notify user of file rejection',
        'Update malware signatures if needed'
      ],
      'rate_limit_exceeded': [
        'Check for DDoS attacks',
        'Review rate limiting rules',
        'Monitor IP addresses',
        'Consider IP blocking if necessary'
      ],
      'malicious_upload_attempt': [
        'Block user if repeated attempts',
        'Review file upload security',
        'Update file validation rules',
        'Notify security team'
      ],
      'cors_violation': [
        'Review CORS configuration',
        'Check for unauthorized origins',
        'Update allowed origins if needed',
        'Monitor for potential attacks'
      ]
    };

    const eventActions = actions[event] || [
      'Review the security event',
      'Check system logs for more details',
      'Contact security team if needed',
      'Update security policies if necessary'
    ];

    return eventActions.map(action => `<li>${action}</li>`).join('');
  }

  // Get recommended actions as text
  getRecommendedActionsText(severity, event) {
    const actions = {
      'authentication_failure': [
        'Check for brute force attacks',
        'Review failed login attempts',
        'Consider implementing account lockout',
        'Monitor for suspicious IP addresses'
      ],
      'file_quarantine': [
        'Review quarantined file',
        'Check for malware patterns',
        'Notify user of file rejection',
        'Update malware signatures if needed'
      ],
      'rate_limit_exceeded': [
        'Check for DDoS attacks',
        'Review rate limiting rules',
        'Monitor IP addresses',
        'Consider IP blocking if necessary'
      ],
      'malicious_upload_attempt': [
        'Block user if repeated attempts',
        'Review file upload security',
        'Update file validation rules',
        'Notify security team'
      ],
      'cors_violation': [
        'Review CORS configuration',
        'Check for unauthorized origins',
        'Update allowed origins if needed',
        'Monitor for potential attacks'
      ]
    };

    const eventActions = actions[event] || [
      'Review the security event',
      'Check system logs for more details',
      'Contact security team if needed',
      'Update security policies if necessary'
    ];

    return eventActions.map((action, index) => `${index + 1}. ${action}`).join('\n');
  }

  // Send email alert
  async sendEmailAlert(severity, alertMessage, details) {
    if (!this.emailTransporter) {
      logger.warn('Email transporter not configured, skipping email alert');
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'schoolabe10@gmail.com',
      to: process.env.SECURITY_ALERT_EMAIL || 'schoolabe10@gmail.com',
      subject: alertMessage.subject,
      text: alertMessage.text,
      html: alertMessage.html
    };

    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log('📧 Security alert email sent successfully:', {
        severity,
        event: details.event,
        recipient: mailOptions.to
      });
    } catch (error) {
      console.error('❌ Failed to send security alert email:', {
        error: error.message,
        severity,
        event: details.event
      });
    }
  }

  // Sanitize alert details
  sanitizeAlertDetails(details) {
    const sanitized = { ...details };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  // Send immediate alert (bypasses thresholds)
  async sendImmediateAlert(severity, event, details = {}) {
    const alertMessage = this.createAlertMessage(severity, event, details);
    
    if (this.emailTransporter) {
      await this.sendEmailAlert(severity, alertMessage, details);
    }

    console.log('🚨 Immediate security alert sent:', {
      severity,
      event,
      details: this.sanitizeAlertDetails(details)
    });
  }

  // Test alert system
  async testAlertSystem() {
    console.log('🧪 Testing alert system...');
    
    await this.sendImmediateAlert('LOW', 'test_alert', {
      message: 'This is a test alert to verify the alert system is working',
      timestamp: new Date().toISOString(),
      test: true
    });
  }
}

// Create singleton instance
const alertService = new AlertService();

module.exports = alertService;
