export class ControlFlowObfuscator {
  constructor(entropy) {
    this.entropy = entropy;
    this.predicateCount = 0;
  }

  obfuscateFlow(node) {
    if (node.type === 'if' || node.type === 'while' || node.type === 'for') {
      this.obfuscateCondition(node);
    }
    
    if (node.type === 'block') {
      this.injectOpaquePredicates(node);
      this.flattenControlFlow(node);
    }
    
    if (node.children) {
      node.children.forEach(child => this.obfuscateFlow(child));
    }
  }

  obfuscateCondition(node) {
    const predicate = this.generateOpaquePredicate();
    const newCondition = this.combineConditions(node.condition, predicate);
    node.condition = newCondition;
  }

  generateOpaquePredicate() {
    this.predicateCount++;
    
    const predicates = [
      `(math.sin(${this.predicateCount}) * 1000) % 2 == ${this.entropy.randomInt(0, 1)}`,
      `bit32.bxor(${this.predicateCount}, ${this.entropy.randomInt(1, 255)}) > ${this.entropy.randomInt(0, 127)}`,
      `string.byte("X", 1) * ${this.predicateCount} % ${this.entropy.randomInt(2, 11)} == 0`,
      `os.clock() * ${this.entropy.randomInt(100, 1000)} % ${this.entropy.randomInt(2, 5)} ~= 0`,
      `table.concat({"a", "b", "c"}) ~= "" and ${this.predicateCount} * 0 == 0`
    ];
    
    return this.entropy.randomChoice(predicates);
  }

  combineConditions(original, predicate) {
    const combiners = ['and', 'or'];
    const combiner = this.entropy.randomChoice(combiners);
    
    if (this.entropy.random() > 0.5) {
      return `(${original} ${combiner} ${predicate})`;
    } else {
      return `(${predicate} ${combiner} ${original})`;
    }
  }

  injectOpaquePredicates(node) {
    const numPredicates = this.entropy.randomInt(1, 5);
    
    for (let i = 0; i < numPredicates; i++) {
      const predicate = this.generateOpaquePredicate();
      const deadCode = this.generateDeadBlock();
      
      node.children.unshift({
        type: 'if',
        condition: predicate,
        thenBlock: deadCode
      });
    }
  }

  generateDeadBlock() {
    const statements = this.entropy.randomInt(1, 5);
    let block = '{';
    
    for (let i = 0; i < statements; i++) {
      block += this.generateDeadStatement() + ';';
    }
    
    block += '}';
    return block;
  }

  generateDeadStatement() {
    const statements = [
      `local ${this.entropy.generateIdentifier()} = math.random()`,
      `${this.entropy.generateIdentifier()} = {}`,
      `table.insert(${this.entropy.generateIdentifier()}, ${this.entropy.randomInt(1, 100)})`,
      `if false then ${this.entropy.generateIdentifier()}() end`,
      `for i = 1, ${this.entropy.randomInt(1, 10)} do break end`
    ];
    
    return this.entropy.randomChoice(statements);
  }

  flattenControlFlow(node) {
    if (node.children.length < 2) return;
    
    const dispatcher = this.generateDispatcher(node.children);
    node.children = [dispatcher];
  }

  generateDispatcher(statements) {
    const dispatchVar = this.entropy.generateIdentifier();
    const stateVar = this.entropy.generateIdentifier();
    const cases = [];
    
    let code = `
local ${stateVar} = 1
local ${dispatchVar} = {
`;
    
    statements.forEach((stmt, i) => {
      const caseLabel = this.entropy.generateIdentifier();
      cases.push(caseLabel);
      
      code += `  [${i + 1}] = function()
    ${this.statementToString(stmt)}
    ${stateVar} = ${this.generateNextState(i, statements.length)}
  end,\n`;
    });
    
    code += `}

while ${stateVar} and ${dispatchVar}[${stateVar}] do
  ${dispatchVar}[${stateVar}]()
end`;
    
    return code;
  }

  statementToString(stmt) {
    if (typeof stmt === 'string') return stmt;
    if (stmt.value) return stmt.value;
    return '-- statement';
  }

  generateNextState(current, total) {
    const patterns = [
      `${current + 2}`,  // Linear
      `math.random(1, ${total})`,  // Random
      `${current % ${total}} + 1`,  // Modular
      `bit32.bxor(${current}, ${this.entropy.randomInt(1, 255)}) % ${total} + 1`  // XOR pattern
    ];
    
    return this.entropy.randomChoice(patterns);
  }
}