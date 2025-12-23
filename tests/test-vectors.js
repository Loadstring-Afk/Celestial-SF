export const testVectors = {
  simple: `
local x = 10
local y = 20
local sum = x + y
print(sum)
`,

  functions: `
function add(a, b)
  return a + b
end

function multiply(a, b)
  return a * b
end

local result = add(5, 3) * multiply(2, 4)
print(result)
`,

  controlFlow: `
local score = 85

if score >= 90 then
  print("A")
elseif score >= 80 then
  print("B")
elseif score >= 70 then
  print("C")
else
  print("F")
end

for i = 1, 10 do
  print("Iteration: " .. i)
end

local i = 1
while i <= 5 do
  print("While loop: " .. i)
  i = i + 1
end
`,

  tables: `
local player = {
  name = "Alice",
  health = 100,
  inventory = {"sword", "shield", "potion"},
  stats = {
    strength = 10,
    agility = 8,
    intelligence = 6
  }
}

for key, value in pairs(player) do
  if type(value) == "table" then
    print(key .. ": [table]")
    for k, v in pairs(value) do
      print("  " .. k .. ": " .. v)
    end
  else
    print(key .. ": " .. tostring(value))
  end
end

table.insert(player.inventory, "bow")
table.remove(player.inventory, 1)
`,

  complex: `
local function factorial(n)
  if n <= 1 then
    return 1
  end
  return n * factorial(n - 1)
end

local function fibonacci(n)
  if n <= 2 then
    return 1
  end
  local a, b = 1, 1
  for i = 3, n do
    a, b = b, a + b
  end
  return b
end

local function isPrime(num)
  if num <= 1 then return false end
  for i = 2, math.sqrt(num) do
    if num % i == 0 then
      return false
    end
  end
  return true
end

-- Calculate some values
local numbers = {}
for i = 1, 20 do
  table.insert(numbers, {
    value = i,
    factorial = factorial(i),
    fibonacci = fibonacci(i),
    prime = isPrime(i)
  })
end

-- Print results
for _, data in ipairs(numbers) do
  local primeStr = data.prime and "prime" or "not prime"
  print(string.format("%2d: factorial=%d, fibonacci=%d, %s",
    data.value, data.factorial, data.fibonacci, primeStr))
end
`,

  securityTest: `
-- Test for dangerous patterns
local env = getfenv(0)
local debug = debug
local os = os

-- Suspicious patterns
local code = "print('hello')"
local loaded = loadstring(code)
if loaded then
  loaded()
end

-- Hex patterns
local address = 0xDEADBEEF
local mask = 0xFF00FF00

-- Sequential patterns
local arr = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}

-- Common variables
local x = 1
local y = 2
local z = x + y
local i, j, k = 0, 0, 0

-- Predictable loops
for i = 1, 100 do
  -- Do something
end

local t = {}
for k, v in pairs(t) do
  -- Another loop
end
`,

  enterpriseExample: `
-- Enterprise-level Lua module
local Module = {}

Module.config = {
  version = "1.0.0",
  debug = false,
  maxRetries = 3,
  timeout = 5000
}

function Module:initialize(options)
  options = options or {}
  for k, v in pairs(options) do
    self.config[k] = v
  end
  
  self.cache = {}
  self.connections = {}
  self.metrics = {
    requests = 0,
    errors = 0,
    latency = 0
  }
  
  return self
end

function Module:process(data)
  self.metrics.requests = self.metrics.requests + 1
  local startTime = os.clock()
  
  -- Validate input
  if not data or type(data) ~= "table" then
    self.metrics.errors = self.metrics.errors + 1
    return nil, "Invalid input"
  end
  
  -- Process data
  local result = {}
  for key, value in pairs(data) do
    if type(value) == "string" then
      result[key] = string.upper(value)
    elseif type(value) == "number" then
      result[key] = value * 2
    elseif type(value) == "table" then
      result[key] = self:process(value)
    end
  end
  
  -- Update metrics
  local endTime = os.clock()
  self.metrics.latency = self.metrics.latency + (endTime - startTime)
  
  -- Cache result
  local cacheKey = self:generateKey(data)
  self.cache[cacheKey] = {
    result = result,
    timestamp = os.time(),
    ttl = 3600
  }
  
  return result
end

function Module:generateKey(data)
  local str = ""
  for k, v in pairs(data) do
    str = str .. tostring(k) .. ":" .. tostring(v) .. ";"
  end
  return string.sub(str, 1, -2)
end

function Module:getMetrics()
  return {
    totalRequests = self.metrics.requests,
    errorRate = self.metrics.errors / math.max(self.metrics.requests, 1),
    avgLatency = self.metrics.latency / math.max(self.metrics.requests, 1),
    cacheSize = #self.cache,
    config = self.config
  }
end

function Module:cleanup()
  -- Clean expired cache entries
  local currentTime = os.time()
  local removed = 0
  
  for key, entry in pairs(self.cache) do
    if currentTime - entry.timestamp > entry.ttl then
      self.cache[key] = nil
      removed = removed + 1
    end
  end
  
  return removed
end

-- Export module
return Module
`,

  obfuscationResistant: `
-- Code designed to test obfuscation resilience
local secrets = {
  key1 = 0x12345678,
  key2 = 0x9ABCDEF0,
  key3 = 0xFEDCBA98
}

local function obscureTransform(value)
  local a = bit32.bxor(value, secrets.key1)
  local b = bit32.ror(a, 7)
  local c = bit32.bxor(b, secrets.key2)
  local d = bit32.rol(c, 13)
  return bit32.bxor(d, secrets.key3)
end

local function generatePattern(size)
  local pattern = {}
  for i = 1, size do
    pattern[i] = obscureTransform(i * 7919) % 256
  end
  return pattern
end

local function validatePattern(pattern, expectedHash)
  local hash = 0
  for i, v in ipairs(pattern) do
    hash = (hash * 31 + v) % 0xFFFFFFFF
  end
  return hash == expectedHash
end

-- Complex control flow
local state = {
  mode = "normal",
  counter = 0,
  buffer = {}
}

while state.counter < 100 do
  state.counter = state.counter + 1
  
  if state.counter % 3 == 0 then
    state.mode = "alternate"
    table.insert(state.buffer, obscureTransform(state.counter))
  elseif state.counter % 5 == 0 then
    state.mode = "special"
    local pattern = generatePattern(10)
    if validatePattern(pattern, 0xDEADBEEF) then
      state.buffer = {}
    end
  else
    state.mode = "normal"
  end
  
  -- Nested conditionals
  if #state.buffer > 0 then
    for i = 1, #state.buffer do
      if i % 2 == 0 then
        state.buffer[i] = bit32.bnot(state.buffer[i])
      else
        state.buffer[i] = bit32.bxor(state.buffer[i], secrets.key1)
      end
    end
  end
end
`
};

