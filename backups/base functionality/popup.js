document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("toggleHighlighting");

    // Load toggle state
    chrome.storage.local.get("enabled", (data) => {
        toggle.checked = data.enabled ?? true; // Default: enabled
    });

    // Toggle highlighting on/off
    toggle.addEventListener("change", () => {
        const isEnabled = toggle.checked;
        chrome.storage.local.set({ enabled: isEnabled }, () => {
            chrome.tabs.reload(); // Reload page to apply changes
        });
    });

    document.getElementById("saveWord").addEventListener("click", () => {
        const word = document.getElementById("wordInput").value.trim().toLowerCase();
        const level = document.getElementById("levelInput").value;
        const language = document.getElementById("languageInput").value;
        const context = document.getElementById("contextInput").value.trim();
        const notes = document.getElementById("notesInput").value.trim();

        if (!word) {
            alert("Please enter a word.");
            return;
        }

        const newWord = { level: parseInt(level), language, context, notes };

        chrome.storage.local.get("userWords", (data) => {
            let userWords = data.userWords || {};
            userWords[word] = newWord;

            chrome.storage.local.set({ userWords }, () => {
                alert(`Word "${word}" added!`);
            });
        });
    });

    document.getElementById("viewWords").addEventListener("click", () => {
        chrome.tabs.create({ url: "words.html" });
    });
});
