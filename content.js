// content.js

let currentWordList = {}; // This will be populated by processWordList from shared/highlight.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "highlightWords" && message.wordList) {
    // processWordList is now available globally from shared/highlight.js
    currentWordList = processWordList(message.wordList);
    debouncedApplyHighlighting();
    sendResponse({ status: "Highlighting initiated" });
  }
  return true; // Keep the message channel open for asynchronous response
});

// Debounced function to reduce redundant highlighting calls
const debouncedApplyHighlighting = debounce(() => {
  // highlightWords is now available globally from shared/highlight.js
  if (Object.keys(currentWordList).length > 0) {
    highlightWords(currentWordList, document.body);
  }
}, 300);

function applyHighlightingToNode(rootNode) {
  if (Object.keys(currentWordList).length > 0) {
    // highlightWords is now available globally from shared/highlight.js
    highlightWords(currentWordList, rootNode);
  }
}

// Debounce utility function
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Set up a MutationObserver to watch for added nodes and apply highlighting to dynamic content
const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach(node => {
        // Only apply to element nodes, and avoid running on script/style tags
        if (node.nodeType === Node.ELEMENT_NODE &&
            node.nodeName !== 'SCRIPT' &&
            node.nodeName !== 'STYLE') {
          applyHighlightingToNode(node);
        }
      });
    }
  });
});

// Start observing the document body for changes
observer.observe(document.body, { childList: true, subtree: true });

// Initial highlighting attempt when the script loads,
// in case words are already available from background script via startup message or tab update.
// This relies on background.js sending words upon tab completion.
// No need to explicitly call chrome.runtime.sendMessage here for initial load,
// as background.js handles sending words on tab updates.