export const testCases = [
  {
    name: "Simple Arithmetic",
    code: testVectors.simple,
    expectedSize: 100,
    securityLevel: "Basic"
  },
  {
    name: "Function Calls",
    code: testVectors.functions,
    expectedSize: 200,
    securityLevel: "Standard"
  },
  {
    name: "Control Flow",
    code: testVectors.controlFlow,
    expectedSize: 400,
    securityLevel: "Professional"
  },
  {
    name: "Complex Logic",
    code: testVectors.complex,
    expectedSize: 800,
    securityLevel: "Enterprise"
  },
  {
    name: "Security Patterns",
    code: testVectors.securityTest,
    expectedSize: 600,
    securityLevel: "Military"
  },
  {
    name: "Enterprise Module",
    code: testVectors.enterpriseExample,
    expectedSize: 1500,
    securityLevel: "Enterprise"
  },
  {
    name: "Obfuscation Resistant",
    code: testVectors.obfuscationResistant,
    expectedSize: 1200,
    securityLevel: "Military"
  }
];

export function runTests(obfuscator) {
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    
    try {
      const startTime = Date.now();
      const result = obfuscator.obfuscate(testCase.code, {
        obfuscationLevel: 10,
        securityProfile: 'military'
      });
      const endTime = Date.now();
      
      const metrics = {
        name: testCase.name,
        originalSize: testCase.code.length,
        obfuscatedSize: result.obfuscatedCode.length,
        expansionRatio: ((result.obfuscatedCode.length / testCase.code.length) * 100).toFixed(2) + '%',
        processingTime: endTime - startTime,
        securityLevel: result.securityLevel,
        success: true,
        checksumValid: result.checksum !== undefined
      };
      
      // Validate output
      const validation = validateObfuscation(result.obfuscatedCode);
      metrics.validation = validation;
      
      results.push(metrics);
      console.log(`✓ ${testCase.name}: ${metrics.expansionRatio} expansion, ${metrics.processingTime}ms`);
      
    } catch (error) {
      console.log(`✗ ${testCase.name}: ${error.message}`);
      results.push({
        name: testCase.name,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

function validateObfuscation(code) {
  const checks = {
    hasHeader: code.includes('Obfuscated Using Celestial Obfuscator'),
    entropy: calculateShannonEntropy(code),
    lineCount: code.split('\n').length,
    hasUnicode: /[^\x00-\x7F]/.test(code),
    hasComplexPatterns: /[α-ω∀∃∈∉∏∑√∛∜∞]/.test(code)
  };
  
  return checks;
}

function calculateShannonEntropy(str) {
  const len = str.length;
  const frequencies = {};
  
  for (let i = 0; i < len; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  
  let entropy = 0;
  for (const char in frequencies) {
    const freq = frequencies[char] / len;
    entropy -= freq * Math.log2(freq);
  }
  
  return entropy;
}

export function benchmark(obfuscator, iterations = 10) {
  const code = testVectors.complex;
  const times = [];
  const sizes = [];
  
  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    const result = obfuscator.obfuscate(code, {
      obfuscationLevel: 7,
      securityProfile: 'enterprise'
    });
    const endTime = Date.now();
    
    times.push(endTime - startTime);
    sizes.push(result.obfuscatedCode.length);
    
    // Small delay to avoid overwhelming
    if (i < iterations - 1) {
      setTimeout(() => {}, 100);
    }
  }
  
  return {
    avgTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    avgSize: sizes.reduce((a, b) => a + b, 0) / sizes.length,
    timeStdDev: calculateStdDev(times),
    sizeStdDev: calculateStdDev(sizes)
  };
}

function calculateStdDev(values) {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}