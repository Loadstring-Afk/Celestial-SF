export class ByteManipulator {
  constructor(entropy) {
    this.entropy = entropy;
  }

  stringToBytes(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }

  bytesToString(bytes) {
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  }

  xorBytes(data, key) {
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ key[i % key.length];
    }
    return result;
  }

  rotateBytes(data, amount) {
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const newPos = (i + amount) % data.length;
      result[newPos] = data[i];
    }
    return result;
  }

  shuffleBytes(data, seed) {
    const result = new Uint8Array(data.length);
    const indices = Array.from({ length: data.length }, (_, i) => i);
    
    // Fisher-Yates shuffle with seed
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(this.entropy.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    for (let i = 0; i < data.length; i++) {
      result[i] = data[indices[i]];
    }
    
    return result;
  }

  interleaveBytes(data1, data2) {
    const totalLength = data1.length + data2.length;
    const result = new Uint8Array(totalLength);
    
    let i = 0, j = 0, k = 0;
    while (i < data1.length || j < data2.length) {
      if (i < data1.length) {
        result[k++] = data1[i++];
      }
      if (j < data2.length) {
        result[k++] = data2[j++];
      }
    }
    
    return result;
  }

  splitBytes(data, chunkSize) {
    const chunks = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }

  mergeChunks(chunks) {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }

  generateMask(data) {
    const mask = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      mask[i] = this.entropy.randomInt(0, 255);
    }
    return mask;
  }

  applyMask(data, mask) {
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ mask[i];
    }
    return result;
  }

  diffuseBytes(data, rounds = 3) {
    let result = new Uint8Array(data);
    
    for (let round = 0; round < rounds; round++) {
      const temp = new Uint8Array(result.length);
      
      for (let i = 0; i < result.length; i++) {
        const prev = i > 0 ? result[i - 1] : result[result.length - 1];
        const next = i < result.length - 1 ? result[i + 1] : result[0];
        const current = result[i];
        
        // Non-linear diffusion
        temp[i] = (current + prev + next + round) % 256;
        temp[i] = (temp[i] * 181) % 256; // Multiply by prime
        temp[i] ^= (temp[i] >> 4) | (temp[i] << 4);
      }
      
      result = temp;
    }
    
    return result;
  }

  compressBytes(data) {
    // Simple run-length encoding for demonstration
    const compressed = [];
    let count = 1;
    let current = data[0];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i] === current && count < 255) {
        count++;
      } else {
        compressed.push(count, current);
        current = data[i];
        count = 1;
      }
    }
    
    compressed.push(count, current);
    return new Uint8Array(compressed);
  }

  decompressBytes(data) {
    const decompressed = [];
    
    for (let i = 0; i < data.length; i += 2) {
      const count = data[i];
      const value = data[i + 1];
      
      for (let j = 0; j < count; j++) {
        decompressed.push(value);
      }
    }
    
    return new Uint8Array(decompressed);
  }

  calculateChecksum(data) {
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum = (checksum + data[i] * (i + 1)) % 0xFFFFFFFF;
      checksum = (checksum << 1) | (checksum >>> 31); // Rotate left
    }
    return checksum;
  }

  verifyChecksum(data, expected) {
    const actual = this.calculateChecksum(data);
    return actual === expected;
  }

  embedWatermark(data, watermark) {
    const watermarked = new Uint8Array(data.length + watermark.length + 4);
    
    // Embed watermark length (4 bytes)
    const lengthBytes = new Uint8Array(4);
    new DataView(lengthBytes.buffer).setUint32(0, watermark.length, true);
    
    // Copy data
    watermarked.set(data, 0);
    
    // Embed length
    watermarked.set(lengthBytes, data.length);
    
    // Embed watermark
    watermarked.set(watermark, data.length + 4);
    
    return watermarked;
  }

  extractWatermark(data) {
    if (data.length < 4) return null;
    
    // Extract length
    const lengthBytes = data.slice(data.length - 4);
    const length = new DataView(lengthBytes.buffer).getUint32(0, true);
    
    if (data.length < 4 + length) return null;
    
    // Extract watermark
    const watermarkStart = data.length - 4 - length;
    const watermark = data.slice(watermarkStart, watermarkStart + length);
    
    // Remove watermark from data
    const cleanData = data.slice(0, watermarkStart);
    
    return {
      watermark: watermark,
      data: cleanData
    };
  }

  generateFingerprint(data) {
    // Generate a fingerprint using multiple hash-like operations
    const fingerprints = [];
    
    // Simple XOR folding
    let xorFold = 0;
    for (let i = 0; i < data.length; i++) {
      xorFold ^= data[i];
    }
    fingerprints.push(xorFold);
    
    // Sum with weights
    let weightedSum = 0;
    for (let i = 0; i < data.length; i++) {
      weightedSum += data[i] * (i + 1);
    }
    fingerprints.push(weightedSum % 0xFFFF);
    
    // Prime-based hash
    let primeHash = 0;
    const prime = 31;
    for (let i = 0; i < data.length; i++) {
      primeHash = (primeHash * prime + data[i]) % 0xFFFFFFFF;
    }
    fingerprints.push(primeHash);
    
    return fingerprints;
  }

  compareFingerprints(fp1, fp2, threshold = 2) {
    if (fp1.length !== fp2.length) return false;
    
    let differences = 0;
    for (let i = 0; i < fp1.length; i++) {
      if (fp1[i] !== fp2[i]) {
        differences++;
        if (differences > threshold) {
          return false;
        }
      }
    }
    
    return true;
  }
}