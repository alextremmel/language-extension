document.addEventListener("DOMContentLoaded", fetchStories);

document.getElementById("createStoryButton").addEventListener("click", () => {
    // Navigate to story page in create mode
    window.location.href = "story.html?mode=create";
});

function fetchStories() {
    chrome.storage.local.get("stories", (data) => {
        const stories = data.stories || {};
        populateStoriesTable(stories);
    });
}

function populateStoriesTable(stories) {
    const tableBody = document.querySelector("#storiesTable tbody");
    tableBody.innerHTML = "";
    
    Object.entries(stories).forEach(([id, story]) => {
        const row = document.createElement("tr");
        row.classList.add("clickableRow");
        row.dataset.id = id;
        row.innerHTML = `
            <td>${story.title}</td>
            <td>${story.language}</td>
            <td>${story.level}</td>
        `;
        row.addEventListener("click", () => {
            // Navigate to story page in view mode, passing storyId in query parameters
            window.location.href = `story.html?mode=view&storyId=${id}`;
        });
        tableBody.appendChild(row);
    });
}