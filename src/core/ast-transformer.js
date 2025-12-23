import { EntropyGenerator } from '../utils/entropy-generator.js';

export class ASTTransformer {
  constructor(entropy) {
    this.entropy = entropy || new EntropyGenerator();
    this.nodeTypes = {
      PROGRAM: 'Program',
      BLOCK: 'Block',
      FUNCTION: 'Function',
      IF: 'If',
      WHILE: 'While',
      FOR: 'For',
      VARIABLE: 'Variable',
      ASSIGNMENT: 'Assignment',
      CALL: 'Call',
      RETURN: 'Return',
      STRING: 'String',
      NUMBER: 'Number',
      BOOLEAN: 'Boolean',
      TABLE: 'Table',
      BINARY_OP: 'BinaryOp',
      UNARY_OP: 'UnaryOp'
    };
  }

  parse(code) {
    const lines = code.split('\n');
    const ast = {
      type: this.nodeTypes.PROGRAM,
      body: [],
      comments: [],
      metadata: {
        originalLength: code.length,
        lineCount: lines.length,
        entropy: this.entropy.generateSeed()
      }
    };
    
    let currentBlock = null;
    let depth = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line || line.startsWith('--')) {
        ast.comments.push({ line: i + 1, text: line });
        continue;
      }
      
