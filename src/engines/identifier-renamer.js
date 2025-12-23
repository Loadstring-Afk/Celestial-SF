export class IdentifierRenamer {
  constructor(entropy) {
    this.entropy = entropy;
    this.mapping = new Map();
    this.reserved = new Set(['local', 'function', 'if', 'then', 'else', 'end']);
  }

  transform(node) {
    if (node.type === 'identifier' && !this.reserved.has(node.value)) {
      if (!this.mapping.has(node.value)) {
        this.mapping.set(node.value, this.generateUniqueName());
      }
      node.value = this.mapping.get(node.value);
    }
    
    if (node.children) {
      node.children.forEach(child => this.transform(child));
    }
  }

  generateUniqueName() {
    let name;
    do {
      name = this.entropy.generateIdentifier();
    } while (this.mapping.has(name) || this.isCollision(name));
    
    return name;
  }

  isCollision(name) {
    // Check for potential collisions
    const patterns = ['getfenv', 'setfenv', 'loadstring', 'require'];
    return patterns.some(pattern => name.includes(pattern));
  }
}