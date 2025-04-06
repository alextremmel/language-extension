function addWord(wordData, callback) {
    chrome.storage.local.get("words", (data) => {
        const words = data.words || {};
        const newId = Date.now().toString(); // Generate a unique ID using the current timestamp
        wordData.dateAdded = new Date().toISOString(); // Add the current date
        words[newId] = wordData;

        chrome.storage.local.set({ words }, () => {
            if (callback) callback(newId);
        });
    });
}

// Delete a word from the list
function deleteWord(wordId, callback) {
    chrome.storage.local.get("words", (data) => {
        const words = data.words || {};
        delete words[wordId];

        chrome.storage.local.set({ words }, () => {
            if (callback) callback();
        });
    });
}

// Edit a word in the list
function editWord(wordId, updatedData, callback) {
    chrome.storage.local.get("words", (data) => {
        const words = data.words || {};
        if (words[wordId]) {
            words[wordId] = { ...words[wordId], ...updatedData };

            chrome.storage.local.set({ words }, () => {
                if (callback) callback();
            });
        }
    });
}

// Get the entire list of words
function getWords(callback) {
    chrome.storage.local.get("words", (data) => {
        const words = data.words || {};
        callback(words);
    });
}

// Initialize storage if not already set
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get("words", (data) => {
        if (!data.words) {
            chrome.storage.local.set({ words: {} });
        }
    });
});

// Message Passing: Handle messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "addWord") {
        addWord(message.wordData, sendResponse);
    } else if (message.action === "deleteWord") {
        deleteWord(message.wordId, sendResponse);
    } else if (message.action === "editWord") {
        editWord(message.wordId, message.updatedData, sendResponse);
    } else if (message.action === "getWords") {
        getWords(sendResponse);
    }
    return true; // Indicates that the response will be sent asynchronously
});

// Add a context menu to open the options page
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "openWordList",
        title: "Open Word List",
        contexts: ["action"] // This ensures the menu appears when clicking the extension icon
    });
});

// Handle clicks on the context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "openWordList") {
        chrome.tabs.create({ url: chrome.runtime.getURL("webpage/index.html") });
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        chrome.storage.local.get("words", (data) => {
            chrome.tabs.sendMessage(tabId, { action: "highlightWords", wordList: data.words });
        });
    }
});