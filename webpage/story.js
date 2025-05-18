// Parse query parameters from URL
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
        const stories = data.stories || {};
        const story = stories[storyId];
        if (!story) {
            // handle missing story
            return;
        }
        const container = document.getElementById("storyContainer");
        container.innerHTML = `
            <h1>${story.title}</h1>
            <p><strong>Language:</strong> ${story.language}</p>
            <p><strong>Level Distribution:</strong> ${formatLevelDistribution(story.levelDistribution)}</p>
            <div id="storyContent">${story.content}</div>
            <button id="editStoryButton">Edit Story</button>
            <button id="deleteStoryButton">Delete Story</button>
        `;
        document.getElementById("editStoryButton").addEventListener("click", () => {
            window.location.href = `story.html?mode=edit&storyId=${storyId}`;
        });
        document.getElementById("deleteStoryButton").addEventListener("click", () => {
            if (confirm("Are you sure you want to delete this story?")) {
                deleteStory();
            }
        });
    });
}

function deleteStory() {
    chrome.storage.local.get("stories", (data) => {
        let stories = data.stories || {};
        delete stories[storyId];
        chrome.storage.local.set({ stories }, () => {
            window.location.href = "storiesList.html";
        });
    });
}

function loadStoryForm(formMode) {
    let storyData = { title: "", language: "", content: "" };
    if (formMode === "edit") {
        chrome.storage.local.get("stories", (data) => {
            const stories = data.stories || {};
            const existingStory = stories[storyId];
            if (!existingStory) {
                document.getElementById("storyContainer").innerHTML = "<p>Story not found.</p>";
                return;
            }
            storyData = existingStory;
            renderForm(storyData, formMode);
        });
    } else {
        renderForm(storyData, formMode);
    }
}

function renderForm(storyData, formMode) {
    const container = document.getElementById("storyContainer");
    container.innerHTML = `
        <h1>${formMode === "create" ? "Create New Story" : "Edit Story"}</h1>
        <form id="storyForm">
            <label>
                Title:
                <input type="text" id="storyTitle" value="${storyData.title}" ${formMode === "edit" ? "readonly" : ""} required>
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
                <textarea id="storyContentInput" rows="10" cols="50" required>${storyData.content}</textarea>
            </label>
            <br>
            <button type="submit">${formMode === "create" ? "Create Story" : "Save Changes"}</button>
            <button type="button" id="cancelButton">Cancel</button>
        </form>
    `;

    document.getElementById("storyForm").addEventListener("submit", (e) => {
        e.preventDefault();
        saveStory(formMode);
    });

    document.getElementById("cancelButton").addEventListener("click", () => {
        window.location.href = "storiesList.html";
    });
}

function saveStory(formMode) {
    const title = document.getElementById("storyTitle").value.trim();
    const language = document.getElementById("storyLanguage").value;
    const content = document.getElementById("storyContentInput").value.trim();

    if (!title || !language || !content) {
        alert("All fields are required.");
        return;
    }

    // Get both stories and user's word list to compute level distribution
    chrome.storage.local.get(["stories", "words"], (data) => {
        const stories = data.stories || {};
        const userWords = data.words || {};

        // Compute the level distribution from content using the user's words list
        const levelDistribution = computeLevelDistribution(content, userWords);

        // Check for uniqueness of title if creating a new story
        if (formMode === "create") {
            const duplicate = Object.values(stories).find(story => story.title.toLowerCase() === title.toLowerCase());
            if (duplicate) {
                alert("A story with this title already exists.");
                return;
            }
            const newId = Date.now().toString();
            stories[newId] = { title, language, content, levelDistribution };
        } else if (formMode === "edit") {
            stories[storyId] = { title, language, content, levelDistribution };
        }
        chrome.storage.local.set({ stories }, () => {
            window.location.href = "storiesList.html";
        });
    });
}

function computeLevelDistribution(text, userWords) {
    // Split text into words
    const words = text.trim().split(/\s+/);
    // Count levels 1-5 and words that are unknown
    const counts = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, unknown: 0 };

    words.forEach(word => {
        const lowerWord = word.toLowerCase();
        let matched = false;
        Object.values(userWords).forEach(entry => {
            if (entry.word && entry.word.toLowerCase() === lowerWord) {
                // Increment count based on the word's level
                counts[entry.level] = (counts[entry.level] || 0) + 1;
                matched = true;
            }
        });
        if (!matched) {
            counts.unknown = (counts.unknown || 0) + 1;
        }
    });

    const total = words.length;
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