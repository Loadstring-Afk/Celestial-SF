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
          result += `      return ${items[Math.floor