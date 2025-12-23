export class ByteEncryptor {
  constructor(entropy) {
    this.entropy = entropy;
    this.transformId = this.entropy.generateSeed();
  }

  encryptStrings(node) {
    if (node.type === 'string') {
      const encrypted = this.multiStageEncrypt(node.value);
      node.value = this.generateDecryptor(encrypted);
    }
    
    if (node.children) {
      node.children.forEach(child => this.encryptStrings(child));
    }
  }

  multiStageEncrypt(str) {
    // Stage 1: Non-linear byte transformation
    const bytes = new TextEncoder().encode(str);
    const transformed1 = this.applyNonLinearTransform(bytes);
    
    // Stage 2: Index-dependent arithmetic
    const transformed2 = this.applyIndexTransform(transformed1);
    
    // Stage 3: Table-based remapping
    const transformed3 = this.applyTableRemap(transformed2);
    
    return Array.from(transformed3);
  }

  applyNonLinearTransform(bytes) {
    const result = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      // Non-linear polynomial
      let b = bytes[i];
      b = ((b * 7) ^ (b >> 4)) & 0xFF;
      b = ((b * 13) ^ (b << 3)) & 0xFF;
      b = ((b * 31) ^ (b >> 5)) & 0xFF;
      result[i] = b;
    }
    return result;
  }

  applyIndexTransform(bytes) {
    const result = new Uint8Array(bytes.length);
    const key = this.entropy.randomInt(1, 255);
    
    for (let i = 0; i < bytes.length; i++) {
      const indexFactor = (i * 17) % 256;
      const byte = bytes[i];
      result[i] = (byte ^ key ^ indexFactor) & 0xFF;
    }
    
    return result;
  }

  applyTableRemap(bytes) {
    // Generate random remapping table
    const table = new Array(256);
    for (let i = 0; i < 256; i++) table[i] = i;
    
    // Fisher-Yates shuffle with entropy seed
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(this.entropy.random() * (i + 1));
      [table[i], table[j]] = [table[j], table[i]];
    }
    
    const result = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      result[i] = table[bytes[i]];
    }
    
    return result;
  }

  generateDecryptor(encryptedBytes) {
    const decryptorName = this.entropy.generateIdentifier();
    const tableName = this.entropy.generateIdentifier();
    const resultName = this.entropy.generateIdentifier();
    
    // Generate inverse table
    const table = new Array(256).fill(0);
    const inverseTable = new Array(256);
    for (let i = 0; i < 256; i++) inverseTable[table[i]] = i;
    
    return `
local ${decryptorName} = function(...)
  local ${tableName} = {${inverseTable.join(',')}}
  local ${resultName} = ""
  local args = {...}
  for i = 1, #args do
    local b = args[i]
    b = ${tableName}[b + 1] or 0
    b = (b ~ ${this.entropy.randomInt(1, 255)}) + (i * 17) % 256
    b = ((b * ${this.findInverse(31)}) ~ (b << 5)) & 0xFF
    b = ((b * ${this.findInverse(13)}) ~ (b >> 3)) & 0xFF
    b = ((b * ${this.findInverse(7)}) ~ (b << 4)) & 0xFF
    ${resultName} = ${resultName} .. string.char(b)
  end
  return ${resultName}
end

${decryptorName}(${encryptedBytes.join(',')})
`.trim();
  }

  findInverse(mult) {
    // Find modular inverse for decryption
    for (let i = 1; i < 256; i++) {
      if ((mult * i) % 256 === 1) return i;
    }
    return 1;
  }
}