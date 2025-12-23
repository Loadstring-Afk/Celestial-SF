import express from 'express';
import { Obfuscator } from '../core/obfuscator.js';
import { SecurityAnalyzer } from '../core/security-analyzer.js';
import { securityMiddleware } from './middleware.js';
import { createHash } from 'crypto';

const router = express.Router();
const obfuscator = new Obfuscator();
const securityAnalyzer = new SecurityAnalyzer();

// Request validation middleware
router.use((req, res, next) => {
  // Validate request method
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  next();
});

// Apply custom security middleware
router.use(securityMiddleware.validateRequest.bind(securityMiddleware));

// Request logging middleware
router.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = createHash('sha256')
    .update(`${Date.now()}${Math.random()}`)
    .digest('hex')
    .substring(0, 16);
  
  req.requestId = requestId;
  
  // Log request
  console.log(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.path} from ${req.ip}`);
  
  // Capture response to log
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;
    const size = Buffer.byteLength(body || '', 'utf8');
    
    console.log(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms ${size} bytes`);
    
    return originalSend.call(this, body);
  };
  
  next();
});

// Rate limiting for specific endpoints
const endpointRateLimits = {
  '/obfuscate': {
    points: 20,
    duration: 60,
    blockDuration: 300
  }
};

router.use((req, res, next) => {
  const endpoint = req.path;
  const limit = endpointRateLimits[endpoint];
  
  if (limit) {
    const key = `${req.ip}:${endpoint}`;
    const now = Date.now();
    const lastRequest = securityMiddleware.requestTimestamps.get(key) || 0;
    
    if (now - lastRequest < (1000 / limit.points) * limit.duration) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((limit.blockDuration * 1000) / 1000),
        endpoint: endpoint
      });
    }
    
    securityMiddleware.requestTimestamps.set(key, now);
  }
  
  next();
});

