import { createHash } from 'crypto';

export class SecurityAnalyzer {
  constructor() {
    this.threatLevels = {
      LOW: 0,
      MEDIUM: 1,
      HIGH: 2,
      CRITICAL: 3
    };
    
    this.patterns = {
      dangerousFunctions: new Set([
        'loadstring', 'dofile', 'loadfile', 'getfenv', 'setfenv',
        'debug', 'os.execute', 'io.popen', 'package.loadlib'
      ]),
      suspiciousPatterns: [
        /\\x[0-9a-f]{2}/gi,
        /\\u[0-9a-f]{4}/gi,
        /\\[0-7]{1,3}/g,
        /eval\s*\(/gi,
        /exec\s*\(/gi,
        /system\s*\(/gi
      ],
      obfuscationMarkers: [
        /_0x[a-f0-9]+/gi,
        /_[a-z][a-z0-9]*_/gi,
        /\[["']\w+["']\]/g,
        /bit32\./g,
        /string\.char\(/g
      ]
    };
  }

  analyzeCode(code, options = {}) {
    const report = {
      threats: [],
      vulnerabilities: [],
      recommendations: [],
      securityScore: 100,
      entropy: 0,
      complexity: 0
    };
    
    // Check for dangerous functions
    const dangerousFuncs = this.detectDangerousFunctions(code);
    if (dangerousFuncs.length > 0) {
      report.threats.push({
        level: this.threatLevels.HIGH,
        message: `Dangerous functions detected: ${dangerousFuncs.join(', ')}`,
        details: dangerousFuncs
      });
      report.securityScore -= 30;
    }
    
    // Check for suspicious patterns
    const suspicious = this.detectSuspiciousPatterns(code);
    if (suspicious.length > 0) {
      report.threats.push({
        level: this.threatLevels.MEDIUM,
        message: 'Suspicious patterns detected',
        details: suspicious
      });
      report.securityScore -= 20;
    }
    
    // Calculate code entropy
    report.entropy = this.calculateEntropy(code);
    if (report.entropy < 3.5) {
      report.vulnerabilities.push({
        level: this.threatLevels.LOW,
        message: 'Low code entropy - may be predictable',
        recommendation: 'Enable entropy-based transformations'
      });
    }
    
    // Check for existing obfuscation
    const obfuscationMarkers = this.detectObfuscation(code);
    if (obfuscationMarkers.length > 0) {
      report.recommendations.push({
        priority: 'HIGH',
        message: 'Code appears to be already obfuscated',
        action: 'Consider additional protection layers'
      });
    }
    
    // Analyze structure
    const structure = this.analyzeStructure(code);
    report.complexity = structure.complexity;
    
    if (structure.functionCount === 0) {
      report.vulnerabilities.push({
        level: this.threatLevels.MEDIUM,
        message: 'No functions detected - code is linear',
        recommendation: 'Enable function wrapping and control flow obfuscation'
      });
    }
    
    // Generate recommendations based on analysis
    this.generateRecommendations(report, options);
    
    // Final security score adjustment
    report.securityScore = Math.max(0, Math.min(100, report.securityScore));
    
    return report;
  }

  detectDangerousFunctions(code) {
    const detected = [];
    
    this.patterns.dangerousFunctions.forEach(func => {
      const regex = new RegExp(`\\b${func}\\b`, 'gi');
      if (regex.test(code)) {
        detected.push(func);
      }
    });
    
    return detected;
  }

  detectSuspiciousPatterns(code) {
    const detected = [];
    
    this.patterns.suspiciousPatterns.forEach((pattern, index) => {
      const matches = code.match(pattern);
      if (matches && matches.length > 0) {
        detected.push({
          pattern: pattern.toString(),
          count: matches.length,
          examples: matches.slice(0, 3)
        });
      }
    });
    
    return detected;
  }

  calculateEntropy(str) {
    if (!str) return 0;
    
    const freq = {};
    let total = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      freq[char] = (freq[char] || 0) + 1;
      total++;
    }
    
    let entropy = 0;
    for (const char in freq) {
      const probability = freq[char] / total;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy;
  }

  detectObfuscation(code) {
    const markers = [];
    
    this.patterns.obfuscationMarkers.forEach((pattern, index) => {
      const matches = code.match(pattern);
      if (matches && matches.length > 0) {
        markers.push({
          type: `Marker${index + 1}`,
          count: matches.length
        });
      }
    });
    
    return markers;
  }

  analyzeStructure(code) {
    const lines = code.split('\n');
    let functionCount = 0;
    let loopCount = 0;
    let conditionalCount = 0;
    let variableCount = 0;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('function') || trimmed.includes('= function')) {
        functionCount++;
      } else if (trimmed.startsWith('for') || trimmed.startsWith('while')) {
        loopCount++;
      } else if (trimmed.startsWith('if')) {
        conditionalCount++;
      } else if (trimmed.startsWith('local')) {
        variableCount++;
      }
    });
    
    const complexity = (functionCount * 2) + loopCount + conditionalCount;
    
    return {
      lineCount: lines.length,
      functionCount,
      loopCount,
      conditionalCount,
      variableCount,
      complexity,
      avgLineLength: code.length / lines.length
    };
  }

  generateRecommendations(report, options) {
    const recommendations = [];
    
    // Based on threats
    if (report.threats.some(t => t.level >= this.threatLevels.HIGH)) {
      recommendations.push({
        priority: 'CRITICAL',
        message: 'High-risk code detected',
        action: 'Enable maximum security with anti-tampering and integrity checks'
      });
    }
    
    // Based on structure
    if (report.complexity < 5) {
      recommendations.push({
        priority: 'MEDIUM',
        message: 'Simple code structure',
        action: 'Enable control flow obfuscation and dead code injection'
      });
    }
    
    // Based on entropy
    if (report.entropy < 4) {
      recommendations.push({
        priority: 'HIGH',
        message: 'Predictable code patterns',
        action: 'Enable entropy-based renaming and string encryption'
      });
    }
    
    // Default security recommendations
    if (!options.vmObfuscation) {
      recommendations.push({
        priority: 'HIGH',
        message: 'Virtual machine protection not enabled',
        action: 'Enable VM obfuscation for advanced protection'
      });
    }
    
    if (!options.antiDebug) {
      recommendations.push({
        priority: 'MEDIUM',
        message: 'Anti-debug protection not enabled',
        action: 'Enable anti-debug and environment detection'
      });
    }
    
    report.recommendations = [...report.recommendations, ...recommendations];
  }

  generateSecurityProfile(analysis, options) {
    const profile = {
      level: 'Custom',
      suggestedOptions: { ...options },
      rationale: []
    };
    
    if (analysis.securityScore < 60) {
      profile.level = 'Military';
      profile.suggestedOptions.obfuscationLevel = 10;
      profile.suggestedOptions.vmObfuscation = true;
      profile.suggestedOptions.antiDebug = true;
      profile.suggestedOptions.antiTampering = true;
      profile.suggestedOptions.integrityChecks = true;
      profile.rationale.push('Low security score requires maximum protection');
    } else if (analysis.securityScore < 80) {
      profile.level = 'Enterprise';
      profile.suggestedOptions.obfuscationLevel = 8;
      profile.suggestedOptions.vmObfuscation = true;
      profile.suggestedOptions.antiDebug = true;
      profile.rationale.push('Moderate security risk detected');
    } else {
      profile.level = 'Professional';
      profile.suggestedOptions.obfuscationLevel = 6;
      profile.rationale.push('Code appears relatively secure');
    }
    
    // Adjust based on specific threats
    if (analysis.threats.length > 0) {
      profile.suggestedOptions.antiTampering = true;
      profile.rationale.push('Threats detected - enabling anti-tampering');
    }
    
    if (analysis.entropy < 4) {
      profile.suggestedOptions.stringEncryption = true;
      profile.suggestedOptions.variableRenaming = true;
      profile.rationale.push('Low entropy - enabling encryption and renaming');
    }
    
    return profile;
  }
}