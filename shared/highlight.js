// shared/highlight.js

/**
 * Processes the word list and replaces underscores with spaces in words.
 * @param {object} wordList - The raw word list object.
 * @returns {object} - The processed word list.
 */
function processWordList(wordList) {
  const processedList = {};
  if (wordList) {
    Object.entries(wordList).forEach(([key, value]) => {
      processedList[key] = {
        ...value,
        word: value && value.word ? value.word.replace(/_/g, " ") : ""
      };
    });
  }
  return processedList;
}

/**
 * Escapes special characters in a string for use in a regular expression.
 * @param {string} string - The input string.
 * @returns {string} - The string with special characters escaped.
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlights words on the page based on the provided word list.
 * @param {object} wordList - The processed list of words to highlight.
 * @param {HTMLElement} [root=document.body] - The root element to search for words within.
 */
function highlightWords(wordList, root = document.body) {
  if (!root) {
    return;
  }
  if (!wordList || Object.keys(wordList).length === 0) {
    return;
  }

  const wordsArray = Object.values(wordList).filter(item => item && typeof item.word === 'string' && item.word.trim() !== '');

  if (wordsArray.length === 0) {
      return;
  }

  wordsArray.sort((a, b) => b.word.length - a.word.length);

  const wordMap = {};
  wordsArray.forEach(item => {
    wordMap[item.word.toLowerCase()] = item;
  });

  const escapedWords = wordsArray.map(item => escapeRegExp(item.word));
  if (escapedWords.length === 0) {
    return;
  }
  const pattern = new RegExp(escapedWords.join("|"), "gi");

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        if (node.parentNode) {
          const tagName = node.parentNode.nodeName.toUpperCase();
          if (["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "OBJECT", "EMBED", "TEXTAREA", "INPUT"].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.parentNode.isContentEditable) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.parentNode.classList && node.parentNode.classList.contains('highlighted-word')) {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  let currentNode;
  while (currentNode = walker.nextNode()) {
    textNodes.push(currentNode);
  }

  textNodes.forEach(node => {
    if (node.parentNode && node.parentNode.classList && node.parentNode.classList.contains('highlighted-word')) {
        return;
    }

    const originalText = node.textContent;
    if (!originalText) return;

    const matches = [...originalText.matchAll(pattern)];

    if (matches.length > 0) {
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      matches.forEach(match => {
        const matchedWordText = match[0];
        const matchStart = match.index;
        const matchEnd = matchStart + matchedWordText.length;

        if (matchStart > lastIndex) {
          fragment.appendChild(document.createTextNode(originalText.slice(lastIndex, matchStart)));
        }

        const wordData = wordMap[matchedWordText.toLowerCase()];
        if (wordData) {
          const span = document.createElement("span");
          span.className = `highlighted-word highlight-level-${wordData.level}`;
          span.title = wordData.definition || "";
          span.textContent = matchedWordText;
          fragment.appendChild(span);
        } else {
          fragment.appendChild(document.createTextNode(matchedWordText));
        }
        lastIndex = matchEnd;
      });

      if (lastIndex < originalText.length) {
        fragment.appendChild(document.createTextNode(originalText.slice(lastIndex)));
      }

      if (node.parentNode) {
        node.parentNode.replaceChild(fragment, node);
      }
    }
  });
}