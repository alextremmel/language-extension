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
        word: value.word ? value.word.replace(/_/g, " ") : "" // Replace underscores with spaces
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
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Highlights words on the page based on the provided word list.
 * @param {object} wordList - The processed list of words to highlight.
 * @param {HTMLElement} [root=document.body] - The root element to search for words within.
 */
function highlightWords(wordList, root = document.body) {
  const wordsArray = Object.values(wordList);
  if (wordsArray.length === 0 || !root) return;

  // Sort words so that longer phrases are matched before shorter ones
  // This helps prevent issues where a shorter word within a longer phrase gets matched first
  wordsArray.sort((a, b) => b.word.length - a.word.length);

  // Create a mapping for case-insensitive matching, storing the original data
  const wordMap = {};
  wordsArray.forEach(item => {
    if (item.word) { // Ensure word is defined
        wordMap[item.word.toLowerCase()] = item;
    }
  });

  // Build a regex pattern with global and case-insensitive flags
  // Only include words that are defined
  const definedWords = wordsArray.filter(item => item.word).map(item => escapeRegExp(item.word));
  if (definedWords.length === 0) return; // No words to highlight

  const pattern = new RegExp(definedWords.join("|"), "gi");

  // Traverse all text nodes in the given root element
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Reject nodes within certain tags or contentEditable elements
        if (node.parentNode) {
          const tagName = node.parentNode.nodeName.toUpperCase();
          if (["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "OBJECT", "EMBED", "TEXTAREA", "INPUT"].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.parentNode.isContentEditable) {
            return NodeFilter.FILTER_REJECT;
          }
          // Avoid re-highlighting already highlighted content
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
    // Skip if the parent is already highlighted (double check for nodes added to fragment)
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

        // Add the text before the match
        if (matchStart > lastIndex) {
          fragment.appendChild(document.createTextNode(originalText.slice(lastIndex, matchStart)));
        }

        // Add the highlighted match
        const wordData = wordMap[matchedWordText.toLowerCase()]; // Get data using case-insensitive match
        if (wordData) {
          const span = document.createElement("span");
          span.className = `highlighted-word highlight-level-${wordData.level}`;
          span.title = wordData.definition || ""; // Ensure definition is not undefined
          span.textContent = matchedWordText; // Use the originally cased text from the document
          fragment.appendChild(span);
        } else {
          // Should not happen if wordMap is built correctly, but as a fallback:
          fragment.appendChild(document.createTextNode(matchedWordText));
        }
        lastIndex = matchEnd;
      });

      // Add the remaining text after the last match
      if (lastIndex < originalText.length) {
        fragment.appendChild(document.createTextNode(originalText.slice(lastIndex)));
      }

      // Replace the original text node with the fragment containing highlighted parts
      if (node.parentNode) {
        node.parentNode.replaceChild(fragment, node);
      }
    }
  });
}