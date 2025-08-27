// Security utilities for input validation and sanitization
import { NextRequest } from 'next/server';

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

export class SecurityValidator {
  private static readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
    /(--|\/\*|\*\/|;|'|"|\||&|\|)/g,
    /(\bOR\b.*?=.*?=|\bAND\b.*?=.*?=)/gi,
    /(\bUNION\b.*?\bSELECT\b)/gi
  ];

  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
  ];

  private static readonly PATH_TRAVERSAL_PATTERNS = [
    /\.\./g,
    /\/\.\./g,
    /\.\.\//g,
    /~\//g,
    /\%2e\%2e/gi,
    /\%2f/gi,
    /\%5c/gi
  ];

  /**
   * Validate and sanitize user input
   */
  static validateInput(input: any, type: 'string' | 'number' | 'email' | 'url' | 'uuid' = 'string'): SecurityValidationResult {
    const errors: string[] = [];
    let sanitizedData = input;

    if (input === null || input === undefined) {
      return { isValid: true, errors: [], sanitizedData: null };
    }

    // Convert to string for validation
    const inputStr = String(input);

    // Check for SQL injection
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(inputStr)) {
        errors.push('Potential SQL injection detected');
        break;
      }
    }

    // Check for XSS
    for (const pattern of this.XSS_PATTERNS) {
      if (pattern.test(inputStr)) {
        errors.push('Potential XSS attack detected');
        break;
      }
    }

    // Check for path traversal
    for (const pattern of this.PATH_TRAVERSAL_PATTERNS) {
      if (pattern.test(inputStr)) {
        errors.push('Path traversal attempt detected');
        break;
      }
    }

    // Type-specific validation
    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(inputStr)) {
          errors.push('Invalid email format');
        }
        break;

      case 'url':
        try {
          const url = new URL(inputStr);
          if (!['http:', 'https:'].includes(url.protocol)) {
            errors.push('Invalid URL protocol');
          }
        } catch {
          errors.push('Invalid URL format');
        }
        break;

      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(inputStr)) {
          errors.push('Invalid UUID format');
        }
        break;

      case 'number':
        if (isNaN(Number(inputStr))) {
          errors.push('Invalid number format');
        } else {
          sanitizedData = Number(inputStr);
        }
        break;

      case 'string':
      default:
        // Sanitize HTML entities
        sanitizedData = inputStr
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
        break;
    }

    // Check length limits
    if (inputStr.length > 10000) {
      errors.push('Input too long');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    };
  }

  /**
   * Validate object with multiple fields
   */
  static validateObject(obj: Record<string, any>, schema: Record<string, 'string' | 'number' | 'email' | 'url' | 'uuid'>): SecurityValidationResult {
    const allErrors: string[] = [];
    const sanitizedData: Record<string, any> = {};

    for (const [key, type] of Object.entries(schema)) {
      if (obj.hasOwnProperty(key)) {
        const result = this.validateInput(obj[key], type);
        if (!result.isValid) {
          allErrors.push(...result.errors.map(err => `${key}: ${err}`));
        } else {
          sanitizedData[key] = result.sanitizedData;
        }
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      sanitizedData: allErrors.length === 0 ? sanitizedData : undefined
    };
  }

  /**
   * Check if request is from allowed origin
   */
  static validateOrigin(request: NextRequest, allowedOrigins: string[]): boolean {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    
    if (!origin && !referer) {
      // Allow same-origin requests (no origin header)
      return true;
    }

    const originToCheck = origin || (referer ? new URL(referer).origin : '');
    
    return allowedOrigins.includes(originToCheck) || 
           allowedOrigins.some(allowed => originToCheck.endsWith(allowed));
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Validate file upload
   */
  static validateFile(file: File, allowedTypes: string[], maxSize: number = 10 * 1024 * 1024): SecurityValidationResult {
    const errors: string[] = [];

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} not allowed`);
    }

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size ${file.size} exceeds maximum ${maxSize}`);
    }

    // Check filename
    const filename = file.name;
    if (this.PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(filename))) {
      errors.push('Invalid filename');
    }

    // Check for executable extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.jar'];
    if (dangerousExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
      errors.push('Potentially dangerous file type');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? {
        name: filename.replace(/[^a-zA-Z0-9._-]/g, '_'),
        type: file.type,
        size: file.size
      } : undefined
    };
  }

  /**
   * Rate limiting check
   */
  static checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    // This would typically use Redis or a database in production
    // For now, using in-memory storage (not suitable for production)
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    
    // This is a simplified implementation
    // In production, use Redis with INCR and EXPIRE commands
    return true; // Placeholder
  }

  /**
   * Log security event
   */
  static logSecurityEvent(event: {
    type: 'validation_failed' | 'rate_limit_exceeded' | 'suspicious_activity';
    details: string;
    ip?: string;
    userAgent?: string;
    timestamp: Date;
  }): void {
    // In production, send to security monitoring service
    console.warn('Security Event:', event);
  }
}

// Export utility functions
export const validateInput = SecurityValidator.validateInput;
export const validateObject = SecurityValidator.validateObject;
export const validateOrigin = SecurityValidator.validateOrigin;
export const generateCSRFToken = SecurityValidator.generateCSRFToken;
export const validateFile = SecurityValidator.validateFile;
