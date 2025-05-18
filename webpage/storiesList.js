// webpage/storiesList.js

// Import the reusable function for creating the level distribution bar
import { createLevelDistributionBarHTML } from '../shared/uiUtils.js';

document.addEventListener("DOMContentLoaded", fetchStories);

document.getElementById("createStoryButton").addEventListener("click", () => {
    // Navigate to story page in create mode
    window.location.href = "story.html?mode=create";
});

function fetchStories() {
    chrome.storage.local.get("stories", (data) => {
        if (chrome.runtime.lastError) {
            console.error("Error fetching stories:", chrome.runtime.lastError.message);
            // Optionally, display an error message to the user in the table or a designated area
            const tableBody = document.querySelector("#storiesTable tbody");
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="3">Error loading stories.</td></tr>`;
            }
            return;
        }
        const stories = data.stories || {};
        populateStoriesTable(stories);
    });
}

function populateStoriesTable(stories) {
    const tableBody = document.querySelector("#storiesTable tbody");
    if (!tableBody) {
        console.error("Stories table body not found.");
        return;
    }
    tableBody.innerHTML = ""; // Clear existing rows

    if (Object.keys(stories).length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3">No stories found. Click "Create New Story" to add one!</td></tr>`;
        return;
    }

    Object.entries(stories).forEach(([id, story]) => {
        const row = document.createElement("tr");
        row.classList.add("clickableRow");
        row.dataset.id = id; // Store story ID for click handling

        // Generate the level distribution bar using the story's levelDistribution property
        // Pass options for the bar, like a more specific title
        const levelBarHTML = createLevelDistributionBarHTML(story.levelDistribution, {
            defaultTitle: `Word levels in '${story.title || 'Untitled Story'}'`,
            // You can also specify width and height here if needed, e.g.:
            width: "180px",
            height: "20px"
        });

        const titleCell = document.createElement("td");
        titleCell.textContent = story.title || "Untitled Story";

        const languageCell = document.createElement("td");
        languageCell.textContent = story.language || "N/A";

        const levelCell = document.createElement("td");
        levelCell.innerHTML = levelBarHTML; // Inject the HTML for the bar

        row.appendChild(titleCell);
        row.appendChild(languageCell);
        row.appendChild(levelCell);

        row.addEventListener("click", () => {
            // Navigate to story page in view mode, passing storyId in query parameters
            window.location.href = `story.html?mode=view&storyId=${id}`;
        });
        tableBody.appendChild(row);
    });
}