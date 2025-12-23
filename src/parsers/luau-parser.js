export class LuauParser {
  constructor() {
    this.tokens = [];
    this.position = 0;
    this.ast = null;
  }

  tokenize(code) {
    const tokens = [];
    let current = 0;
    
    const patterns = {
      whitespace: /\s+/y,
      comment: /--[^\n]*/y,
      string: /(['"])(?:\\.|(?!\1).)*\1/y,
      number: /\b\d+(?:\.\d+)?\b/y,
      keyword: /\b(?:function|local|if|then|else|elseif|end|for|while|do|repeat|until|return|break|in|and|or|not)\b/y,
      identifier: /\b[a-zA-Z_]\w*\b/y,
      operator: /[=~<>]=?|\.\.\.?|[\+\-\*/%^#&|]|\.\.?/y,
      punctuation: /[\[\](){},;:\.]/y
    };
    
    while (current < code.length) {
      let matched = false;
      
      // Skip whitespace
      patterns.whitespace.lastIndex = current;
      const whitespace = patterns.whitespace.exec(code);
      if (whitespace) {
        current += whitespace[0].length;
        continue;
      }
      
      // Match tokens
      for (const [type, pattern] of Object.entries(patterns)) {
        if (type === 'whitespace') continue;
        
        pattern.lastIndex = current;
        const match = pattern.exec(code);
        
        if (match) {
          tokens.push({
            type: type,
            value: match[0],
            position: current
          });
          
          current += match[0].length;
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        // Unknown character
        tokens.push({
          type: 'unknown',
          value: code[current],
          position: current
        });
        current++;
      }
    }
    
    return tokens;
  }

  parse(code) {
    this.tokens = this.tokenize(code);
    this.position = 0;
    this.ast = this.parseBlock();
    return this.ast;
  }

  currentToken() {
    return this.tokens[this.position] || { type: 'EOF', value: '' };
  }

  peekToken(offset = 1) {
    return this.tokens[this.position + offset] || { type: 'EOF', value: '' };
  }

  consumeToken(type = null) {
    const token = this.currentToken();
    
    if (type && token.type !== type) {
      throw new Error(`Expected ${type}, got ${token.type}`);
    }
    
    this.position++;
    return token;
  }

  matchToken(type) {
    return this.currentToken().type === type;
  }

  parseBlock() {
    const statements = [];
    
    while (!this.matchToken('EOF') && !this.matchToken('end') && !this.matchToken('else') && !this.matchToken('elseif')) {
      const statement = this.parseStatement();
      if (statement) {
        statements.push(statement);
      }
    }
    
    return {
      type: 'Block',
      statements: statements
    };
  }

  parseStatement() {
    const token = this.currentToken();
    
    switch (token.value) {
      case 'local':
        return this.parseLocal();
      case 'function':
        return this.parseFunction();
      case 'if':
        return this.parseIf();
      case 'for':
        return this.parseFor();
      case 'while':
        return this.parseWhile();
      case 'repeat':
        return this.parseRepeat();
      case 'return':
        return this.parseReturn();
      case 'break':
        this.consumeToken();
        return { type: 'Break' };
      default:
        return this.parseAssignmentOrCall();
    }
  }

  parseLocal() {
    this.consumeToken(); // 'local'
    
    if (this.matchToken('function')) {
      return this.parseLocalFunction();
    }
    
    const names = [this.consumeToken('identifier').value];
    
    while (this.matchToken(',')) {
      this.consumeToken(); // ','
      names.push(this.consumeToken('identifier').value);
    }
    
    let value = null;
    if (this.matchToken('=')) {
      this.consumeToken(); // '='
      value = this.parseExpression();
    }
    
    this.consumeSemicolon();
    
    return {
      type: 'Local',
      names: names,
      value: value
    };
  }

  parseLocalFunction() {
    this.consumeToken(); // 'function'
    const name = this.consumeToken('identifier').value;
    this.consumeToken('(');
    
    const params = this.parseParamList();
    this.consumeToken(')');
    
    const body = this.parseBlock();
    this.consumeToken('end');
    
    return {
      type: 'LocalFunction',
      name: name,
      params: params,
      body: body
    };
  }

  parseFunction() {
    this.consumeToken(); // 'function'
    
    let name;
    if (this.matchToken('identifier')) {
      name = this.parseIdentifierChain();
    } else {
      throw new Error('Expected function name');
    }
    
    this.consumeToken('(');
    const params = this.parseParamList();
    this.consumeToken(')');
    
    const body = this.parseBlock();
    this.consumeToken('end');
    
    return {
      type: 'Function',
      name: name,
      params: params,
      body: body
    };
  }

  parseIdentifierChain() {
    let chain = [this.consumeToken('identifier').value];
    
    while (this.matchToken('.')) {
      this.consumeToken(); // '.'
      chain.push(this.consumeToken('identifier').value);
    }
    
    return chain.join('.');
  }

  parseParamList() {
    const params = [];
    
    if (!this.matchToken(')')) {
      params.push(this.consumeToken('identifier').value);
      
      while (this.matchToken(',')) {
        this.consumeToken(); // ','
        if (this.matchToken('...')) {
          params.push('...');
          this.consumeToken();
          break;
        }
        params.push(this.consumeToken('identifier').value);
      }
    }
    
    return params;
  }

  parseIf() {
    this.consumeToken(); // 'if'
    const condition = this.parseExpression();
    this.consumeToken('then');
    
    const thenBlock = this.parseBlock();
    const elseIfs = [];
    let elseBlock = null;
    
    while (this.matchToken('elseif')) {
      this.consumeToken(); // 'elseif'
      const elseifCondition = this.parseExpression();
      this.consumeToken('then');
      const elseifBlock = this.parseBlock();
      
      elseIfs.push({
        condition: elseifCondition,
        block: elseifBlock
      });
    }
    
    if (this.matchToken('else')) {
      this.consumeToken(); // 'else'
      elseBlock = this.parseBlock();
    }
    
    this.consumeToken('end');
    
    return {
      type: 'If',
      condition: condition,
      thenBlock: thenBlock,
      elseIfs: elseIfs,
      elseBlock: elseBlock
    };
  }

  parseFor() {
    this.consumeToken(); // 'for'
    
    if (this.matchToken('identifier') && this.peekToken().value === '=') {
      // Numeric for
      const variable = this.consumeToken('identifier').value;
      this.consumeToken('=');
      const start = this.parseExpression();
      this.consumeToken(',');
      const end = this.parseExpression();
      
      let step = null;
      if (this.matchToken(',')) {
        this.consumeToken();
        step = this.parseExpression();
      }
      
      this.consumeToken('do');
      const body = this.parseBlock();
      this.consumeToken('end');
      
      return {
        type: 'NumericFor',
        variable: variable,
        start: start,
        end: end,
        step: step,
        body: body
      };
    } else {
      // Generic for
      const variables = [this.consumeToken('identifier').value];
      
      while (this.matchToken(',')) {
        this.consumeToken();
        variables.push(this.consumeToken('identifier').value);
      }
      
      this.consumeToken('in');
      const expressions = [this.parseExpression()];
      
      while (this.matchToken(',')) {
        this.consumeToken();
        expressions.push(this.parseExpression());
      }
      
      this.consumeToken('do');
      const body = this.parseBlock();
      this.consumeToken('end');
      
      return {
        type: 'GenericFor',
        variables: variables,
        expressions: expressions,
        body: body
      };
    }
  }

  parseWhile() {
    this.consumeToken(); // 'while'
    const condition = this.parseExpression();
    this.consumeToken('do');
    const body = this.parseBlock();
    this.consumeToken('end');
    
    return {
      type: 'While',
      condition: condition,
      body: body
    };
  }

  parseRepeat() {
    this.consumeToken(); // 'repeat'
    const body = this.parseBlock();
    this.consumeToken('until');
    const condition = this.parseExpression();
    
    return {
      type: 'Repeat',
      condition: condition,
      body: body
    };
  }

  parseReturn() {
    this.consumeToken(); // 'return'
    
    const expressions = [];
    if (!this.matchToken(';') && !this.matchToken('EOF')) {
      expressions.push(this.parseExpression());
      
      while (this.matchToken(',')) {
        this.consumeToken();
        expressions.push(this.parseExpression());
      }
    }
    
    this.consumeSemicolon();
    
    return {
      type: 'Return',
      expressions: expressions
    };
  }

  parseAssignmentOrCall() {
    const expression = this.parseExpression();
    
    if (this.matchToken('=')) {
      // Assignment
      this.consumeToken(); // '='
      const value = this.parseExpression();
      this.consumeSemicolon();
      
      return {
        type: 'Assignment',
        target: expression,
        value: value
      };
    } else {
      // Function call or expression statement
      this.consumeSemicolon();
      
      if (expression.type === 'Call') {
        return expression;
      }
      
      return {
        type: 'ExpressionStatement',
        expression: expression
      };
    }
  }

  parseExpression() {
    return this.parseBinaryExpression(0);
  }

  parseBinaryExpression(minPrecedence) {
    const precedences = {
      'or': 1,
      'and': 2,
      '<': 3, '>': 3, '<=': 3, '>=': 3, '~=': 3, '==': 3,
      '..': 4,
      '+': 5, '-': 5,
      '*': 6, '/': 6, '%': 6,
      '^': 7
    };
    
    let left = this.parseUnaryExpression();
    
    while (true) {
      const token = this.currentToken();
      const precedence = precedences[token.value];
      
      if (!precedence || precedence < minPrecedence) {
        break;
      }
      
      this.consumeToken();
      const right = this.parseBinaryExpression(precedence + 1);
      
      left = {
        type: 'BinaryOperation',
        operator: token.value,
        left: left,
        right: right
      };
    }
    
    return left;
  }

  parseUnaryExpression() {
    if (this.matchToken('-') || this.matchToken('not') || this.matchToken('#')) {
      const token = this.consumeToken();
      const argument = this.parseUnaryExpression();
      
      return {
        type: 'UnaryOperation',
        operator: token.value,
        argument: argument
      };
    }
    
    return this.parsePrimaryExpression();
  }

  parsePrimaryExpression() {
    const token = this.currentToken();
    
    switch (token.type) {
      case 'number':
        this.consumeToken();
        return { type: 'Number', value: parseFloat(token.value) };
        
      case 'string':
        this.consumeToken();
        return { type: 'String', value: token.value.slice(1, -1) };
        
      case 'identifier':
        return this.parseVariableOrCall();
        
      case '(':
        this.consumeToken(); // '('
        const expression = this.parseExpression();
        this.consumeToken(')');
        return expression;
        
      case '{':
        return this.parseTable();
        
      default:
        throw new Error(`Unexpected token: ${token.value}`);
    }
  }

  parseVariableOrCall() {
    const start = this.position;
    const variable = this.parseVariable();
    
    if (this.matchToken('(') || this.matchToken('{') || this.matchToken('string')) {
      // Function call
      this.position = start;
      return this.parseFunctionCall();
    }
    
    return variable;
  }

  parseVariable() {
    let expression = { type: 'Variable', name: this.consumeToken('identifier').value };
    
    while (true) {
      if (this.matchToken('.')) {
        this.consumeToken(); // '.'
        const name = this.consumeToken('identifier').value;
        
        expression = {
          type: 'MemberAccess',
          object: expression,
          member: name
        };
      } else if (this.matchToken('[')) {
        this.consumeToken(); // '['
        const index = this.parseExpression();
        this.consumeToken(']');
        
        expression = {
          type: 'IndexAccess',
          object: expression,
          index: index
        };
      } else if (this.matchToken(':') && this.peekToken(1).type === 'identifier') {
        this.consumeToken(); // ':'
        const method = this.consumeToken('identifier').value;
        
        if (this.matchToken('(')) {
          // Method call
          this.consumeToken(); // '('
          const args = this.parseArgList();
          this.consumeToken(')');
          
          return {
            type: 'MethodCall',
            object: expression,
            method: method,
            arguments: args
          };
        }
      } else {
        break;
      }
    }
    
    return expression;
  }

  parseFunctionCall() {
    const prefix = this.parsePrimaryExpression();
    
    if (this.matchToken(':')) {
      // Method call
      this.consumeToken(); // ':'
      const method = this.consumeToken('identifier').value;
      this.consumeToken('(');
      const args = this.parseArgList();
      this.consumeToken(')');
      
      return {
        type: 'MethodCall',
        object: prefix,
        method: method,
        arguments: args
      };
    } else if (this.matchToken('(')) {
      // Function call
      this.consumeToken(); // '('
      const args = this.parseArgList();
      this.consumeToken(')');
      
      return {
        type: 'Call',
        function: prefix,
        arguments: args
      };
    } else if (this.matchToken('{') || this.matchToken('string')) {
      // Function call with table or string argument
      const args = [this.parsePrimaryExpression()];
      
      return {
        type: 'Call',
        function: prefix,
        arguments: args
      };
    }
    
    return prefix;
  }

  parseArgList() {
    const args = [];
    
    if (!this.matchToken(')')) {
      args.push(this.parseExpression());
      
      while (this.matchToken(',')) {
        this.consumeToken();
        args.push(this.parseExpression());
      }
    }
    
    return args;
  }

  parseTable() {
    this.consumeToken(); // '{'
    const fields = [];
    
    while (!this.matchToken('}')) {
      if (this.matchToken('[')) {
        // Index field
        this.consumeToken(); // '['
        const key = this.parseExpression();
        this.consumeToken(']');
        this.consumeToken('=');
        const value = this.parseExpression();
        
        fields.push({ type: 'IndexField', key: key, value: value });
      } else if (this.matchToken('identifier') && this.peekToken().value === '=') {
        // Named field
        const key = this.consumeToken('identifier').value;
        this.consumeToken('=');
        const value = this.parseExpression();
        
        fields.push({ type: 'NamedField', key: key, value: value });
      } else {
        // Array field
        const value = this.parseExpression();
        fields.push({ type: 'ArrayField', value: value });
      }
      
      if (!this.matchToken('}')) {
        this.consumeToken(',');
      }
    }
    
    this.consumeToken('}');
    
    return {
      type: 'Table',
      fields: fields
    };
  }

  consumeSemicolon() {
    if (this.matchToken(';')) {
      this.consumeToken();
    }
  }

  generateCode(ast) {
    if (!ast) return '';
    
    const generators = {
      Block: (node) => node.statements.map(stmt => this.generateCode(stmt)).join('\n'),
      
      Local: (node) => {
        let code = `local ${node.names.join(', ')}`;
        if (node.value) {
          code += ` = ${this.generateCode(node.value)}`;
        }
        return code;
      },
      
      LocalFunction: (node) => {
        return `local function ${node.name}(${node.params.join(', ')})\n${this.generateCode(node.body)}\nend`;
      },
      
      Function: (node) => {
        return `function ${node.name}(${node.params.join(', ')})\n${this.generateCode(node.body)}\nend`;
      },
      
      If: (node) => {
        let code = `if ${this.generateCode(node.condition)} then\n${this.generateCode(node.thenBlock)}`;
        
        node.elseIfs.forEach(elseif => {
          code += `\nelseif ${this.generateCode(elseif.condition)} then\n${this.generateCode(elseif.block)}`;
        });
        
        if (node.elseBlock) {
          code += `\nelse\n${this.generateCode(node.elseBlock)}`;
        }
        
        code += '\nend';
        return code;
      },
      
      NumericFor: (node) => {
        let code = `for ${node.variable} = ${this.generateCode(node.start)}, ${this.generateCode(node.end)}`;
        if (node.step) {
          code += `, ${this.generateCode(node.step)}`;
        }
        code += ` do\n${this.generateCode(node.body)}\nend`;
        return code;
      },
      
      GenericFor: (node) => {
        return `for ${node.variables.join(', ')} in ${node.expressions.map(exp => this.generateCode(exp)).join(', ')} do\n${this.generateCode(node.body)}\nend`;
      },
      
      While: (node) => {
        return `while ${this.generateCode(node.condition)} do\n${this.generateCode(node.body)}\nend`;
      },
      
      Repeat: (node) => {
        return `repeat\n${this.generateCode(node.body)}\nuntil ${this.generateCode(node.condition)}`;
      },
      
      Return: (node) => {
        if (node.expressions.length === 0) return 'return';
        return `return ${node.expressions.map(exp => this.generateCode(exp)).join(', ')}`;
      },
      
      Assignment: (node) => {
        return `${this.generateCode(node.target)} = ${this.generateCode(node.value)}`;
      },
      
      ExpressionStatement: (node) => this.generateCode(node.expression),
      
      Break: () => 'break',
      
      Call: (node) => {
        const args = node.arguments.map(arg => this.generateCode(arg)).join(', ');
        return `${this.generateCode(node.function)}(${args})`;
      },
      
      MethodCall: (node) => {
        const args = node.arguments.map(arg => this.generateCode(arg)).join(', ');
        return `${this.generateCode(node.object)}:${node.method}(${args})`;
      },
      
      BinaryOperation: (node) => {
        return `${this.generateCode(node.left)} ${node.operator} ${this.generateCode(node.right)}`;
      },
      
      UnaryOperation: (node) => {
        return `${node.operator} ${this.generateCode(node.argument)}`;
      },
      
      Variable: (node) => node.name,
      
      MemberAccess: (node) => `${this.generateCode(node.object)}.${node.member}`,
      
      IndexAccess: (node) => `${this.generateCode(node.object)}[${this.generateCode(node.index)}]`,
      
      Number: (node) => node.value.toString(),
      
      String: (node) => `"${node.value.replace(/"/g, '\\"')}"`,
      
      Table: (node) => {
        const fields = node.fields.map(field => {
          switch (field.type) {
            case 'IndexField':
              return `[${this.generateCode(field.key)}] = ${this.generateCode(field.value)}`;
            case 'NamedField':
              return `${field.key} = ${this.generateCode(field.value)}`;
            case 'ArrayField':
              return this.generateCode(field.value);
          }
        });
        
        return `{${fields.join(', ')}}`;
      }
    };
    
    if (generators[ast.type]) {
      return generators[ast.type](ast);
    }
    
    return '';
  }
}