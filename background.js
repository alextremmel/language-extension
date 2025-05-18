// background.js

let cachedWords = null;

// Function to initialize or refresh the cachedWords from storage
function refreshCachedWords(callback) {
  chrome.storage.local.get("words", (data) => {
    if (chrome.runtime.lastError) {
      cachedWords = {}; // Default to empty if error
    } else {
      cachedWords = data.words || {};
    }
    if (callback) callback();
  });
}

// Cache words on extension installation/update and browser startup
chrome.runtime.onInstalled.addListener(() => {
  refreshCachedWords();
  // Create context menu
  chrome.contextMenus.create({
    id: "openWordList",
    title: "Open Word List",
    contexts: ["action"]
  });
});

chrome.runtime.onStartup.addListener(() => {
  refreshCachedWords();
});

// Update cache when words are modified
function updateLocalCacheAndNotify(newWordsData) {
  cachedWords = newWordsData;
}

// Add a word to the list
function addWord(wordData, callback) {
  chrome.storage.local.get("words", (data) => {
    const words = data.words || {};
    const newId = Date.now().toString();
    wordData.dateAdded = new Date().toISOString();
    words[newId] = wordData;

    chrome.storage.local.set({ words }, () => {
      if (chrome.runtime.lastError) {
        if (callback) callback(null, chrome.runtime.lastError);
        return;
      }
      updateLocalCacheAndNotify(words);
      if (callback) callback(newId);
    });
  });
}

// Delete a word from the list
function deleteWord(wordId, callback) {
  chrome.storage.local.get("words", (data) => {
    const words = data.words || {};
    if (words[wordId]) {
      delete words[wordId];
      chrome.storage.local.set({ words }, () => {
        if (chrome.runtime.lastError) {
          if (callback) callback(chrome.runtime.lastError);
          return;
        }
        updateLocalCacheAndNotify(words);
        if (callback) callback();
      });
    } else {
      if (callback) callback();
    }
  });
}

// Edit a word in the list
function editWord(wordId, updatedData, callback) {
  chrome.storage.local.get("words", (data) => {
    const words = data.words || {};
    if (words[wordId]) {
      words[wordId] = { ...words[wordId], ...updatedData };
      chrome.storage.local.set({ words }, () => {
        if (chrome.runtime.lastError) {
          if (callback) callback(chrome.runtime.lastError);
          return;
        }
        updateLocalCacheAndNotify(words);
        if (callback) callback();
      });
    } else {
      if (callback) callback(new Error("Word ID not found"));
    }
  });
}

// Get the entire list of words
function getWords(callback) {
  if (cachedWords !== null) {
    callback(cachedWords);
  } else {
    refreshCachedWords(() => {
      callback(cachedWords);
    });
  }
}

// Message Passing: Handle messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "addWord") {
    addWord(message.wordData, (newId, error) => {
      if (error) sendResponse({ error: error.message });
      else sendResponse({ newId });
    });
    return true; // Indicates that the response will be sent asynchronously
  } else if (message.action === "deleteWord") {
    deleteWord(message.wordId, (error) => {
      if (error) sendResponse({ error: error.message });
      else sendResponse({ success: true });
    });
    return true;
  } else if (message.action === "editWord") {
    editWord(message.wordId, message.updatedData, (error) => {
      if (error) sendResponse({ error: error.message });
      else sendResponse({ success: true });
    });
    return true;
  } else if (message.action === "getWords") {
    getWords(sendResponse);
    return true;
  }
  return false; // Explicitly return false if no async response is planned
});


// Handle clicks on the context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openWordList") {
    chrome.tabs.create({ url: chrome.runtime.getURL("webpage/index.html") });
  }
});

// Send cached words to content scripts when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab && tab.url && (tab.url.startsWith("http") || tab.url.startsWith("file"))) {
    const sendMessageToTab = (words) => {
      chrome.tabs.sendMessage(tabId, { action: "highlightWords", wordList: words }, (response) => {
        if (chrome.runtime.lastError) {
          // Error is common, means content script isn't ready or on the page.
          // console.log(`Could not send message to tab ${tabId} (${tab.url}): ${chrome.runtime.lastError.message}`);
        } else {
          // Optional: Log successful response
        }
      });
    };

    if (cachedWords !== null) {
      sendMessageToTab(cachedWords);
    } else {
      refreshCachedWords(() => {
        sendMessageToTab(cachedWords);
      });
    }
  }
});