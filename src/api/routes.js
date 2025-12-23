import express from 'express';
import { Obfuscator } from '../core/obfuscator.js';

const router = express.Router();
const obfuscator = new Obfuscator();

router.post('/obfuscate', async (req, res) => {
  try {
    const { code, options = {} } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'No code provided' });
    }

    const defaultOptions = {
      stringEncryption: true,
      variableRenaming: true,
      controlFlowObfuscation: true,
      deadCodeInjection: true,
      numberEncoding: true,
      functionWrapping: true,
      vmObfuscation: true,
      antiDebug: true,
      antiTampering: true,
      integrityChecks: true,
      environmentDetection: true,
      timingProtection: true,
      constantFolding: true,
      instructionSubstitution: true,
      opcodeRandomization: true,
      stackRandomization: true,
      memoryProtection: true,
      obfuscationLevel: 5,
      securityProfile: 'military'
    };

    const mergedOptions = { ...defaultOptions, ...options };
    
    const result = await obfuscator.obfuscate(code, mergedOptions);
    
    res.json({
      obfuscatedCode: result.code,
      originalSize: result.originalSize,
      obfuscatedSize: result.obfuscatedSize,
      expansionRatio: result.expansionRatio,
      securityLevel: result.securityLevel,
      checksum: result.checksum,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Obfuscation error:', error);
    res.status(500).json({ error: 'Obfuscation failed', details: error.message });
  }
});

router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    engine: 'Celestial Obfuscator',
    version: '1.0.0',
    uptime: process.uptime(),
    features: obfuscator.getFeatures()
  });
});

router.get('/features', (req, res) => {
  res.json({
    features: [
      'Custom Virtual Machine Architecture',
      'Multi-Stage Byte Encryption',
      'Entropy-Based Identifier Renaming',
      'Polymorphic Control Flow',
      'Behavior-Based Anti-Debug',
      'Anti-Tampering Protection',
      'Execution Integrity Checks',
      'Environment Detection',
      'Timing Drift Protection',
      'Memory Protection',
      'Stack Randomization',
      'Dead Code Injection',
      'Constant Folding Resistance',
      'Instruction Substitution',
      'Opaque Predicate Generation',
      'Metatable Poisoning',
      'Runtime Code Mutation'
    ],
    securityProfiles: ['basic', 'standard', 'professional', 'enterprise', 'military']
  });
});

export default router;