// Main obfuscation endpoint
router.post('/obfuscate', async (req, res) => {
  try {
    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ 
        error: 'Invalid request body',
        requestId: req.requestId
      });
    }

    // Extract and sanitize code
    let { code, options = {} } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        error: 'No code provided',
        requestId: req.requestId
      });
    }

    // Sanitize input
    const sanitizedCode = securityMiddleware.sanitizeInput(code);
    
    if (!sanitizedCode || sanitizedCode.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or empty code after sanitization',
        requestId: req.requestId
      });
    }

    // Check code size limits
    const codeSize = Buffer.byteLength(sanitizedCode, 'utf8');
    if (codeSize > 5 * 1024 * 1024) { // 5MB limit
      return res.status(413).json({ 
        error: 'Code size exceeds limit (5MB)',
        size: codeSize,
        limit: 5 * 1024 * 1024,
        requestId: req.requestId
      });
    }

    // Validate options
    if (options && typeof options !== 'object') {
      return res.status(400).json({ 
        error: 'Options must be an object',
        requestId: req.requestId
      });
    }

    // Security analysis
    const securityReport = securityAnalyzer.analyzeCode(sanitizedCode, options);
    
    // Generate security profile based on analysis
    const securityProfile = securityAnalyzer.generateSecurityProfile(securityReport, options);
    
    // Merge options with defaults and security recommendations
    const defaultOptions = {
      stringEncryption: true,
      variableRenaming: true,
      controlFlowObfuscation: true,
      deadCodeInjection: true,
      numberEncoding: true,
      functionWrapping: true,
      vmObfuscation: false,
      antiDebug: false,
      antiTampering: false,
      integrityChecks: false,
      environmentDetection: false,
      timingProtection: false,
      constantFolding: true,
      instructionSubstitution: true,
      opcodeRandomization: false,
      stackRandomization: false,
      memoryProtection: false,
      obfuscationLevel: 5,
      securityProfile: 'professional',
      generateReport: false,
      includeWatermark: true,
      optimizeOutput: false,
      preserveLineNumbers: false,
      addChecksum: true,
      mutationLevel: 3
    };

    // Apply security profile recommendations
    const mergedOptions = { 
      ...defaultOptions, 
      ...options,
      ...securityProfile.suggestedOptions 
    };

    // Set obfuscation level based on security score
    if (securityReport.securityScore < 60) {
      mergedOptions.obfuscationLevel = 10;
      mergedOptions.vmObfuscation = true;
      mergedOptions.antiDebug = true;
      mergedOptions.antiTampering = true;
    } else if (securityReport.securityScore < 80) {
      mergedOptions.obfuscationLevel = 8;
      mergedOptions.vmObfuscation = true;
    }

    // Check for cache hit
    const requestHash = securityMiddleware.hashRequest(req);
    const cachedResponse = securityMiddleware.requestCache.get(requestHash);
    
    if (cachedResponse && Date.now() - cachedResponse.timestamp < 30000) { // 30 second cache
      console.log(`[${req.requestId}] Cache hit for request`);
      return res.json({
        ...cachedResponse.response,
        cached: true,
        requestId: req.requestId
      });
    }

    // Run obfuscation
    console.log(`[${req.requestId}] Starting obfuscation (size: ${codeSize} bytes, level: ${mergedOptions.obfuscationLevel})`);
    
    const result = await obfuscator.obfuscate(sanitizedCode, mergedOptions);
    
    if (!result || !result.code) {
      throw new Error('Obfuscation failed to produce output');
    }

    // Generate response
    const response = {
      obfuscatedCode: result.code,
      originalSize: result.originalSize,
      obfuscatedSize: result.obfuscatedSize,
      expansionRatio: result.expansionRatio,
      securityLevel: result.securityLevel,
      checksum: result.checksum,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      optionsUsed: mergedOptions,
      securityAnalysis: mergedOptions.generateReport ? securityReport : undefined,
      warnings: securityReport.threats.length > 0 ? securityReport.threats : undefined,
      recommendations: securityReport.recommendations.length > 0 ? securityReport.recommendations : undefined,
      performance: {
        processingTime: Date.now() - req._startTime,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
      }
    };

    // Cache successful response
    securityMiddleware.cacheResponse(req, {
      timestamp: Date.now(),
      response: {
        obfuscatedCode: result.code,
        originalSize: result.originalSize,
        obfuscatedSize: result.obfuscatedSize,
        expansionRatio: result.expansionRatio,
        securityLevel: result.securityLevel,
        checksum: result.checksum
      }
    });

    // Set response headers
    res.setHeader('X-Obfuscation-Level', result.securityLevel);
    res.setHeader('X-Expansion-Ratio', result.expansionRatio);
    res.setHeader('X-Checksum', result.checksum);
    res.setHeader('X-Request-ID', req.requestId);

    console.log(`[${req.requestId}] Obfuscation successful (expansion: ${result.expansionRatio}, level: ${result.securityLevel})`);
    
    res.json(response);

  } catch (error) {
    console.error(`[${req.requestId || 'unknown'}] Obfuscation error:`, error.stack || error);
    
    // Determine error type and status code
    let statusCode = 500;
    let errorMessage = 'Obfuscation failed';
    let errorDetails = error.message;
    
    if (error.message.includes('memory') || error.message.includes('size')) {
      statusCode = 413;
      errorMessage = 'Resource limit exceeded';
    } else if (error.message.includes('syntax') || error.message.includes('parse')) {
      statusCode = 400;
      errorMessage = 'Invalid LuaU syntax';
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
      errorMessage = 'Processing timeout';
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: errorDetails,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
});

// Batch obfuscation endpoint
router.post('/obfuscate/batch', async (req, res) => {
  try {
    const { files, options = {}, batchId } = req.body;
    
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ 
        error: 'No files provided or invalid format',
        requestId: req.requestId
      });
    }

    if (files.length > 10) {
      return res.status(400).json({ 
        error: 'Batch size limit exceeded (max 10 files)',
        requestId: req.requestId
      });
    }

    const results = [];
    const errors = [];
    const startTime = Date.now();

    // Process files in parallel with limit
    const batchOptions = { 
      ...options,
      obfuscationLevel: options.obfuscationLevel || 5 
    };

    const processPromises = files.map(async (file, index) => {
      try {
        if (!file.code || !file.name) {
          throw new Error(`File ${index + 1}: Missing code or name`);
        }

        const sanitizedCode = securityMiddleware.sanitizeInput(file.code);
        const result = await obfuscator.obfuscate(sanitizedCode, batchOptions);
        
        return {
          name: file.name,
          success: true,
          originalSize: result.originalSize,
          obfuscatedSize: result.obfuscatedSize,
          expansionRatio: result.expansionRatio,
          securityLevel: result.securityLevel,
          checksum: result.checksum
        };
      } catch (error) {
        return {
          name: file.name || `file_${index + 1}`,
          success: false,
          error: error.message
        };
      }
    });

    const processed = await Promise.all(processPromises);
    
    processed.forEach(item => {
      if (item.success) {
        results.push(item);
      } else {
        errors.push(item);
      }
    });

    const response = {
      batchId: batchId || `batch_${Date.now()}`,
      totalFiles: files.length,
      successful: results.length,
      failed: errors.length,
      results: results,
      errors: errors.length > 0 ? errors : undefined,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };

    res.json(response);

  } catch (error) {
    console.error(`[${req.requestId}] Batch obfuscation error:`, error);
    res.status(500).json({ 
      error: 'Batch processing failed',
      details: error.message,
      requestId: req.requestId
    });
  }
});

