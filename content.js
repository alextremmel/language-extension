chrome.storage.local.get(["enabled", "userWords"], (data) => {
    if (chrome.runtime.lastError) {
        console.error("Error accessing storage:", chrome.runtime.lastError);
        return;
    }

    if (!data.enabled) return; // STOP if highlighting is disabled

    let userWords = data.userWords || {};
    let allWords = Object.keys(userWords);
    
    if (allWords.length === 0) {
        console.warn("No words found in storage.");
        return;
    }

    // Include related words in the regex and userWords object
    allWords.forEach(word => {
        const relatedWords = userWords[word].relatedWords ? userWords[word].relatedWords.split(",") : [];
        relatedWords.forEach(relatedWord => {
            const [relatedWordText, relatedWordLevel] = relatedWord.split(':');
            if (!userWords[relatedWordText.trim()]) {
                userWords[relatedWordText.trim()] = {
                    level: parseInt(relatedWordLevel.trim()),
                    definition: userWords[word].definition || ""
                };
            }
        });
    });

    // Sort words by length in descending order to prioritize longer words
    allWords = Object.keys(userWords).sort((a, b) => b.length - a.length);

    console.log("Highlighting these words:", allWords);

    const regex = new RegExp(`(${allWords.join("|")})`, "gi");

    function highlightText(node) {
        try {
            if (node.nodeType === 3) { // Text node
                const parent = node.parentNode;
                if (parent && (parent.nodeName === "SCRIPT" || parent.nodeName === "STYLE")) return;

                const replacedHTML = node.nodeValue.replace(regex, match => {
                    const wordInfo = userWords[match.toLowerCase()] || {};
                    const level = wordInfo.level || 1; // Default to level 1
                    const tooltip = wordInfo.definition ? `title='${wordInfo.definition}'` : "";
                    return `<span class="highlight-level-${level}" ${tooltip}>${match}</span>`;
                });

                if (replacedHTML !== node.nodeValue) {
                    const tempDiv = document.createElement("div");
                    tempDiv.innerHTML = replacedHTML;

                    while (tempDiv.firstChild) {
                        parent.insertBefore(tempDiv.firstChild, node);
                    }
                    parent.removeChild(node);
                }
            } else if (node.nodeType === 1 && node.childNodes) {
                Array.from(node.childNodes).forEach(highlightText);
            }
        } catch (e) {
            console.error("Error highlighting text:", e);
        }
    }

    function highlightDocument() {
        highlightText(document.body);
    }

    // Initial highlight
    highlightDocument();

    // Debounce function to limit the frequency of highlighting operations
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Observe changes to the DOM
    const observer = new MutationObserver(debounce(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                highlightText(node);
            });
        });
    }, 300)); // Adjust the debounce delay as needed

    observer.observe(document.body, { childList: true, subtree: true });
});