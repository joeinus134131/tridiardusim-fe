export const arduinoLanguageDefinition = {
  // Set defaultToken to invalid to see what you do not tokenize yet
  defaultToken: 'invalid',

  keywords: [
    'setup', 'loop', 'pinMode', 'digitalWrite', 'digitalRead',
    'analogReference', 'analogRead', 'analogWrite', 'analogReadResolution', 'analogWriteResolution',
    'tone', 'noTone', 'shiftOut', 'shiftIn', 'pulseIn',
    'millis', 'micros', 'delay', 'delayMicroseconds',
    'min', 'max', 'abs', 'constrain', 'map', 'pow', 'sqrt',
    'sin', 'cos', 'tan', 'isAlphaNumeric', 'isAlpha', 'isAscii', 'isWhitespace',
    'isControl', 'isDigit', 'isGraph', 'isLowerCase', 'isPrintable',
    'isPunct', 'isSpace', 'isUpperCase', 'isHexadecimalDigit',
    'randomSeed', 'random', 'bitRead', 'bitWrite', 'bitSet', 'bitClear', 'bit',
    'highByte', 'lowByte', 'attachInterrupt', 'detachInterrupt', 'interrupts', 'noInterrupts',
    'Serial', 'begin', 'end', 'available', 'read', 'peek', 'flush', 'print', 'println', 'write',
    'if', 'else', 'for', 'switch', 'case', 'while', 'do', 'break', 'continue', 'return', 'goto',
    '#define', '#include'
  ],

  typeKeywords: [
    'boolean', 'byte', 'char', 'double', 'float', 'int', 'long', 'short', 'string', 'String', 'unsigned', 'void', 'word'
  ],

  constants: [
    'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN', 'true', 'false'
  ],

  operators: [
    '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
    '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
    '<<', '>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
    '%=', '<<=', '>>='
  ],

  // we include these common regular expressions
  symbols:  /[=><!~?:&|+\-*\/\^%]+/,

  // C# style strings
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  // The main tokenizer for our languages
  tokenizer: {
    root: [
      // identifiers and keywords
      [/[a-z_$][\w$]*/, { cases: { '@typeKeywords': 'keyword',
                                   '@keywords': 'keyword',
                                   '@constants': 'constant',
                                   '@default': 'identifier' } }],
      [/[A-Z][\w\$]*/, 'type.identifier' ],  // to show class names nicely

      // whitespace
      { include: '@whitespace' },

      // delimiters and operators
      [/[{}()\[\]]/, '@brackets'],
      [/[<>](?!@symbols)/, '@brackets'],
      [/@symbols/, { cases: { '@operators': 'operator',
                              '@default'  : '' } } ],

      // numbers
      [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
      [/0[xX][0-9a-fA-F]+/, 'number.hex'],
      [/\d+/, 'number'],

      // delimiter: after number because of .\d floats
      [/[;,.]/, 'delimiter'],

      // strings
      [/"([^"\\]|\\.)*$/, 'string.invalid' ],  // non-teminated string
      [/"/,  { token: 'string.quote', bracket: '@open', next: '@string' } ],

      // characters
      [/'[^\\']'/, 'string'],
      [/(')(@escapes)(')/, ['string','string.escape','string']],
      [/'/, 'string.invalid']
    ],

    comment: [
      [/[^\/*]+/, 'comment' ],
      [/\/\*/,    'comment', '@push' ],    // nested comment
      ["\\*/",    'comment', '@pop'  ],
      [/[\/*]/,   'comment' ]
    ],

    string: [
      [/[^\\"]+/,  'string'],
      [/@escapes/, 'string.escape'],
      [/\\./,      'string.escape.invalid'],
      [/"/,        { token: 'string.quote', bracket: '@close', next: '@pop' } ]
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/\/\*/,       'comment', '@comment' ],
      [/\/\/.*$/,    'comment'],
    ],
  },
};

export const arduinoLanguageConfig = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string'] },
    { open: "'", close: "'", notIn: ['string', 'comment'] },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
};
