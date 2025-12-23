export class DeadCodeInjector {
  constructor(entropy) {
    this.entropy = entropy;
    this.injectionPoints = [];
  }

  inject(node) {
    this.identifyInjectionPoints(node);
    this.applyInjections(node);
  }

  identifyInjectionPoints(node) {
    if (!node.children || node.children.length === 0) return;
    
    const maxInjections = Math.min(10, Math.floor(node.children.length * 0.3));
    const numInjections = this.entropy.randomInt(1, maxInjections);
    
    for (let i = 0; i < numInjections; i++) {
      const pos = this.entropy.randomInt(0, node.children.length - 1);
      this.injectionPoints.push({
        parent: node,
        position: pos,
        type: this.selectInjectionType()
      });
    }
    
    node.children.forEach(child => this.identifyInjectionPoints(child));
  }

  selectInjectionType() {
    const types = [
      'fakeLoop',
      'deadCalculation',
      'mockFunction',
      'stateMutation',
      'conditionalNoise',
      'tableOperations',
      'stringManipulation',
      'metatableNoise'
    ];
    
    return this.entropy.randomChoice(types);
  }

  applyInjections(node) {
    this.injectionPoints.forEach(point => {
      if (point.parent === node) {
        const injection = this.generateInjection(point.type);
        node.children.splice(point.position, 0, injection);
      }
    });
  }

  generateInjection(type) {
    switch (type) {
      case 'fakeLoop':
        return this.generateFakeLoop();
      case 'deadCalculation':
        return this.generateDeadCalculation();
      case 'mockFunction':
        return this.generateMockFunction();
      case 'stateMutation':
        return this.generateStateMutation();
      case 'conditionalNoise':
        return this.generateConditionalNoise();
      case 'tableOperations':
        return this.generateTableOperations();
      case 'stringManipulation':
        return this.generateStringManipulation();
      case 'metatableNoise':
        return this.generateMetatableNoise();
      default:
        return { type: 'comment', value: '-- dead code' };
    }
  }

  generateFakeLoop() {
    const varName = this.entropy.generateIdentifier();
    const limit = this.entropy.randomInt(10, 100);
    
    return {
      type: 'block',
      value: `
for ${varName} = 1, ${limit} do
  if ${varName} == ${limit} then
    break
  end
  local ${this.entropy.generateIdentifier()} = math.sin(${varName})
end
`
    };
  }

  generateDeadCalculation() {
    const var1 = this.entropy.generateIdentifier();
    const var2 = this.entropy.generateIdentifier();
    const var3 = this.entropy.generateIdentifier();
    
    const calculations = [
      `${var1} = (${var2} * 3.14159) / ${this.entropy.randomInt(2, 10)}`,
      `${var3} = math.log(math.abs(${var1}) + 1)`,
      `${var2} = bit32.bxor(${var3}, ${this.entropy.randomInt(1, 255)})`,
      `${var1} = string.format("%.3f", ${var2} / ${this.entropy.randomInt(1, 100)})`
    ];
    
    let code = `local ${var1}, ${var2}, ${var3} = 0, 0, 0\n`;
    calculations.forEach(calc => {
      code += calc + '\n';
    });
    
    return { type: 'block', value: code };
  }

  generateMockFunction() {
    const funcName = this.entropy.generateIdentifier();
    const param1 = this.entropy.generateIdentifier();
    const param2 = this.entropy.generateIdentifier();
    
    return {
      type: 'function',
      value: `
local function ${funcName}(${param1}, ${param2})
  local ${this.entropy.generateIdentifier()} = ${param1} + ${param2}
  local ${this.entropy.generateIdentifier()} = ${param1} * ${param2}
  local ${this.entropy.generateIdentifier()} = math.sqrt(math.abs(${param1}))
  
  for i = 1, ${this.entropy.randomInt(1, 5)} do
    ${this.entropy.generateIdentifier()} = ${this.entropy.generateIdentifier()} * i
  end
  
  return ${this.entropy.generateIdentifier()}
end

-- Never called
local ${this.entropy.generateIdentifier()} = ${funcName}
`
    };
  }

  generateStateMutation() {
    const tableName = this.entropy.generateIdentifier();
    const metatableName = this.entropy.generateIdentifier();
    
    return {
      type: 'block',
      value: `
local ${tableName} = {}
local ${metatableName} = {
  __index = function(t, k)
    return k == "secret" and ${this.entropy.randomInt(1, 100)} or nil
  end,
  __newindex = function(t, k, v)
    rawset(t, "_" .. k, v * ${this.entropy.randomInt(1, 10)})
  end
}

setmetatable(${tableName}, ${metatableName})

${tableName}.${this.entropy.generateIdentifier()} = ${this.entropy.randomInt(1, 100)}
local ${this.entropy.generateIdentifier()} = ${tableName}.${this.entropy.generateIdentifier()}
`
    };
  }

  generateConditionalNoise() {
    const varName = this.entropy.generateIdentifier();
    const checkName = this.entropy.generateIdentifier();
    
    return {
      type: 'block',
      value: `
local ${varName} = os.clock() * 1000 % ${this.entropy.randomInt(2, 100)}
local ${checkName} = function(x)
  if x > ${this.entropy.randomInt(25, 75)} then
    return "high"
  elseif x < ${this.entropy.randomInt(10, 25)} then
    return "low"
  else
    return "mid"
  end
end

local ${this.entropy.generateIdentifier()} = ${checkName}(${varName})
if ${this.entropy.generateIdentifier()} == "never" then
  ${this.generateDeadStatement()}
end
`
    };
  }

  generateTableOperations() {
    const tableName = this.entropy.generateIdentifier();
    const operations = this.entropy.randomInt(5, 20);
    
    let code = `local ${tableName} = {}\n`;
    
    for (let i = 0; i < operations; i++) {
      const key = this.entropy.random() > 0.5 ? 
        `"${this.entropy.generateIdentifier()}"` : 
        this.entropy.randomInt(1, 100);
      
      const value = this.entropy.random() > 0.5 ?
        `math.random()` :
        `"${this.entropy.generateIdentifier()}"`;
      
      code += `${tableName}[${key}] = ${value}\n`;
    }
    
    code += `
for k, v in pairs(${tableName}) do
  ${tableName}[k] = nil
end
`;
    
    return { type: 'block', value: code };
  }

  generateStringManipulation() {
    const strVar = this.entropy.generateIdentifier();
    const operations = this.entropy.randomInt(3, 10);
    
    let code = `local ${strVar} = "${this.generateRandomString()}"\n`;
    
    for (let i = 0; i < operations; i++) {
      const ops = [
        `${strVar} = ${strVar} .. "${this.generateRandomString()}"`,
        `${strVar} = string.reverse(${strVar})`,
        `${strVar} = string.sub(${strVar}, 2, -2)`,
        `${strVar} = string.gsub(${strVar}, ".", function(c) return string.byte(c) end)`
      ];
      
      code += this.entropy.randomChoice(ops) + '\n';
    }
    
    return { type: 'block', value: code };
  }

  generateMetatableNoise() {
    const objName = this.entropy.generateIdentifier();
    const metaName = this.entropy.generateIdentifier();
    
    return {
      type: 'block',
      value: `
local ${objName} = {}
local ${metaName} = {
  __add = function(a, b) return math.random(100) end,
  __sub = function(a, b) return #tostring(a) end,
  __mul = function(a, b) return os.clock() % 1 end,
  __div = function(a, b) return (a or 0) / (b or 1) end,
  __call = function(self, ...) 
    return table.concat({...}, ",")
  end
}

setmetatable(${objName}, ${metaName})

local ${this.entropy.generateIdentifier()} = ${objName} + ${objName}
local ${this.entropy.generateIdentifier()} = ${objName}(${this.entropy.randomInt(1, 5)})
`
    };
  }

  generateRandomString() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = this.entropy.randomInt(5, 20);
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars[this.entropy.randomInt(0, chars.length - 1)];
    }
    
    return result;
  }
}