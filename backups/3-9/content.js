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

    console.log("Highlighting these words:", allWords);

    const regex = new RegExp(`(${allWords.join("|")})`, "gi");

    function highlightText(node) {
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
    }

    highlightText(document.body);
});
