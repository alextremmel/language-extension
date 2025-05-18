// webpage/story.js
import { availableLanguages } from '../shared/config.js';

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode"); // "view", "edit", "create"
const storyId = params.get("storyId");

document.addEventListener("DOMContentLoaded", () => {
    if (mode === "view") {
        loadStoryView();
    } else if (mode === "edit") {
        loadStoryForm("edit");
    } else if (mode === "create") {
        loadStoryForm("create");
    }
});

function loadStoryView() {
    chrome.storage.local.get(["stories", "words"], (data) => {
        if (chrome.runtime.lastError) {
            console.error('Error fetching from storage in loadStoryView:', chrome.runtime.lastError.message);
            const container = document.getElementById("storyContainer");
            if (container) container.innerHTML = "<p>Error loading story data.</p>";
            return;
        }

        const stories = data.stories || {};
        const story = stories[storyId];

        if (!story) {
            const container = document.getElementById("storyContainer");
            if (container) {
                container.innerHTML = "<p>Story not found.</p>";
            }
            console.error('Story not found with ID:', storyId);
            return;
        }

        const container = document.getElementById("storyContainer");
        if (!container) {
            console.error('storyContainer element not found!');
            return;
        }

        // Sanitize content before injecting as HTML if it can contain user-generated HTML.
        // For plain text display, direct injection is fine, but consider DOMPurify if content can be HTML.
        const storyContentDisplay = story.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");


        container.innerHTML = `
            <h1>${story.title}</h1>
            <p><strong>Language:</strong> ${story.language}</p>
            <p><strong>Level Distribution:</strong> ${formatLevelDistribution(story.levelDistribution)}</p>
            <div id="storyContent" style="white-space: pre-wrap; background-color: #f9f9f9; border: 1px solid #eee; padding: 10px; border-radius: 5px;">${storyContentDisplay}</div>
            <button id="editStoryButton">Edit Story</button>
            <button id="deleteStoryButton">Delete Story</button>
        `;

        const editButton = document.getElementById("editStoryButton");
        if (editButton) {
            editButton.addEventListener("click", () => {
                window.location.href = `story.html?mode=edit&storyId=${storyId}`;
            });
        }
        const deleteButton = document.getElementById("deleteStoryButton");
        if (deleteButton) {
            deleteButton.addEventListener("click", () => {
                if (confirm("Are you sure you want to delete this story?")) {
                    deleteStory();
                }
            });
        }

        if (typeof processWordList === 'function' && typeof highlightWords === 'function') {
            const wordListToProcess = data.words || {};
            const wordsForHighlighting = {};
            Object.entries(wordListToProcess).forEach(([id, wordData]) => {
                if (wordData.language === story.language) {
                    wordsForHighlighting[id] = wordData;
                }
            });

            const processedWordList = processWordList(wordsForHighlighting);
            const storyContentElement = document.getElementById("storyContent");

            if (storyContentElement) {
                // Important: highlightWords manipulates the DOM.
                // If story.content was plain text, it's fine.
                // If story.content could be HTML, ensure highlightWords is safe or content is pre-processed.
                // Since we set storyContentDisplay with pre-wrap, it implies plain text.
                // We need to re-set innerHTML with original content for highlightWords to work on text nodes.
                storyContentElement.innerHTML = story.content; // Use original content for highlighting
                highlightWords(processedWordList, storyContentElement);
            } else {
                console.error('storyContent element not found in DOM before highlighting!');
            }
        } else {
            console.error('Highlighting functions (processWordList or highlightWords) are not defined. Ensure shared/highlight.js is loaded before story.js.');
        }
    });
}

function deleteStory() {
    chrome.storage.local.get("stories", (data) => {
        let stories = data.stories || {};
        delete stories[storyId];
        chrome.storage.local.set({ stories }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error deleting story from storage:', chrome.runtime.lastError.message);
                alert('Error deleting story.');
            } else {
                window.location.href = "storiesList.html";
            }
        });
    });
}