// Analyze code without obfuscation
router.post('/analyze', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        error: 'No code provided',
        requestId: req.requestId
      });
    }

    const sanitizedCode = securityMiddleware.sanitizeInput(code);
    const analysis = securityAnalyzer.analyzeCode(sanitizedCode);
    const profile = securityAnalyzer.generateSecurityProfile(analysis, {});
    
    res.json({
      analysis: analysis,
      securityProfile: profile,
      recommendations: analysis.recommendations,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    console.error(`[${req.requestId}] Analysis error:`, error);
    res.status(500).json({ 
      error: 'Analysis failed',
      details: error.message,
      requestId: req.requestId
    });
  }
});

// Status endpoint with detailed information
router.get('/status', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  const status = {
    status: 'online',
    engine: 'Celestial Obfuscator',
    version: '1.0.0',
    uptime: {
      seconds: uptime,
      formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
    },
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024)
    },
    requests: {
      total: securityMiddleware.requestCache.size,
      active: securityMiddleware.requestTimestamps.size
    },
    features: obfuscator.getFeatures(),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  };

  // Add cache statistics
  const now = Date.now();
  let cacheHits = 0;
  let cacheSize = 0;
  
  for (const [_, entry] of securityMiddleware.requestCache.entries()) {
    cacheSize += Buffer.byteLength(JSON.stringify(entry.response || ''), 'utf8');
    if (now - entry.timestamp < 30000) {
      cacheHits++;
    }
  }
  
  status.cache = {
    entries: securityMiddleware.requestCache.size,
    hits: cacheHits,
    size: Math.round(cacheSize / 1024)
  };

  res.json(status);
});

// Features endpoint with detailed capabilities
router.get('/features', (req, res) => {
  const features = {
    coreCapabilities: [
      'Custom Virtual Machine Architecture',
      'Multi-Stage Byte Encryption',
      'Entropy-Based Identifier Renaming',
      'Polymorphic Control Flow',
      'Behavior-Based Anti-Debug',
      'Anti-Tampering Protection',
      'Execution Integrity Checks'
    ],
    
    transformationLayers: [
      'AST Parsing & Transformation',
      'String & Constant Encryption',
      'Control Flow Obfuscation',
      'Dead Code Injection',
      'Instruction Substitution',
      'Constant Folding Resistance',
      'Metatable Poisoning'
    ],
    
    protectionMechanisms: [
      'Environment Detection',
      'Timing Drift Protection',
      'Memory Protection',
      'Stack Randomization',
      'Runtime Code Mutation',
      'Opaque Predicate Generation',
      'Checksum Verification'
    ],
    
    apiFeatures: [
      'Single & Batch Processing',
      'Security Analysis',
      'Configurable Obfuscation Levels',
      'Real-time Progress Reporting',
      'Cache Optimization',
      'Input Validation & Sanitization',
      'Comprehensive Error Handling'
    ],
    
    securityProfiles: {
      basic: {
        level: 1,
        description: 'Basic protection for simple scripts',
        features: ['Variable Renaming', 'String Encryption']
      },
      standard: {
        level: 3,
        description: 'Standard protection for production code',
        features: ['Control Flow Obfuscation', 'Dead Code Injection', 'Anti-Debug']
      },
      professional: {
        level: 5,
        description: 'Professional protection for commercial software',
        features: ['VM Obfuscation', 'Anti-Tampering', 'Integrity Checks']
      },
      enterprise: {
        level: 8,
        description: 'Enterprise-grade protection for sensitive code',
        features: ['Timing Protection', 'Environment Detection', 'Memory Protection']
      },
      military: {
        level: 10,
        description: 'Military-grade maximum protection',
        features: ['All Protection Layers', 'Maximum Obfuscation', 'Advanced Anti-Reverse Engineering']
      }
    },
    
    performanceMetrics: {
      maxInputSize: '5MB',
      processingTime: '100ms - 5s (depending on complexity)',
      cacheTtl: '30 seconds',
      batchLimit: '10 files'
    },
    
    compliance: {
      standards: ['Custom Security Protocol', 'No External Dependencies', 'Zero Common Patterns'],
      guarantees: ['No Code Leakage', 'Session Isolation', 'Deterministic Output']
    },
    
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  };

  res.json(features);
});

