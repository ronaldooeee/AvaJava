var fs = require('fs');
var byline = require('byline');
var XRegExp = require('xregexp');
var error = require('../error.js');

// var LETTER = XRegExp('[\\p{L}]');
var LETTER = /[A-Za-z]/;
// var DIGIT = XRegExp('[\\p{Nd}]');
var DIGIT = /[0-9]/;
// var WORD_CHAR = XRegExp('[\\p{L}\\p{Nd}_]');
var WORD_CHAR = /[A-Za-z_]/;
var KEYWORDS = /^(?:var|while|and|or|not|true|false|return|for|each|if|then|else|in|both|ava|end|times)$/;
var oneCharacterTokens = /["+\-*\/()\[\]{},:;=\<\>\%\@\.\!\#]/;
var twoCharacterTokens = /<=|==|>=|!=|\+=|\-=|\*=|\/=|\+\+|\-\-|\^\^|::|\.\.|\->/;
var threeCharacterTokens = /\.\.\.|\*\*\*/;
var intlit = /^\d+$/;
var FLOAT = /(\.\d+|\d+(\.\d+)?)([Ee][+-]?(\d)+)?/;

// When other files, such as test-scanner, require scanner.js,
// module.exports is the function that they require
// so in test-scanner, module.exports is being required into a 
// variable named "scan", in the first describe-it sequence of tests,
// notice that in the first "it" the "scan" variable is being called,
// and filename and callback function are being passed in
module.exports = function(filename, callback) {
  // setting up the scanning action
  var baseStream = fs.createReadStream(filename, { encoding: 'utf8' });
  baseStream.on('error', function(err) {
    return error(err);
  });

  // setting it to scan line by line
  var stream = byline(baseStream, { keepEmptyLines: true });
  var tokens = [];
  var linenumber = 1;
  console.log("*******************SCANNER*****************");
  // the 'readable' event is received when data can be read 
  // from the stream, the stream passes data to the callback function
  stream.on('readable', function() {
    // read in the next line and send it to the scan function
    // defined later in scanner.js
    // return the tokens that scan returns
    // the read() function reads data from the internal buffer
    // when there is nothing to read it returns null
    return scan(stream.read(), linenumber++, tokens);
  });
    // the stream looks for the 'end' event to stop reading,
    // if it encounters it, the last token pushed into tokens
    // is the EOF (End Of File) token
  return stream.once('end', function() {
    tokens.push({
      kind: 'EOF',
      lexeme: 'EOF'
    });
    return callback(processMultiLineComments(tokens));
  });
};

var containsInterpolation = function (string) {
  // later may want to consider string interpolation with backticks
  // (javascript's string interpolation)
  var start = 0;
  var pos = 0;
  var containsInterp = false;
  var interpString = "";
  console.log("inside containsInterpolation: " + string);
  while (pos < string.length) {
    if (string[pos] === "#" && string[pos + 1] === "{") {
      start = pos;
      while (pos < string.length && string[pos] !== "}") {
        pos++;
      }
      if (pos + 1 >= string.length && string[pos] !== "}") {
        break;
      } else {
        pos++;
        interpString = string.substring(start, pos);
        console.log("......." + interpString);
        containsInterp = true;
      }
    } else {
      pos++;
    }
  }
  return containsInterp;
}

var processStringInterpolation = function (string, linenumber, strStart, tokens) {
  // later may want to consider string interpolation with backticks
  // (javascript's string interpolation)
  var start = 0;
  var pos = 0;
  var front = "";
  var rest = "";
  var interpString = "";
  console.log("inside processString: " + string);
  while (pos < string.length) {
    if (string[pos] === "#" && string[pos + 1] === "{") {
      start = pos;
      while (pos < string.length && string[pos] !== "}") {
        pos++;
      }
      pos++;
      front = string.substring(0, start);
      rest = string.substring(pos, string.length);
      interpString = string.substring(start, pos);
      console.log("......." + interpString);
    } else {
      pos++;
    }
  }
  interpString = interpString.replace("#{", "");
  interpString = interpString.replace("}", "");
  // need to check if integer as well
  console.log("after finding interpolation: " + interpString);
  var spaces = strStart + front.length + 2;
  tokens.push({ kind: 'stringlit', lexeme: front + "\"", line: linenumber, col: strStart });
  tokens.push({ kind: '+', lexeme: '+', line: linenumber, col: spaces }); // add a space between chars
  tokens.push({ kind: 'id', lexeme: interpString, line: linenumber, col: spaces + 2 });
  tokens.push({ kind: '+', lexeme: '+', line: linenumber, col: spaces + 2 + interpString.length + 1 });
  tokens.push({ kind: 'stringlit', lexeme: "\"" + rest, line: linenumber, col: spaces + 2 + interpString.length + 3 });
  // return string;
}
var processMultiLineComments = function (tokens) {
  // processing multi-line comments
    var index = 0;
    var inside = false;
    var firstIndex = 0;
    var numElementsToDelete = 0;
    while (index < tokens.length) {
      if (tokens[index].lexeme === "***" && !inside) {
        firstIndex = index;
        numElementsToDelete++;
        inside = true;
        index++;
      }
      if (tokens[index].lexeme === "***" && inside) {
        tokens.splice(firstIndex, numElementsToDelete + 1);
        index = 0;
        inside = false;
        firstIndex = 0;
        numElementsToDelete = 0;
      } else {
        if (inside) {
          numElementsToDelete++;
        }
        index++;
      }
    }
    // for debugging
    // console.log("---inside processMultiLineComments---");
    console.log(tokens);
  return tokens;
}
// when module.exports calls this scan function, it passes
// in an entire line of symbols stored in an array (including
// space, tab, and newline characters)
var scan = function (line, lineNumber, tokens) {
  if (!line) {
    return;
  } else {
    var start = 0;
    var pos = 0;
    // function that will store token data to be outputted by the scanner
    // as a whole
    var emit = function (kind, lexeme) {
                      // if no lexeme given, lexeme is same as kind
      tokens.push({ kind: kind, lexeme: (lexeme || kind), line: lineNumber, col: start+1 });
    }
    var substring = "";

    while (true) {
      // skip spaces
      while (/\s/.test(line[pos])) {
        pos++;
      }

      start = pos;

      // if reached end of line, leave while loop
      if (pos >= line.length) {
        break;
      }
      // if reached comments in the line, leave while loop
      if (line[pos] === '/' && line[pos + 1] === '/') {
        break;
      }

      // checking for 1, 2, and 3 symbol groups to tokenize
      // checks them against regular expressions defined above
      if (threeCharacterTokens.test(line.substring(pos, pos + 3))) {
        emit(line.substring(pos, pos + 3));
        pos += 3;
      } else if (twoCharacterTokens.test(line.substring(pos, pos + 2))) {
        emit(line.substring(pos, pos + 2));
        pos += 2;
      } else if (oneCharacterTokens.test(line[pos])) {
        var string = "";
        var encounteredString = false;
        if (/"/.test(line[pos])) {
          encounteredString = true;
          start = pos;
          pos++
          while (!/"/.test(line[pos]) && pos < line.length) {
            pos++;
          }
          pos++;
          string = line.substring(start, pos); // substring excludes the char at the end
          // returns everything behind the current pos
          if (containsInterpolation(string)) {
            processStringInterpolation(string, lineNumber, start, tokens);
          } else {
            emit("stringlit", string);
          }
        }
        if (oneCharacterTokens.test(line[pos])) {
          emit(line[pos]);
          pos++;
        }
      } else if (LETTER.test(line[pos])) {
        while (WORD_CHAR.test(line[pos]) && pos < line.length) {
          pos++;
        }
        word = line.substring(start, pos);
        emit((KEYWORDS.test(word) ? word : 'id'), word);
      } else if (DIGIT.test(line[pos])) {


        start = pos;
        pos++;

        // start collecting first set of digits
        while (!oneCharacterTokens.test(line[pos]) && !/\s/.test(line[pos]) && pos < line.length) {
          pos++;
        }

        // ***
        // Hard coding scientific notation and floating point for now
        // ***

        // if scientific notation, should be an E or e in the position before the
        // current position at this point
        // Lookbehind and Lookahead
        var scientificNotation = false;
        if (/[+\-]/.test(line[pos])) {
          // if valid sci notation, do same loop as before
          if (/[Ee]/.test(line[pos - 1]) && DIGIT.test(line[pos + 1])) {
            pos++;
            while (!oneCharacterTokens.test(line[pos]) && !/\s/.test(line[pos]) && pos < line.length) {
              pos++;
            }
          }
        }
        // floating point numbers
        if (/[.]/.test(line[pos]) && DIGIT.test(line[pos + 1])) {
          pos++;
          while (!oneCharacterTokens.test(line[pos]) && !/\s/.test(line[pos]) && pos < line.length) {
              pos++;
          }
        }

        // see what we have
        var substring = line.substring(start, pos);
        if (intlit.test(substring)) {
          emit('intlit', substring);
        } else {
          emit('floatlit', substring);
        } 
      } else {
        error("Illegal character: " + line[pos], {
          line: lineNumber,
          col: pos + 1
        });
        pos++;
      }
    }
    // for debugging
    // console.log("---inside scanner.js scan---");
    // console.log(tokens);
  }
}