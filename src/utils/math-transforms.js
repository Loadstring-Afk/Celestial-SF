export class MathTransforms {
  constructor(entropy) {
    this.entropy = entropy;
    this.primes = this.generatePrimes(1000);
    this.weylSequence = this.generateWeylSequence();
  }

  generatePrimes(limit) {
    const sieve = new Array(limit + 1).fill(true);
    sieve[0] = sieve[1] = false;
    
    for (let i = 2; i * i <= limit; i++) {
      if (sieve[i]) {
        for (let j = i * i; j <= limit; j += i) {
          sieve[j] = false;
        }
      }
    }
    
    const primes = [];
    for (let i = 2; i <= limit; i++) {
      if (sieve[i]) primes.push(i);
    }
    
    return primes;
  }

  generateWeylSequence() {
    const phi = (Math.sqrt(5) - 1) / 2;
    let x = this.entropy.random();
    
    return {
      next: () => {
        x = (x + phi) % 1;
        return x;
      }
    };
  }

  nonLinearTransform(value, seed = 0) {
    // Chaotic map transformation
    const r = 3.9 + (seed % 0.1);
    let x = value / 256;
    
    for (let i = 0; i < 10; i++) {
      x = r * x * (1 - x);
    }
    
    return Math.floor(x * 256) % 256;
  }

  modularInverse(a, m = 256) {
    // Extended Euclidean algorithm
    let [old_r, r] = [a, m];
    let [old_s, s] = [1, 0];
    let [old_t, t] = [0, 1];
    
    while (r !== 0) {
      const quotient = Math.floor(old_r / r);
      [old_r, r] = [r, old_r - quotient * r];
      [old_s, s] = [s, old_s - quotient * s];
      [old_t, t] = [t, old_t - quotient * t];
    }
    
    return old_s < 0 ? old_s + m : old_s;
  }

  generatePermutation(size) {
    const arr = Array.from({ length: size }, (_, i) => i);
    
    // Fisher-Yates shuffle with Weyl sequence
    for (let i = size - 1; i > 0; i--) {
      const j = Math.floor(this.weylSequence.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    
    return arr;
  }

  generateInversePermutation(perm) {
    const inverse = new Array(perm.length);
    for (let i = 0; i < perm.length; i++) {
      inverse[perm[i]] = i;
    }
    return inverse;
  }

  chaoticMapIterate(x, r, iterations = 10) {
    for (let i = 0; i < iterations; i++) {
      x = r * x * (1 - x);
    }
    return x;
  }

  generateSBox(size = 256) {
    const sbox = new Array(size);
    const permutation = this.generatePermutation(size);
    
    // Apply affine transformation
    for (let i = 0; i < size; i++) {
      let val = permutation[i];
      
      // Multiplicative inverse in GF(2^8)
      if (val === 0) {
        val = 0;
      } else {
        val = this.modularInverse(val, 256);
      }
      
      // Affine transformation
      let transformed = val;
      for (let j = 0; j < 4; j++) {
        transformed ^= (val << 1) | (val >> 7);
        val = transformed;
      }
      
      sbox[i] = transformed ^ 0x63;
    }
    
    return sbox;
  }

  generateInverseSBox(sbox) {
    const inverse = new Array(sbox.length);
    for (let i = 0; i < sbox.length; i++) {
      inverse[sbox[i]] = i;
    }
    return inverse;
  }

  polynomialTransform(value, coefficients) {
    let result = 0;
    for (let i = 0; i < coefficients.length; i++) {
      result += coefficients[i] * Math.pow(value, i);
    }
    return result % 256;
  }

  generateCoefficients(degree) {
    const coeffs = [];
    for (let i = 0; i <= degree; i++) {
      coeffs.push(this.entropy.randomInt(1, 255));
    }
    return coeffs;
  }

  customModulus(value, modulus) {
    // Non-standard modulus operation
    const quotient = Math.floor(value / modulus);
    const remainder = value - quotient * modulus;
    
    // Apply chaotic adjustment
    const adjustment = Math.floor(this.chaoticMapIterate(remainder / modulus, 3.9) * 10);
    return (remainder + adjustment) % modulus;
  }

  bitwiseTransform(value, rounds = 3) {
    let result = value;
    
    for (let i = 0; i < rounds; i++) {
      // Non-linear bit operations
      const shift = (i * 7) % 8;
      const mask = this.entropy.randomInt(1, 255);
      
      result = ((result << shift) | (result >> (8 - shift))) & 0xFF;
      result = result ^ mask;
      result = ((result & 0x0F) << 4) | ((result & 0xF0) >> 4);
      result = (result + 0x99) & 0xFF;
    }
    
    return result;
  }

  fibonacciScramble(value, n = 10) {
    // Use Fibonacci sequence for scrambling
    let a = 1, b = 1;
    let result = value;
    
    for (let i = 0; i < n; i++) {
      const fib = (a + b) % 256;
      result = (result ^ fib) & 0xFF;
      a = b;
      b = fib;
    }
    
    return result;
  }

  generateTransformChain(length = 5) {
    const transforms = [
      'nonLinear',
      'bitwise',
      'polynomial',
      'fibonacci',
      'chaotic'
    ];
    
    // Randomly select transforms
    const selected = [];
    for (let i = 0; i < length; i++) {
      const transform = transforms[this.entropy.randomInt(0, transforms.length - 1)];
      selected.push({
        type: transform,
        params: this.generateTransformParams(transform)
      });
    }
    
    return selected;
  }

  generateTransformParams(transformType) {
    switch (transformType) {
      case 'nonLinear':
        return { seed: this.entropy.randomInt(0, 1000) };
      case 'bitwise':
        return { rounds: this.entropy.randomInt(2, 5) };
      case 'polynomial':
        return { 
          coefficients: this.generateCoefficients(this.entropy.randomInt(2, 5))
        };
      case 'fibonacci':
        return { n: this.entropy.randomInt(5, 20) };
      case 'chaotic':
        return { 
          r: 3.7 + this.entropy.random() * 0.2,
          iterations: this.entropy.randomInt(5, 15)
        };
      default:
        return {};
    }
  }

  applyTransformChain(value, chain) {
    let result = value;
    
    for (const transform of chain) {
      switch (transform.type) {
        case 'nonLinear':
          result = this.nonLinearTransform(result, transform.params.seed);
          break;
        case 'bitwise':
          result = this.bitwiseTransform(result, transform.params.rounds);
          break;
        case 'polynomial':
          result = this.polynomialTransform(result, transform.params.coefficients);
          break;
        case 'fibonacci':
          result = this.fibonacciScramble(result, transform.params.n);
          break;
        case 'chaotic':
          const normalized = result / 256;
          const chaotic = this.chaoticMapIterate(
            normalized, 
            transform.params.r, 
            transform.params.iterations
          );
          result = Math.floor(chaotic * 256) % 256;
          break;
      }
    }
    
    return result;
  }

  generateInverseChain(chain) {
    // Generate inverse transformations
    const inverseChain = [];
    
    for (let i = chain.length - 1; i >= 0; i--) {
      const transform = chain[i];
      const inverse = { ...transform };
      
      // Some transforms are their own inverse
      if (transform.type === 'bitwise') {
        inverse.params.rounds = transform.params.rounds;
      } else if (transform.type === 'fibonacci') {
        inverse.params.n = transform.params.n;
      }
      // Others need special inversion logic
      
      inverseChain.push(inverse);
    }
    
    return inverseChain;
  }
}