// Configuration endpoint
router.get('/config', (req, res) => {
  const config = {
    limits: {
      maxCodeSize: 5 * 1024 * 1024, // 5MB
      maxBatchSize: 10,
      requestTimeout: 30000, // 30 seconds
      rateLimit: {
        perMinute: 60,
        perHour: 1000
      }
    },
    
    defaults: {
      obfuscationLevel: 5,
      securityProfile: 'professional',
      stringEncryption: true,
      variableRenaming: true,
      antiDebug: false,
      antiTampering: false
    },
    
    supportedOptions: {
      stringEncryption: 'boolean - Encrypt string literals',
      variableRenaming: 'boolean - Rename variables and functions',
      controlFlowObfuscation: 'boolean - Obfuscate control flow',
      deadCodeInjection: 'boolean - Inject dead code',
      numberEncoding: 'boolean - Encode numeric constants',
      functionWrapping: 'boolean - Wrap functions in protection layers',
      vmObfuscation: 'boolean - Use virtual machine execution',
      antiDebug: 'boolean - Add anti-debugging protection',
      antiTampering: 'boolean - Add anti-tampering protection',
      integrityChecks: 'boolean - Add integrity verification',
      environmentDetection: 'boolean - Detect execution environment',
      timingProtection: 'boolean - Add timing-based protection',
      constantFolding: 'boolean - Prevent constant folding',
      instructionSubstitution: 'boolean - Substitute instructions',
      opcodeRandomization: 'boolean - Randomize VM opcodes',
      stackRandomization: 'boolean - Randomize stack layout',
      memoryProtection: 'boolean - Add memory protection',
      obfuscationLevel: 'number (1-10) - Overall obfuscation intensity',
      securityProfile: 'string - Predefined security profile',
      generateReport: 'boolean - Generate security analysis report',
      includeWatermark: 'boolean - Add identification watermark',
      optimizeOutput: 'boolean - Optimize obfuscated code size',
      preserveLineNumbers: 'boolean - Preserve original line numbers',
      addChecksum: 'boolean - Add integrity checksum',
      mutationLevel: 'number (1-5) - Code mutation intensity'
    },
    
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    },
    
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  };

  res.json(config);
});

