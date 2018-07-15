const isEndOfTag = char => char === '>';
const isStartOfTag = char => char === '<';
const isWhitespace = char => /^\s+$/.test(char);
const isTag = token => /^\s*<[^>]+>\s*$/.test(token);
const isntTag = token => !isTag(token);

class Match {
  constructor(startInBefore, startInAfter, length) {
    this.startInBefore = startInBefore;
    this.startInAfter = startInAfter;
    this.length = length;
    this.endInBefore = this.startInBefore + this.length - 1;
    this.endInAfter = this.startInAfter + this.length - 1;
  }
}

const htmlToTokens = function(html) {
  let mode = 'char';
  let currentWord = '';
  const words = [];

  for (let char of Array.from(html)) {
    switch (mode) {
      case 'tag':
        if (isEndOfTag(char)) {
          currentWord += '>';
          words.push(currentWord);
          currentWord = '';
          if (isWhitespace(char)) {
            mode = 'whitespace';
          } else {
            mode = 'char';
          }
        } else {
          currentWord += char;
        }
        break;
      case 'char':
        if (isStartOfTag(char)) {
          if (currentWord) {
            words.push(currentWord);
          }
          currentWord = '<';
          mode = 'tag';
        } else if (/\s/.test(char)) {
          if (currentWord) {
            words.push(currentWord);
          }
          currentWord = char;
          mode = 'whitespace';
        } else if (/[\w\#@]+/i.test(char)) {
          currentWord += char;
        } else {
          if (currentWord) {
            words.push(currentWord);
          }
          currentWord = char;
        }
        break;
      case 'whitespace':
        if (isStartOfTag(char)) {
          if (currentWord) {
            words.push(currentWord);
          }
          currentWord = '<';
          mode = 'tag';
        } else if (isWhitespace(char)) {
          currentWord += char;
        } else {
          if (currentWord) {
            words.push(currentWord);
          }
          currentWord = char;
          mode = 'char';
        }
        break;
      default:
        throw new Error(`Unknown mode ${mode}`);
    }
  }

  if (currentWord) {
    words.push(currentWord);
  }
  return words;
};

const findMatch = function(beforeTokens, afterTokens, indexOfBeforeLocationsInAfterTokens, startInBefore, endInBefore, startInAfter, endInAfter) {
  let match;
  let bestMatchInBefore = startInBefore;
  let bestMatchInAfter = startInAfter;
  let bestMatchLength = 0;

  let matchLengthAt = {};

  for (let indexInBefore = startInBefore, end = endInBefore, asc = startInBefore <= end; asc ? indexInBefore < end : indexInBefore > end; asc ? indexInBefore++ : indexInBefore--) {
    const newMatchLengthAt = {};
    const lookingFor = beforeTokens[indexInBefore];
    const locationsInAfter = indexOfBeforeLocationsInAfterTokens[lookingFor];

    for (let indexInAfter of Array.from(locationsInAfter)) {
      if (indexInAfter < startInAfter) {
        continue;
      }
      if (indexInAfter >= endInAfter) {
        break;
      }

      if (matchLengthAt[indexInAfter - 1] == null) {
        matchLengthAt[indexInAfter - 1] = 0;
      }
      const newMatchLength = matchLengthAt[indexInAfter - 1] + 1;
      newMatchLengthAt[indexInAfter] = newMatchLength;

      if (newMatchLength > bestMatchLength) {
        bestMatchInBefore = indexInBefore - newMatchLength + 1;
        bestMatchInAfter = indexInAfter - newMatchLength + 1;
        bestMatchLength = newMatchLength;
      }
    }

    matchLengthAt = newMatchLengthAt;
  }

  if (bestMatchLength !== 0) {
    match = new Match(bestMatchInBefore, bestMatchInAfter, bestMatchLength);
  }

  return match;
};

var recursivelyFindMatchingBlocks = function(beforeTokens, afterTokens, indexOfBeforeLocationsInAfterTokens, startInBefore, endInBefore, startInAfter, endInAfter, matchingBlocks) {
  const match = findMatch(beforeTokens, afterTokens, indexOfBeforeLocationsInAfterTokens, startInBefore, endInBefore, startInAfter, endInAfter);

  if (match != null) {
    if (startInBefore < match.startInBefore && startInAfter < match.startInAfter) {
      recursivelyFindMatchingBlocks(
        beforeTokens,
        afterTokens,
        indexOfBeforeLocationsInAfterTokens,
        startInBefore,
        match.startInBefore,
        startInAfter,
        match.startInAfter,
        matchingBlocks
      );
    }

    matchingBlocks.push(match);

    if (match.endInBefore <= endInBefore && match.endInAfter <= endInAfter) {
      recursivelyFindMatchingBlocks(
        beforeTokens,
        afterTokens,
        indexOfBeforeLocationsInAfterTokens,
        match.endInBefore + 1,
        endInBefore,
        match.endInAfter + 1,
        endInAfter,
        matchingBlocks
      );
    }
  }

  return matchingBlocks;
};

const createIndex = function(p) {
  if (p.findThese == null) {
    throw new Error('params must have findThese key');
  }
  if (p.inThese == null) {
    throw new Error('params must have inThese key');
  }

  const index = {};
  for (let token of Array.from(p.findThese)) {
    index[token] = [];
    let idx = p.inThese.indexOf(token);
    while (idx !== -1) {
      index[token].push(idx);
      idx = p.inThese.indexOf(token, idx + 1);
    }
  }

  return index;
};

const findMatchingBlocks = function(beforeTokens, afterTokens) {
  const matchingBlocks = [];
  const indexOfBeforeLocationsInAfterTokens = createIndex({
    findThese: beforeTokens,
    inThese: afterTokens
  });

  return recursivelyFindMatchingBlocks(beforeTokens, afterTokens, indexOfBeforeLocationsInAfterTokens, 0, beforeTokens.length, 0, afterTokens.length, matchingBlocks);
};

const calculateOperations = function(beforeTokens, afterTokens) {
  var actionMap,
    actionUpToMatchPositions,
    i,
    index,
    isSingleWhitespace,
    j,
    lastOp,
    len,
    len1,
    match,
    matchStartsAtCurrentPositionInAfter,
    matchStartsAtCurrentPositionInBefore,
    matches,
    op,
    operations,
    positionInAfter,
    positionInBefore,
    postProcessed;
  if (beforeTokens == null) {
    throw new Error('beforeTokens?');
  }
  if (afterTokens == null) {
    throw new Error('afterTokens?');
  }
  positionInBefore = positionInAfter = 0;
  operations = [];
  actionMap = {
    'false,false': 'replace',
    'true,false': 'insert',
    'false,true': 'delete',
    'true,true': 'none'
  };
  matches = findMatchingBlocks(beforeTokens, afterTokens);
  matches.push(new Match(beforeTokens.length, afterTokens.length, 0));
  for (index = i = 0, len = matches.length; i < len; index = ++i) {
    match = matches[index];
    matchStartsAtCurrentPositionInBefore = positionInBefore === match.startInBefore;
    matchStartsAtCurrentPositionInAfter = positionInAfter === match.startInAfter;
    actionUpToMatchPositions = actionMap[[matchStartsAtCurrentPositionInBefore, matchStartsAtCurrentPositionInAfter].toString()];
    if (actionUpToMatchPositions !== 'none') {
      operations.push({
        action: actionUpToMatchPositions,
        startInBefore: positionInBefore,
        endInBefore: actionUpToMatchPositions !== 'insert' ? match.startInBefore - 1 : void 0,
        startInAfter: positionInAfter,
        endInAfter: actionUpToMatchPositions !== 'delete' ? match.startInAfter - 1 : void 0
      });
    }
    if (match.length !== 0) {
      operations.push({
        action: 'equal',
        startInBefore: match.startInBefore,
        endInBefore: match.endInBefore,
        startInAfter: match.startInAfter,
        endInAfter: match.endInAfter
      });
    }
    positionInBefore = match.endInBefore + 1;
    positionInAfter = match.endInAfter + 1;
  }
  postProcessed = [];
  lastOp = {
    action: 'none'
  };
  isSingleWhitespace = function(op) {
    if (op.action !== 'equal') {
      return false;
    }
    if (op.endInBefore - op.startInBefore !== 0) {
      return false;
    }
    return /^\s$/.test(beforeTokens.slice(op.startInBefore, +op.endInBefore + 1 || 9e9));
  };
  for (j = 0, len1 = operations.length; j < len1; j++) {
    op = operations[j];
    if ((isSingleWhitespace(op) && lastOp.action === 'replace') || (op.action === 'replace' && lastOp.action === 'replace')) {
      lastOp.endInBefore = op.endInBefore;
      lastOp.endInAfter = op.endInAfter;
    } else {
      postProcessed.push(op);
      lastOp = op;
    }
  }
  return postProcessed;
};

const consecutiveWhere = function(start, content, predicate) {
  content = content.slice(start, +content.length + 1 || undefined);
  let lastMatchingIndex = undefined;

  for (let index = 0; index < content.length; index++) {
    const token = content[index];
    const answer = predicate(token);
    if (answer === true) {
      lastMatchingIndex = index;
    }
    if (answer === false) {
      break;
    }
  }

  if (lastMatchingIndex != null) {
    return content.slice(0, +lastMatchingIndex + 1 || undefined);
  }
  return [];
};

const wrap = function(tag, content) {
  let rendering = '';
  let position = 0;
  const { length } = content;

  while (true) {
    if (position >= length) {
      break;
    }
    const nonTags = consecutiveWhere(position, content, isntTag);
    position += nonTags.length;
    if (nonTags.length !== 0) {
      rendering += `<${tag}>${nonTags.join('')}</${tag}>`;
    }

    if (position >= length) {
      break;
    }
    const tags = consecutiveWhere(position, content, isTag);
    position += tags.length;
    rendering += tags.join('');
  }

  return rendering;
};

const opMap = {
  equal(op, beforeTokens, afterTokens) {
    return beforeTokens.slice(op.startInBefore, +op.endInBefore + 1 || undefined).join('');
  },

  insert(op, beforeTokens, afterTokens) {
    const val = afterTokens.slice(op.startInAfter, +op.endInAfter + 1 || undefined);
    return wrap('ins', val);
  },

  delete(op, beforeTokens, afterTokens) {
    const val = beforeTokens.slice(op.startInBefore, +op.endInBefore + 1 || undefined);
    return wrap('del', val);
  }
};

opMap.replace = (op, beforeTokens, afterTokens) => opMap.delete(op, beforeTokens, afterTokens) + opMap.insert(op, beforeTokens, afterTokens);

const renderOperations = function(beforeTokens, afterTokens, operations) {
  let rendering = '';
  for (let op of Array.from(operations)) {
    rendering += opMap[op.action](op, beforeTokens, afterTokens);
  }

  return rendering;
};

export const diff = function(before, after) {
  if (before === after) {
    return before;
  }

  before = htmlToTokens(before);
  after = htmlToTokens(after);

  const ops = calculateOperations(before, after);

  return renderOperations(before, after, ops);
};

diff.htmlToTokens = htmlToTokens;
diff.findMatchingBlocks = findMatchingBlocks;
findMatchingBlocks.findMatch = findMatch;
findMatchingBlocks.createIndex = createIndex;
diff.calculateOperations = calculateOperations;
diff.renderOperations = renderOperations;