function loadStoryForm(formMode) {
    let storyData = { title: "", language: "", content: "" }; // Default empty "" for language
    if (formMode === "edit") {
        chrome.storage.local.get("stories", (data) => {
            if (chrome.runtime.lastError) {
                console.error('Error fetching stories for edit form:', chrome.runtime.lastError.message);
                const container = document.getElementById("storyContainer");
                if (container) container.innerHTML = "<p>Error loading story data for editing.</p>";
                return;
            }
            const stories = data.stories || {};
            const existingStory = stories[storyId];
            if (!existingStory) {
                const container = document.getElementById("storyContainer");
                if (container) container.innerHTML = "<p>Story not found for editing.</p>";
                console.error('Story not found for editing with ID:', storyId);
                return;
            }
            storyData = existingStory;
            renderForm(storyData, formMode);
        });
    } else { // create mode
        renderForm(storyData, formMode);
    }
}

function renderForm(storyData, formMode) {
    const container = document.getElementById("storyContainer");
    if (!container) {
        console.error('storyContainer element not found for rendering form!');
        return;
    }

    let languageOptionsHTML = `<option value="">Select Language</option>`;
    availableLanguages.forEach(lang => {
        languageOptionsHTML += `<option value="${lang}" ${storyData.language === lang ? "selected" : ""}>${lang}</option>`;
    });

    container.innerHTML = `
        <h1>${formMode === "create" ? "Create New Story" : "Edit Story"}</h1>
        <form id="storyForm">
            <label>
                Title:
                <input type="text" id="storyTitle" value="${storyData.title || ''}" required>
            </label>
            <br>
            <label>
                Language:
                <select id="storyLanguage" required>
                    ${languageOptionsHTML}
                </select>
            </label>
            <br>
            <label>
                Content:
                <textarea id="storyContentInput" rows="10" cols="50" required>${storyData.content || ''}</textarea>
            </label>
            <br>
            <button type="submit">${formMode === "create" ? "Create Story" : "Save Changes"}</button>
            <button type="button" id="cancelButton">Cancel</button>
        </form>
    `;

    const titleInput = document.getElementById("storyTitle");
    if (titleInput && formMode === "edit") {
        titleInput.readOnly = true; // Set readonly property via JS for clarity
    }

    const storyForm = document.getElementById("storyForm");
    if (storyForm) {
        storyForm.addEventListener("submit", (e) => {
            e.preventDefault();
            saveStory(formMode);
        });
    }

    const cancelButton = document.getElementById("cancelButton");
    if (cancelButton) {
        cancelButton.addEventListener("click", () => {
            if (storyId && formMode !== 'create') {
                window.location.href = `story.html?mode=view&storyId=${storyId}`;
            } else {
                window.location.href = "storiesList.html";
            }
        });
    }
}

function saveStory(formMode) {
    const titleInput = document.getElementById("storyTitle");
    const languageInput = document.getElementById("storyLanguage");
    const contentInput = document.getElementById("storyContentInput");

    if (!titleInput || !languageInput || !contentInput) {
        console.error("Form input elements not found for saving story!");
        alert("Error saving story. Input fields missing.");
        return;
    }

    const title = titleInput.value.trim();
    const language = languageInput.value;
    const content = contentInput.value.trim();

    if (!title || !language || !content) { // language will be "" if "Select Language" is chosen
        alert("Title, Language, and Content are required.");
        return;
    }

    chrome.storage.local.get(["stories", "words"], (data) => {
        if (chrome.runtime.lastError) {
            console.error('Error fetching data for saving story:', chrome.runtime.lastError.message);
            alert('Error fetching data. Could not save story.');
            return;
        }
        const stories = data.stories || {};
        const userWords = data.words || {};

        const levelDistribution = computeLevelDistribution(content, userWords, language);
        const newStoryData = {
            title,
            language,
            content,
            levelDistribution,
            dateAdded: formMode === 'create' ? new Date().toISOString() : (stories[storyId]?.dateAdded || new Date().toISOString()),
            lastModified: new Date().toISOString()
        };

        let currentId = storyId;
        if (formMode === "create") {
            const duplicate = Object.values(stories).find(story =>
                story.title.toLowerCase() === title.toLowerCase() && story.language === language
            );
            if (duplicate) {
                alert("A story with this title and language already exists.");
                return;
            }
            currentId = Date.now().toString();
            newStoryData.id = currentId;
            stories[currentId] = newStoryData;
        } else if (formMode === "edit" && stories[currentId]) {
            stories[currentId] = { ...stories[currentId], ...newStoryData }; // Overwrite with new data, preserving ID and potentially original dateAdded
        } else if (formMode === "edit" && !stories[currentId]) {
            console.error("Attempted to edit a story that does not exist:", currentId);
            alert("Error: Story to edit was not found. It may have been deleted.");
            window.location.href = "storiesList.html";
            return;
        }

        chrome.storage.local.set({ stories }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error setting stories in storage after save:', chrome.runtime.lastError.message);
                alert('Error saving story to storage.');
            } else {
                window.location.href = `story.html?mode=view&storyId=${currentId}`;
            }
        });
    });
}