// Health check endpoint with detailed diagnostics
router.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    checks: {
      memory: {
        status: process.memoryUsage().heapUsed < 500 * 1024 * 1024 ? 'healthy' : 'warning',
        details: `Heap used: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
      },
      uptime: {
        status: process.uptime() > 60 ? 'healthy' : 'starting',
        details: `Uptime: ${Math.round(process.uptime())}s`
      },
      cache: {
        status: 'healthy',
        details: `Entries: ${securityMiddleware.requestCache.size}`
      },
      requests: {
        status: 'healthy',
        details: `Active: ${securityMiddleware.requestTimestamps.size}`
      }
    },
    
    metrics: {
      loadAverage: process.cpuUsage(),
      timestamp: Date.now(),
      requestCount: req._requestCount || 'N/A'
    },
    
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  };

  // Check if any component is unhealthy
  const unhealthyChecks = Object.values(health.checks).filter(check => check.status !== 'healthy');
  if (unhealthyChecks.length > 0) {
    health.status = 'degraded';
    health.unhealthyComponents = unhealthyChecks.map(c => c.details);
  }

  res.json(health);
});

// Statistics endpoint
router.get('/stats', (req, res) => {
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  const oneDayAgo = now - 86400000;
  
  let hourlyRequests = 0;
  let dailyRequests = 0;
  let totalCacheSize = 0;
  
  for (const [timestamp] of securityMiddleware.requestTimestamps.entries()) {
    if (timestamp > oneHourAgo) hourlyRequests++;
    if (timestamp > oneDayAgo) dailyRequests++;
  }
  
  for (const [_, entry] of securityMiddleware.requestCache.entries()) {
    totalCacheSize += Buffer.byteLength(JSON.stringify(entry.response || ''), 'utf8');
  }
  
  const stats = {
    requests: {
      total: securityMiddleware.requestTimestamps.size,
      hourly: hourlyRequests,
      daily: dailyRequests,
      averageSize: 'N/A' // Could track average request/response sizes
    },
    
    cache: {
      entries: securityMiddleware.requestCache.size,
      size: Math.round(totalCacheSize / 1024) + 'KB',
      hitRate: 'N/A' // Could track cache hit/miss ratios
    },
    
    performance: {
      averageProcessingTime: 'N/A', // Could track this
      maxProcessingTime: 'N/A',
      errorRate: 'N/A'
    },
    
    obfuscation: {
      totalProcessed: 'N/A', // Could track number of successful obfuscations
      averageExpansion: 'N/A',
      mostUsedProfile: 'N/A'
    },
    
    system: {
      uptime: process.uptime(),
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      activeConnections: 'N/A'
    },
    
    timeframe: {
      start: new Date(oneDayAgo).toISOString(),
      end: new Date().toISOString(),
      duration: '24 hours'
    },
    
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  };

  res.json(stats);
});

// Documentation endpoint
router.get('/docs', (req, res) => {
  const docs = {
    api: {
      baseUrl: req.protocol + '://' + req.get('host') + '/api',
      endpoints: [
        {
          method: 'POST',
          path: '/obfuscate',
          description: 'Obfuscate LuaU code',
          requestBody: {
            code: 'string - The LuaU code to obfuscate',
            options: 'object - Obfuscation configuration options'
          },
          response: {
            obfuscatedCode: 'string - The obfuscated code',
            originalSize: 'number - Original code size in bytes',
            obfuscatedSize: 'number - Obfuscated code size in bytes',
            expansionRatio: 'string - Size expansion percentage',
            securityLevel: 'string - Applied security level',
            checksum: 'string - Integrity checksum'
          }
        },
        {
          method: 'POST',
          path: '/obfuscate/batch',
          description: 'Obfuscate multiple files',
          requestBody: {
            files: 'array - Array of {name, code} objects',
            options: 'object - Obfuscation configuration',
            batchId: 'string - Optional batch identifier'
          }
        },
        {
          method: 'POST',
          path: '/analyze',
          description: 'Analyze code security without obfuscation',
          requestBody: {
            code: 'string - Code to analyze'
          }
        },
        {
          method: 'GET',
          path: '/status',
          description: 'Get service status and health'
        },
        {
          method: 'GET',
          path: '/features',
          description: 'List available features and capabilities'
        },
        {
          method: 'GET',
          path: '/config',
          description: 'Get service configuration and limits'
        },
        {
          method: 'GET',
          path: '/health',
          description: 'Detailed health check'
        },
        {
          method: 'GET',
          path: '/stats',
          description: 'Service statistics'
        }
      ]
    },
    
    options: {
      securityProfiles: [
        'basic - Minimal protection',
        'standard - Balanced protection',
        'professional - Enhanced protection',
        'enterprise - Maximum protection',
        'military - Extreme protection'
      ],
      
      commonConfigurations: {
        minimal: {
          stringEncryption: true,
          variableRenaming: true,
          obfuscationLevel: 3
        },
        balanced: {
          stringEncryption: true,
          variableRenaming: true,
          controlFlowObfuscation: true,
          deadCodeInjection: true,
          obfuscationLevel: 5
        },
        maximum: {
          stringEncryption: true,
          variableRenaming: true,
          controlFlowObfuscation: true,
          deadCodeInjection: true,
          vmObfuscation: true,
          antiDebug: true,
          antiTampering: true,
          obfuscationLevel: 10
        }
      }
    },
    
    examples: {
      curl: `curl -X POST ${req.protocol}://${req.get('host')}/api/obfuscate \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "print('Hello World')",
    "options": {
      "obfuscationLevel": 5,
      "securityProfile": "professional"
    }
  }'`,
      
      javascript: `fetch('${req.protocol}://${req.get('host')}/api/obfuscate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: "print('Hello World')",
    options: { obfuscationLevel: 5 }
  })
})
.then(response => response.json())
.then(data => console.log(data.obfuscatedCode));`
    },
    
    bestPractices: [
      'Always analyze code before obfuscation',
      'Start with lower obfuscation levels and increase as needed',
      'Test obfuscated code thoroughly',
      'Use batch processing for multiple files',
      'Monitor expansion ratios for size-critical applications'
    ],
    
    limitations: [
      'Maximum input size: 5MB',
      'Maximum batch size: 10 files',
      'Some LuaU features may have limited support',
      'Obfuscation increases code size significantly'
    ],
    
    support: {
      contact: 'api-support@example.com',
      documentation: 'https://docs.celestial-obfuscator.com',
      issues: 'https://github.com/celestial-obfuscator/issues'
    },
    
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  };

  res.json(docs);
});

