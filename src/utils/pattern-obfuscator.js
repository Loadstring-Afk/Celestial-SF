export class PatternObfuscator {
  constructor(entropy) {
    this.entropy = entropy;
    this.patterns = new Map();
    this.initPatterns();
  }

  initPatterns() {
    // Anti-pattern detection
    this.patterns.set('sequentialNumbers', /(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g);
    this.patterns.set('hexPattern', /0x[a-f0-9]+/gi);
    this.patterns.set('simpleArray', /\{[^{}]*\}/g);
    this.patterns.set('predictableLoop', /for\s+i\s*=\s*\d+\s*,\s*\d+/g);
    this.patterns.set('commonVariable', /local\s+(x|y|z|i|j|k|v|t)/g);
  }

  obfuscatePatterns(code) {
    let obfuscated = code;
    
    // Break sequential patterns
    obfuscated = this.breakSequences(obfuscated);
    
    // Obfuscate hex patterns
    obfuscated = this.obfuscateHex(obfuscated);
    
    // Transform simple arrays
    obfuscated = this.transformArrays(obfuscated);
    
    // Obfuscate loops
    obfuscated = this.obfuscateLoops(obfuscated);
    
    // Rename common variables
    obfuscated = this.renameCommonVars(obfuscated);
    
    // Inject noise
    obfuscated = this.injectNoise(obfuscated);
    
    return obfuscated;
  }

  breakSequences(code) {
    return code.replace(this.patterns.get('sequentialNumbers'), (match) => {
      const numbers = match.split(',').map(n => parseInt(n.trim()));
      
      // Insert random numbers or rearrange
      if (this.entropy.random() > 0.5) {
        const randomIndex = this.entropy.randomInt(0, numbers.length);
        numbers.splice(randomIndex, 0, this.entropy.randomInt(1, 100));
      }
      
      // Shuffle
      if (this.entropy.random() > 0.7) {
        for (let i = numbers.length - 1; i > 0; i--) {
          const j = Math.floor(this.entropy.random() * (i + 1));
          [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }
      }
      
      return numbers.join(', ');
    });
  }

  obfuscateHex(code) {
    return code.replace(this.patterns.get('hexPattern'), (match) => {
      const value = parseInt(match, 16);
      
      // Convert to different representations
      const representations = [
        `0x${value.toString(16)}`,  // Keep as hex
        value.toString(),           // Decimal
        `bit32.bor(${value >> 8}, ${value & 0xFF})`,  // Bitwise
        `(${value * 1})`,           // Arithmetic
        `tonumber("${value}")`      // String conversion
      ];
      
      return this.entropy.randomChoice(representations);
    });
  }

  transformArrays(code) {
    return code.replace(this.patterns.get('simpleArray'), (match) => {
      const items = match.slice(1, -1).split(',').map(item => item.trim());
      
      if (items.length === 0) return match;
      
      const transformations = [
        // Convert to table.insert calls
        () => {
          const tableName = this.entropy.generateIdentifier();
          let result = `local ${tableName} = {}\n`;
          items.forEach(item => {
            result += `table.insert(${tableName}, ${item})\n`;
          });
          return tableName;
        },
        
        // Generate with loop
        () => {
          const tableName = this.entropy.generateIdentifier();
          let result = `local ${tableName} = {}\n`;
          result += `for i = 1, ${items.length} do\n`;
          result += `  ${tableName}[i] = ${items[0]}\n`; // Simplified
          result += `end`;
          return tableName;
        },
        
        // Use metatable
        () => {
          const tableName = this.entropy.generateIdentifier();
          const metaName = this.entropy.generateIdentifier();
          
          let result = `local ${tableName} = setmetatable({}, {\n`;
          result += `  __index = function(t, k)\n`;
          result += `    local idx = tonumber(k)\n`;
          result += `    if idx and idx >= 1 and idx <= ${items.length} then\n`;
          result += `      return ${items[Math.floor(items.length / 2)]}\n`;
          result += `    end\n`;
          result += `  end\n`;
          result += `})`;
          return result;
        }
      ];
      
      const selected = this.entropy.randomChoice(transformations);
      return selected();
    });
  }

  obfuscateLoops(code) {
    return code.replace(this.patterns.get('predictableLoop'), (match) => {
      const transformations = [
        // Convert to while loop
        `local ${this.entropy.generateIdentifier()} = 1\nwhile ${this.entropy.generateIdentifier()} <= 10 do`,
        
        // Use recursion
        `local function ${this.entropy.generateIdentifier()}(n)\n  if n <= 10 then`,
        
        // Use coroutine
        `local ${this.entropy.generateIdentifier()} = coroutine.create(function()\n  for n = 1, 10 do`,
        
        // Use goto (Lua 5.2+)
        `local ${this.entropy.generateIdentifier()} = 1\n::loop::\nif ${this.entropy.generateIdentifier()} <= 10 then`
      ];
      
      return this.entropy.randomChoice(transformations);
    });
  }

  renameCommonVars(code) {
    return code.replace(this.patterns.get('commonVariable'), (match, varName) => {
      const newName = this.entropy.generateIdentifier();
      return match.replace(varName, newName);
    });
  }

  injectNoise(code) {
    const lines = code.split('\n');
    const noisyLines = [];
    
    const noiseGenerators = [
      () => `local ${this.entropy.generateIdentifier()} = math.random() * ${this.entropy.randomInt(1, 100)}`,
      () => `if false then ${this.entropy.generateIdentifier()} = "${this.generateRandomString()}" end`,
      () => `for ${this.entropy.generateIdentifier()} = 1, ${this.entropy.randomInt(1, 5)} do break end`,
      () => `local ${this.entropy.generateIdentifier()} = {${Array.from({length: 3}, () => this.entropy.randomInt(1, 100)).join(', ')}}`,
      () => `${this.entropy.generateIdentifier()} = ${this.entropy.generateIdentifier()} or {}`
    ];
    
    lines.forEach((line, index) => {
      noisyLines.push(line);
      
      // Randomly inject noise after lines
      if (this.entropy.random() > 0.8 && line.trim() && !line.trim().startsWith('--')) {
        const noise = this.entropy.randomChoice(noiseGenerators)();
        noisyLines.push(noise);
      }
      
      // Randomly inject comments
      if (this.entropy.random() > 0.9) {
        const comments = [
          '-- memory check',
          '-- stack integrity',
          '-- timing validation',
          '-- environment stable',
          '-- no hooks detected'
        ];
        noisyLines.push(this.entropy.randomChoice(comments));
      }
    });
    
    return noisyLines.join('\n');
  }

  generateRandomString() {
    const chars = 'αβγδεζηθικλμνξοπρστυφχψω∀∃∈∉∏∑√∛∜∞';
    const length = this.entropy.randomInt(5, 15);
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars[this.entropy.randomInt(0, chars.length - 1)];
    }
    
    return result;
  }

  detectPatterns(code) {
    const detected = [];
    
    for (const [name, pattern] of this.patterns.entries()) {
      const matches = code.match(pattern);
      if (matches && matches.length > 0) {
        detected.push({
          pattern: name,
          count: matches.length,
          examples: matches.slice(0, 3)
        });
      }
    }
    
    return detected;
  }

  generateObfuscationPlan(detectedPatterns) {
    const plan = {
      priority: [],
      techniques: [],
      estimatedComplexity: 0
    };
    
    detectedPatterns.forEach(pattern => {
      switch (pattern.pattern) {
        case 'sequentialNumbers':
          plan.priority.push('HIGH');
          plan.techniques.push('sequenceBreaking');
          plan.estimatedComplexity += 2;
          break;
          
        case 'hexPattern':
          plan.priority.push('MEDIUM');
          plan.techniques.push('hexObfuscation');
          plan.estimatedComplexity += 1;
          break;
          
        case 'simpleArray':
          plan.priority.push('LOW');
          plan.techniques.push('arrayTransformation');
          plan.estimatedComplexity += 3;
          break;
          
        case 'predictableLoop':
          plan.priority.push('HIGH');
          plan.techniques.push('loopObfuscation');
          plan.estimatedComplexity += 3;
          break;
          
        case 'commonVariable':
          plan.priority.push('MEDIUM');
          plan.techniques.push('variableRenaming');
          plan.estimatedComplexity += 1;
          break;
      }
    });
    
    plan.estimatedComplexity = Math.min(10, plan.estimatedComplexity);
    
    return plan;
  }
}