      const node = this.parseLine(line, i + 1);
      if (node) {
        node.depth = depth;
        
        if (line.includes('end') || line.includes('}')) {
          depth = Math.max(0, depth - 1);
        }
        
        if (line.includes('function') || line.includes('do') || line.includes('then')) {
          depth++;
          if (!node.body) {
            node.body = [];
            currentBlock = node;
          }
        }
        
        if (currentBlock && depth > 0) {
          currentBlock.body.push(node);
        } else {
          ast.body.push(node);
        }
      }
    }
    
    return ast;
  }

  parseLine(line, lineNumber) {
    // Simplified parser for demonstration
    if (line.startsWith('function') || line.includes('= function')) {
      return this.parseFunction(line, lineNumber);
    } else if (line.startsWith('if')) {
      return this.parseIf(line, lineNumber);
    } else if (line.startsWith('for') || line.startsWith('while')) {
      return this.parseLoop(line, lineNumber);
    } else if (line.startsWith('local')) {
      return this.parseLocal(line, lineNumber);
    } else if (line.includes('=')) {
      return this.parseAssignment(line, lineNumber);
    } else if (line.includes('(') && line.includes(')')) {
      return this.parseCall(line, lineNumber);
    } else if (line.startsWith('return')) {
      return this.parseReturn(line, lineNumber);
    }
    
    return {
      type: 'Expression',
      value: line,
      line: lineNumber,
      raw: line
    };
  }

  parseFunction(line, lineNumber) {
    const match = line.match(/function\s+([^(]+)\(([^)]*)\)/);
    return {
      type: this.nodeTypes.FUNCTION,
      name: match ? match[1].trim() : this.entropy.generateIdentifier(),
      params: match ? match[2].split(',').map(p => p.trim()) : [],
      body: [],
      line: lineNumber,
      depth: 0
    };
  }

  parseIf(line, lineNumber) {
    const condition = line.substring(2).trim();
    return {
      type: this.nodeTypes.IF,
      condition: condition,
      thenBlock: [],
      elseBlock: [],
      line: lineNumber
    };
  }

  parseLocal(line, lineNumber) {
    const content = line.substring(5).trim();
    const [vars, ...rest] = content.split('=');
    
    return {
      type: this.nodeTypes.VARIABLE,
      names: vars.split(',').map(v => v.trim()),
      value: rest.length > 0 ? rest.join('=').trim() : null,
      line: lineNumber
    };
  }

  transform(ast, transformations) {
    const transformed = this.deepClone(ast);
    this.applyTransformations(transformed, transformations);
    return transformed;
  }

  applyTransformations(node, transformations) {
    if (!node || typeof node !== 'object') return;
    
    // Apply transformations to current node
    transformations.forEach(transform => {
      if (typeof transform === 'function') {
        const result = transform(node);
        if (result) {
          Object.assign(node, result);
        }
      }
    });
    
    // Recursively apply to children
    const childProperties = ['body', 'thenBlock', 'elseBlock', 'args', 'value', 'left', 'right'];
    
    childProperties.forEach(prop => {
      if (Array.isArray(node[prop])) {
        node[prop].forEach(child => this.applyTransformations(child, transformations));
      } else if (node[prop] && typeof node[prop] === 'object') {
        this.applyTransformations(node[prop], transformations);
      }
    });
  }

  generate(ast) {
    let output = '';
    
    const generateNode = (node, indent = '') => {
      if (!node) return '';
      
      switch (node.type) {
        case this.nodeTypes.PROGRAM:
          return node.body.map(child => generateNode(child, indent)).join('\n');
          
        case this.nodeTypes.FUNCTION:
          const params = node.params.join(', ');
          let funcCode = `${indent}function ${node.name}(${params})\n`;
          funcCode += node.body.map(child => generateNode(child, indent + '  ')).join('\n');
          funcCode += `\n${indent}end`;
          return funcCode;
          
        case this.nodeTypes.IF:
          let ifCode = `${indent}if ${node.condition} then\n`;
          ifCode += node.thenBlock.map(child => generateNode(child, indent + '  ')).join('\n');
          if (node.elseBlock && node.elseBlock.length > 0) {
            ifCode += `\n${indent}else\n`;
            ifCode += node.elseBlock.map(child => generateNode(child, indent + '  ')).join('\n');
          }
          ifCode += `\n${indent}end`;
          return ifCode;
          
        case this.nodeTypes.VARIABLE:
          let varCode = `${indent}local ${node.names.join(', ')}`;
          if (node.value) {
            varCode += ` = ${node.value}`;
          }
          return varCode;
          
        case this.nodeTypes.ASSIGNMENT:
          return `${indent}${node.target} = ${node.value}`;
          
        case this.nodeTypes.CALL:
          const args = node.args.map(arg => generateNode(arg, '')).join(', ');
          return `${indent}${node.func}(${args})`;
          
        case this.nodeTypes.RETURN:
          return `${indent}return ${node.value}`;
          
        case 'Expression':
          return indent + node.value;
          
        default:
          if (node.raw) return indent + node.raw;
          return '';
      }
    };
    
    return generateNode(ast);
  }

  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }
    
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    
    return cloned;
  }

  analyzeComplexity(ast) {
    const metrics = {
      functions: 0,
      loops: 0,
      conditionals: 0,
      variables: 0,
      calls: 0,
      maxDepth: 0,
      cyclomatic: 1
    };
    
    const traverse = (node, depth = 0) => {
      metrics.maxDepth = Math.max(metrics.maxDepth, depth);
      
      switch (node.type) {
        case this.nodeTypes.FUNCTION:
          metrics.functions++;
          metrics.cyclomatic++;
          break;
          
        case this.nodeTypes.IF:
          metrics.conditionals++;
          metrics.cyclomatic++;
          break;
          
        case this.nodeTypes.WHILE:
        case this.nodeTypes.FOR:
          metrics.loops++;
          metrics.cyclomatic++;
          break;
          
        case this.nodeTypes.VARIABLE:
          metrics.variables += node.names.length;
          break;
          
        case this.nodeTypes.CALL:
          metrics.calls++;
          break;
      }
      
      const childProps = ['body', 'thenBlock', 'elseBlock', 'args', 'value'];
      childProps.forEach(prop => {
        if (Array.isArray(node[prop])) {
          node[prop].forEach(child => traverse(child, depth + 1));
        } else if (node[prop] && typeof node[prop] === 'object') {
          traverse(node[prop], depth + 1);
        }
      });
    };
    
    traverse(ast);
    return metrics;
  }
}