// Download endpoint (returns obfuscated code as downloadable file)
router.post('/download', async (req, res) => {
  try {
    const { code, options = {}, filename = 'obfuscated.lua' } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        error: 'No code provided',
        requestId: req.requestId
      });
    }

    const sanitizedCode = securityMiddleware.sanitizeInput(code);
    const mergedOptions = { 
      obfuscationLevel: options.obfuscationLevel || 5,
      securityProfile: options.securityProfile || 'professional',
      ...options 
    };

    const result = await obfuscator.obfuscate(sanitizedCode, mergedOptions);
    
    // Set download headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Obfuscation-Level', result.securityLevel);
    res.setHeader('X-Expansion-Ratio', result.expansionRatio);
    res.setHeader('X-Checksum', result.checksum);
    res.setHeader('X-Request-ID', req.requestId);
    
    // Send the file
    res.send(result.code);

  } catch (error) {
    console.error(`[${req.requestId}] Download error:`, error);
    res.status(500).json({ 
      error: 'Download failed',
      details: error.message,
      requestId: req.requestId
    });
  }
});

// Preview endpoint (returns partial obfuscation for preview)
router.post('/preview', async (req, res) => {
  try {
    const { code, lines = 10 } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        error: 'No code provided',
        requestId: req.requestId
      });
    }

    const sanitizedCode = securityMiddleware.sanitizeInput(code);
    
    // Use minimal options for preview
    const previewOptions = {
      stringEncryption: true,
      variableRenaming: true,
      controlFlowObfuscation: false,
      deadCodeInjection: false,
      vmObfuscation: false,
      obfuscationLevel: 2
    };

    const result = await obfuscator.obfuscate(sanitizedCode, previewOptions);
    
    // Get first N lines
    const linesArray = result.code.split('\n');
    const preview = linesArray.slice(0, parseInt(lines)).join('\n');
    
    res.json({
      preview: preview,
      totalLines: linesArray.length,
      previewLines: parseInt(lines),
      securityLevel: result.securityLevel,
      estimatedExpansion: result.expansionRatio,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      note: 'This is a preview with minimal obfuscation. Full obfuscation may produce different results.'
    });

  } catch (error) {
    console.error(`[${req.requestId}] Preview error:`, error);
    res.status(500).json({ 
      error: 'Preview generation failed',
      details: error.message,
      requestId: req.requestId
    });
  }
});

// 404 handler for undefined routes
router.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'POST /api/obfuscate',
      'POST /api/obfuscate/batch',
      'POST /api/analyze',
      'POST /api/download',
      'POST /api/preview',
      'GET /api/status',
      'GET /api/features',
      'GET /api/config',
      'GET /api/health',
      'GET /api/stats',
      'GET /api/docs'
    ],
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
router.use((err, req, res, next) => {
  console.error(`[${req.requestId || 'unknown'}] Global error:`, err.stack || err);
  
  const errorResponse = {
    error: 'Internal server error',
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  };
  
  // Only include details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = err.message;
    errorResponse.stack = err.stack;
  }
  
  res.status(500).json(errorResponse);
});

export default router;