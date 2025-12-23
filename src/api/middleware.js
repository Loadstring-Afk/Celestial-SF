import { createHash } from 'crypto';
import { RateLimiterMemory } from 'rate-limiter-flexible';

export class SecurityMiddleware {
  constructor() {
    this.rateLimiter = new RateLimiterMemory({
      points: 50,
      duration: 60,
      blockDuration: 300
    });
    
    this.requestCache = new Map();
    this.requestTimestamps = new Map();
  }

  validateRequest(req, res, next) {
    // Validate Content-Type
    if (req.method === 'POST' && !req.is('application/json')) {
      return res.status(415).json({ error: 'Unsupported Media Type' });
    }
    
    // Size limits
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'Payload too large' });
    }
    
    // Request fingerprinting
    const fingerprint = this.generateFingerprint(req);
    req.fingerprint = fingerprint;
    
    // Check for rapid requests
    const now = Date.now();
    const lastRequest = this.requestTimestamps.get(fingerprint) || 0;
    
    if (now - lastRequest < 100) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    this.requestTimestamps.set(fingerprint, now);
    
    // Cache-based duplicate detection
    const requestHash = this.hashRequest(req);
    if (this.requestCache.has(requestHash)) {
      const cached = this.requestCache.get(requestHash);
      if (Date.now() - cached.timestamp < 5000) {
        return res.json(cached.response);
      }
    }
    
    next();
  }

  generateFingerprint(req) {
    const components = [
      req.ip,
      req.headers['user-agent'],
      req.headers['accept-language'],
      req.headers['accept-encoding']
    ].filter(Boolean).join('|');
    
    return createHash('sha256').update(components).digest('hex').substring(0, 16);
  }

  hashRequest(req) {
    const data = {
      body: req.body,
      path: req.path,
      method: req.method,
      fingerprint: req.fingerprint
    };
    
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  cacheResponse(req, response) {
    const requestHash = this.hashRequest(req);
    this.requestCache.set(requestHash, {
      timestamp: Date.now(),
      response: response
    });
    
    // Clean old cache entries
    if (this.requestCache.size > 1000) {
      const now = Date.now();
      for (const [key, entry] of this.requestCache.entries()) {
        if (now - entry.timestamp > 30000) {
          this.requestCache.delete(key);
        }
      }
    }
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove potentially dangerous patterns
    const dangerousPatterns = [
      /\\x[0-9a-f]{2}/gi,
      /\\u[0-9a-f]{4}/gi,
      /\\[0-7]{1,3}/g,
      /\\?[\r\n]+/g,
      /\\?['"`]/g
    ];
    
    let sanitized = input;
    for (const pattern of dangerousPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }
    
    // Truncate if too long
    if (sanitized.length > 1000000) {
      sanitized = sanitized.substring(0, 1000000);
    }
    
    return sanitized;
  }
}

export const securityMiddleware = new SecurityMiddleware();