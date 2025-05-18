// webpage/story.js

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
            console.error('Error fetching from storage in loadStoryView:', chrome.runtime.lastError);
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

        container.innerHTML = `
            <h1>${story.title}</h1>
            <p><strong>Language:</strong> ${story.language}</p>
            <p><strong>Level Distribution:</strong> ${formatLevelDistribution(story.levelDistribution)}</p>
            <div id="storyContent">${story.content}</div>
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

        // Ensure highlighting functions are available (shared/highlight.js should be loaded first)
        if (typeof processWordList === 'function' && typeof highlightWords === 'function') {
            const wordListToProcess = data.words || {};
            const processedWordList = processWordList(wordListToProcess);
            const storyContentElement = document.getElementById("storyContent");

            if (storyContentElement) {
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
                console.error('Error deleting story from storage:', chrome.runtime.lastError);
            } else {
                window.location.href = "storiesList.html";
            }
        });
    });
}

function loadStoryForm(formMode) {
    let storyData = { title: "", language: "", content: "" };
    if (formMode === "edit") {
        chrome.storage.local.get("stories", (data) => {
            if (chrome.runtime.lastError) {
                console.error('Error fetching stories for edit form:', chrome.runtime.lastError);
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
    container.innerHTML = `
        <h1>${formMode === "create" ? "Create New Story" : "Edit Story"}</h1>
        <form id="storyForm">
            <label>
                Title:
                <input type="text" id="storyTitle" value="${storyData.title || ''}" ${formMode === "edit" ? "readonly" : ""} required>
            </label>
            <br>
            <label>
                Language:
                <select id="storyLanguage" required>
                    <option value="">Select Language</option>
                    <option value="Korean" ${storyData.language === "Korean" ? "selected" : ""}>Korean</option>
                    <option value="English" ${storyData.language === "English" ? "selected" : ""}>English</option>
                    <option value="Chinese" ${storyData.language === "Chinese" ? "selected" : ""}>Chinese</option>
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
            window.location.href = "storiesList.html";
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

    if (!title || !language || !content) {
        alert("All fields are required.");
        return;
    }

    chrome.storage.local.get(["stories", "words"], (data) => {
        if (chrome.runtime.lastError) {
            console.error('Error fetching data for saving story:', chrome.runtime.lastError);
            return;
        }
        const stories = data.stories || {};
        const userWords = data.words || {};

        const levelDistribution = computeLevelDistribution(content, userWords);
        const newStoryData = { title, language, content, levelDistribution };

        if (formMode === "create") {
            const duplicate = Object.values(stories).find(story => story.title.toLowerCase() === title.toLowerCase());
            if (duplicate) {
                alert("A story with this title already exists.");
                return;
            }
            const newId = Date.now().toString();
            stories[newId] = newStoryData;
        } else if (formMode === "edit") {
            stories[storyId] = { ...stories[storyId], ...newStoryData };
        }
        chrome.storage.local.set({ stories }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error setting stories in storage after save:', chrome.runtime.lastError);
            } else {
                window.location.href = "storiesList.html";
            }
        });
    });
}

function computeLevelDistribution(text, userWords) {
    if (!text || typeof text !== 'string') {
        return { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, unknown: 100 }; // Default if no text
    }
    const words = text.trim().split(/\s+/);
    const counts = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, unknown: 0 };

    words.forEach(word => {
        const lowerWord = word.toLowerCase().replace(/[.,!?;:"“”']/g, '');
        if (!lowerWord) return;

        let matched = false;
        if (userWords && typeof userWords === 'object') {
            Object.values(userWords).forEach(entry => {
                if (entry && entry.word && entry.word.toLowerCase() === lowerWord) {
                    counts[entry.level] = (counts[entry.level] || 0) + 1;
                    matched = true;
                }
            });
        }
        if (!matched) {
            counts.unknown = (counts.unknown || 0) + 1;
        }
    });

    const total = words.length > 0 ? words.length : 1;
    const distribution = {};
    for (let key in counts) {
        distribution[key] = Math.round((counts[key] / total) * 100);
    }
    return distribution;
}

function formatLevelDistribution(distribution) {
    if (!distribution) return "N/A";
    return `Level 1: ${distribution["1"] || 0}%, Level 2: ${distribution["2"] || 0}%, Level 3: ${distribution["3"] || 0}%, Level 4: ${distribution["4"] || 0}%, Level 5: ${distribution["5"] || 0}%, Unknown: ${distribution.unknown || 0}%`;
}