function computeLevelDistribution(text, allUserWords, storyLanguage) {
    if (!text || typeof text !== 'string' || !storyLanguage) {
        return { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, unknown: 100 };
    }

    const relevantUserWords = {};
    if (allUserWords && typeof allUserWords === 'object') {
        Object.entries(allUserWords).forEach(([id, wordData]) => {
            if (wordData.language === storyLanguage) {
                relevantUserWords[id] = wordData;
            }
        });
    }

    const wordsInText = text.trim().toLowerCase().split(/[\s.,!?;:"“”()\[\]{}¡¿«»—–-]+/).filter(Boolean);
    const counts = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, unknown: 0 };
    let scannableWordsCount = 0;

    wordsInText.forEach(wordToken => {
        if (!wordToken) return;
        scannableWordsCount++;
        let matched = false;
        if (Object.keys(relevantUserWords).length > 0) {
            for (const entry of Object.values(relevantUserWords)) {
                if (entry && entry.word && entry.word.toLowerCase() === wordToken) {
                    const levelKey = String(entry.level);
                    if (counts.hasOwnProperty(levelKey)) {
                        counts[levelKey]++;
                    } else {
                        counts.unknown++;
                    }
                    matched = true;
                    break;
                }
            }
        }
        if (!matched) {
            counts.unknown++;
        }
    });

    const distribution = {};
    const levels = ["1", "2", "3", "4", "5", "unknown"];

    if (scannableWordsCount === 0) {
        levels.forEach(k => distribution[k] = (k === "unknown" ? 100 : 0));
        return distribution;
    }

    levels.forEach(level => {
        distribution[level] = (counts[level] / scannableWordsCount) * 100;
    });

    let sumRoundedPercentages = 0;
    levels.forEach(level => {
        const rounded = Math.round(distribution[level]);
        distribution[level] = rounded;
        sumRoundedPercentages += rounded;
    });

    if (sumRoundedPercentages !== 100 && scannableWordsCount > 0) {
        let diff = 100 - sumRoundedPercentages;
        let levelToAdjust = 'unknown'; // Default to adjust 'unknown'
        let maxOriginalPercentage = -1;

        // Find the level with the largest original (unrounded) percentage to adjust
        // This helps in making the adjustment on the most significant category
        levels.forEach(level => {
            let originalVal = (counts[level] / scannableWordsCount) * 100;
            if (originalVal > maxOriginalPercentage) {
                maxOriginalPercentage = originalVal;
                levelToAdjust = level;
            }
        });
        
        // If all original percentages were 0 (highly unlikely if diff !=0), stick with 'unknown'
        if (maxOriginalPercentage === 0 && distribution.hasOwnProperty('unknown')) {
            levelToAdjust = 'unknown';
        }

        distribution[levelToAdjust] += diff;

        // Basic clamp to prevent negative, though more sophisticated redistribution might be needed for large diffs
        if (distribution[levelToAdjust] < 0) {
            // If it becomes negative, set to 0 and the sum will be off.
            // For display purposes, this might be acceptable for small errors.
            // A perfect solution requires redistributing the remainder.
            distribution[levelToAdjust] = 0;
        }
    }
    return distribution;
}

function formatLevelDistribution(distribution) {
    if (!distribution) return "N/A";
    const parts = [];
    ["1", "2", "3", "4", "5", "unknown"].forEach(level => {
        const label = level === "unknown" ? "Unknown" : `Level ${level}`;
        parts.push(`${label}: ${distribution[level] || 0}%`);
    });
    return parts.join(', ');
}