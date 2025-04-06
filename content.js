let currentWordList = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "highlightWords") {
    currentWordList = processWordList(message.wordList); // Process the word list
    highlightWords(currentWordList);
  }
});

// Function to process the word list and replace underscores with spaces
function processWordList(wordList) {
  const processedList = {};
  Object.entries(wordList).forEach(([key, value]) => {
    processedList[key] = {
      ...value,
      word: value.word.replace(/_/g, " ") // Replace underscores with spaces
    };
  });
  return processedList;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightWords(wordList) {
  const wordsArray = Object.values(wordList);
  if (wordsArray.length === 0) return;

  // Sort words so that longer phrases are matched before shorter ones
  wordsArray.sort((a, b) => b.word.length - a.word.length);

  // Create a mapping for case-insensitive matching
  const wordMap = {};
  wordsArray.forEach(item => {
    wordMap[item.word.toLowerCase()] = item;
  });

  // Build a regex pattern with global and case-insensitive flags
  const escapedWords = wordsArray.map(item => escapeRegExp(item.word));
  const pattern = new RegExp(escapedWords.join("|"), "gi");

  // Traverse all text nodes in the document
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        if (node.parentNode) {
          const tagName = node.parentNode.nodeName;
          if (["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "OBJECT", "EMBED", "TEXTAREA"].includes(tagName)) {
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
    if (currentNode.parentNode && currentNode.parentNode.closest('.highlighted-word')) {
      continue;
    }
    textNodes.push(currentNode);
  }

  textNodes.forEach(node => {
    const originalText = node.textContent;
    const matches = [...originalText.matchAll(pattern)];

    if (matches.length > 0) {
      const fragments = [];
      let lastIndex = 0;

      matches.forEach(match => {
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;

        // Add the text before the match
        if (matchStart > lastIndex) {
          fragments.push(document.createTextNode(originalText.slice(lastIndex, matchStart)));
        }

        // Add the highlighted match
        const wordData = wordMap[match[0].toLowerCase()];
        if (wordData) {
          const span = document.createElement("span");
          span.className = `highlighted-word highlight-level-${wordData.level}`;
          span.title = wordData.definition;

          // Only highlight the actual word, not the surrounding spaces
          const matchText = match[0];
          const trimmedMatch = matchText.trim(); // Remove spaces from the match
          const leadingSpaces = matchText.slice(0, matchText.indexOf(trimmedMatch));
          const trailingSpaces = matchText.slice(matchText.indexOf(trimmedMatch) + trimmedMatch.length);

          // Add leading spaces as plain text
          if (leadingSpaces) {
            fragments.push(document.createTextNode(leadingSpaces));
          }

          // Add the highlighted word
          span.textContent = trimmedMatch;
          fragments.push(span);

          // Add trailing spaces as plain text
          if (trailingSpaces) {
            fragments.push(document.createTextNode(trailingSpaces));
          }
        }

        lastIndex = matchEnd;
      });

      // Add the remaining text after the last match
      if (lastIndex < originalText.length) {
        fragments.push(document.createTextNode(originalText.slice(lastIndex)));
      }

      // Replace the original text node with the fragments
      const parent = node.parentNode;
      fragments.forEach(fragment => parent.insertBefore(fragment, node));
      parent.removeChild(node);
    }
  });
}

function applyHighlighting(root = document.body) {
  highlightWords(currentWordList);
}

// Set up a MutationObserver to watch for added nodes and apply highlighting to dynamic content
const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          applyHighlighting(node);
        }
      });
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });