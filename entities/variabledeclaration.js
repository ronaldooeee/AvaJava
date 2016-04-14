"use strict";

var Type = require('./type.js');

var VariableDeclaration = (function() {
  function VariableDeclaration(id, exp) { // , type) {
    console.log("alskdjfl;kasjdflkajs  : " + id.lexeme);
    this.id = id;
    this.exp = exp;
    this.type = this.exp ? this.exp.type : Type.ARBITRARY;
   
    // this needs to receive a type from parser
    // implement type inference, literals parsed with types,
    // function's type-signatures determined by their args and return types
  }

  VariableDeclaration.prototype.getExp = function() {
    return this.exp;
  };
  
  VariableDeclaration.prototype.toString = function() {
    if (this.exp) {
      return "(var " + this.id.lexeme + " " + this.exp + " )"; // this.type + ")";
    } else {
      return "(var " + this.id.lexeme + " )";
    }
  };

  VariableDeclaration.prototype.analyze = function(context) {
    // need to account for if variable is a single number
    // a list of expressions
    // or a function

    // Type inference in here!!!
    // Swift: once type is inferred, type cannot change
    var results = [];
    context.variableMustNotBeAlreadyDeclared(this.id);
    results.push(context.addVariable(this.id.lexeme, this)); // adds var to symbol table and returns symbol table
    console.log("--------inside varDecl analyze-------");
    console.log("current variable: " + this.exp);
    if (this.exp) {
      if (this.exp instanceof Array) {
          console.log("........INSIDE THIS.EXP...... " + this.exp.length);
          for (var i = 0; i < this.exp.length; i++) {
            results.push(this.exp[i].analyze(context));
          }
      } else {
        results.push(this.exp.analyze(context));
      }
    }
    return results;
  };

  VariableDeclaration.prototype.optimize = function() {
    return this;
  };

  return VariableDeclaration;

})();

VariableDeclaration.ARBITRARY = new VariableDeclaration('<arbitrary>', Type.ARBITRARY);

module.exports = VariableDeclaration;