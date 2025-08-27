// Import the security module
class SecurityValidator {
  static SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
    /(--|\/\*|\*\/|;|'|"|\||&|\|)/g,
    /(\bOR\b.*?=.*?=|\bAND\b.*?=.*?=)/gi,
    /(\bUNION\b.*?\bSELECT\b)/gi
  ];

  static XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
  ];

  static PATH_TRAVERSAL_PATTERNS = [
    /\.\./g,
    /\/\.\./g,
    /\.\.\//g,
    /~\//g,
    /\%2e\%2e/gi,
    /\%2f/gi,
    /\%5c/gi
  ];

  static validateInput(input, type = 'string') {
    const errors = [];
    let sanitizedData = input;

    if (input === null || input === undefined) {
      return { isValid: true, errors: [], sanitizedData: null };
    }

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

      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(inputStr)) {
          errors.push('Invalid UUID format');
        }
        break;

      case 'string':
      default:
        sanitizedData = inputStr
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
        break;
    }

    if (inputStr.length > 10000) {
      errors.push('Input too long');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    };
  }

  static validateObject(obj, schema) {
    const allErrors = [];
    const sanitizedData = {};

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

  static generateCSRFToken() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  static checkRateLimit() {
    return true; // Simplified for testing
  }
}

async function testSecurityMeasures() {
  console.log('🔒 Testing Security Measures...\n');

  // 1. Test SQL Injection Detection
  console.log('1. Testing SQL Injection Detection:');
  const sqlTests = [
    "'; DROP TABLE users; --",
    "1 OR 1=1",
    "UNION SELECT * FROM users",
    "normal input"
  ];

  sqlTests.forEach(test => {
    const result = SecurityValidator.validateInput(test, 'string');
    console.log(`   Input: "${test}" → ${result.isValid ? '✅ Safe' : '❌ Blocked'}`);
    if (!result.isValid) {
      console.log(`     Errors: ${result.errors.join(', ')}`);
    }
  });

  // 2. Test XSS Detection
  console.log('\n2. Testing XSS Detection:');
  const xssTests = [
    "<script>alert('xss')</script>",
    "<iframe src='javascript:alert(1)'></iframe>",
    "javascript:alert('xss')",
    "normal text"
  ];

  xssTests.forEach(test => {
    const result = SecurityValidator.validateInput(test, 'string');
    console.log(`   Input: "${test}" → ${result.isValid ? '✅ Safe' : '❌ Blocked'}`);
    if (!result.isValid) {
      console.log(`     Errors: ${result.errors.join(', ')}`);
    }
  });

  // 3. Test Path Traversal Detection
  console.log('\n3. Testing Path Traversal Detection:');
  const pathTests = [
    "../../../etc/passwd",
    "..\\windows\\system32",
    "%2e%2e%2f",
    "normal-file.jpg"
  ];

  pathTests.forEach(test => {
    const result = SecurityValidator.validateInput(test, 'string');
    console.log(`   Input: "${test}" → ${result.isValid ? '✅ Safe' : '❌ Blocked'}`);
    if (!result.isValid) {
      console.log(`     Errors: ${result.errors.join(', ')}`);
    }
  });

  // 4. Test Email Validation
  console.log('\n4. Testing Email Validation:');
  const emailTests = [
    "valid@example.com",
    "invalid.email",
    "test@domain",
    "user@example.com'; DROP TABLE users; --"
  ];

  emailTests.forEach(test => {
    const result = SecurityValidator.validateInput(test, 'email');
    console.log(`   Email: "${test}" → ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);
    if (!result.isValid) {
      console.log(`     Errors: ${result.errors.join(', ')}`);
    }
  });

  // 5. Test UUID Validation
  console.log('\n5. Testing UUID Validation:');
  const uuidTests = [
    "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "invalid-uuid",
    "12345678-1234-1234-1234-123456789012",
    "f47ac10b-58cc-4372-a567-0e02b2c3d479'; DROP TABLE users; --"
  ];

  uuidTests.forEach(test => {
    const result = SecurityValidator.validateInput(test, 'uuid');
    console.log(`   UUID: "${test}" → ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);
    if (!result.isValid) {
      console.log(`     Errors: ${result.errors.join(', ')}`);
    }
  });

  // 6. Test Object Validation
  console.log('\n6. Testing Object Validation:');
  const testObject = {
    email: "user@example.com",
    userId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    name: "Valid Name",
    maliciousField: "<script>alert('xss')</script>"
  };

  const schema = {
    email: 'email',
    userId: 'uuid',
    name: 'string',
    maliciousField: 'string'
  };

  const objectResult = SecurityValidator.validateObject(testObject, schema);
  console.log(`   Object validation: ${objectResult.isValid ? '✅ Valid' : '❌ Invalid'}`);
  if (!objectResult.isValid) {
    console.log(`     Errors: ${objectResult.errors.join(', ')}`);
  }
  if (objectResult.sanitizedData) {
    console.log(`     Sanitized: ${JSON.stringify(objectResult.sanitizedData, null, 2)}`);
  }

  // 7. Test CSRF Token Generation
  console.log('\n7. Testing CSRF Token Generation:');
  const token1 = SecurityValidator.generateCSRFToken();
  const token2 = SecurityValidator.generateCSRFToken();
  console.log(`   Token 1: ${token1}`);
  console.log(`   Token 2: ${token2}`);
  console.log(`   Tokens are different: ${token1 !== token2 ? '✅ Yes' : '❌ No'}`);

  console.log('\n🔒 Security testing complete!');
}

// Test API security endpoint
async function testAPIEndpoint() {
  console.log('\n🌐 Testing API Endpoint Security...\n');

  const testCases = [
    {
      name: 'Normal Request',
      params: { nickname: 'daniel_koval' },
      shouldPass: true
    },
    {
      name: 'SQL Injection in nickname',
      params: { nickname: "'; DROP TABLE users; --" },
      shouldPass: false
    },
    {
      name: 'XSS in nickname',
      params: { nickname: "<script>alert('xss')</script>" },
      shouldPass: false
    },
    {
      name: 'Invalid UUID',
      params: { userId: 'invalid-uuid' },
      shouldPass: false
    },
    {
      name: 'Valid UUID',
      params: { userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
      shouldPass: true
    }
  ];

  for (const testCase of testCases) {
    try {
      const params = new URLSearchParams(testCase.params);
      const response = await fetch(`http://localhost:3000/api/supabase/dive-logs?${params}`);
      
      console.log(`${testCase.name}:`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Expected to pass: ${testCase.shouldPass ? 'Yes' : 'No'}`);
      console.log(`   Result: ${response.ok ? '✅ Passed' : '❌ Blocked'}`);
      
      if (response.status === 400) {
        const data = await response.json();
        console.log(`   Validation errors: ${data.details ? data.details.join(', ') : data.error}`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`${testCase.name}: ❌ Request failed - ${error.message}\n`);
    }
  }
}

// Run tests
if (require.main === module) {
  testSecurityMeasures().then(() => {
    return testAPIEndpoint();
  }).catch(console.error);
}

module.exports = { testSecurityMeasures, testAPIEndpoint };
