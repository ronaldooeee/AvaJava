// baseline code from Iki

class Block {

  constructor(statements) {
    this.statements = statements;
  }

  toString() {
    return "(Block " + (this.statements.join(' ')) + ")";
  };

  analyze(context) {
    var i, len, localContext, ref, results, statement;
    localContext = context.createChildContext();
    ref = this.statements;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      statement = ref[i];
      results.push(statement.analyze(localContext));
    }
    return results;
  };

  optimize() {
    var s;
    this.statements = (function() {
      var i, len, ref, results;
      ref = this.statements;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        s = ref[i];
        results.push(s.optimize());
      }
      return results;
    }).call(this);
    this.statements = (function() {
      var i, len, ref, results;
      ref = this.statements;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        s = ref[i];
        if (s !== null) {
          results.push(s);
        }
      }
      return results;
    }).call(this);
    return this;
  };

}

module.exports = function () {
  return Block;
}