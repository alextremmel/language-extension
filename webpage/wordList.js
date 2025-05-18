// webpage/wordList.js

function populateTable(words) {
  const tableBody = document.querySelector("#wordTable tbody");
  tableBody.innerHTML = ""; // Clear existing rows

  Object.entries(words).forEach(([id, wordData]) => {
    const row = document.createElement("tr");
    row.classList.add("clickableRow");
    row.dataset.id = id;

    row.innerHTML = `
      <td>${wordData.word}</td>
      <td>${wordData.definition}</td>
      <td>${wordData.language}</td>
      <td>${wordData.level}</td>
      <td>${new Date(wordData.dateAdded).toLocaleDateString()}</td>
      <td class="actions-column">
        <button class="deleteButton" data-id="${id}">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function handleEdit(wordId) {
  chrome.runtime.sendMessage({ action: "getWords" }, (response) => {
    const wordData = response[wordId];
    if (wordData) {
      document.querySelector("#wordId").value = wordId;
      document.querySelector("#wordInput").value = wordData.word;
      document.querySelector("#definitionInput").value = wordData.definition;
      document.querySelector("#languageInput").value = wordData.language;
      document.querySelector("#levelInput").value = wordData.level;
    }
  });
}

function handleDelete(wordId, wordText) {
  const confirmed = window.confirm(`Are you sure you want to delete "${wordText}"?`);
  if (!confirmed) {
    return;
  }

  chrome.runtime.sendMessage({ action: "deleteWord", wordId }, () => {
    fetchWords(); // Refresh table
  });
}

function fetchWords() {
  chrome.runtime.sendMessage({ action: "getWords" }, (response) => {
    if (response) {
      populateTable(response);
      filterWordTable(); // Apply existing filters after fetching
    } else {
      console.error("Failed to fetch words");
    }
  });
}

document.querySelector("#wordForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const wordId = document.querySelector("#wordId").value;
  const wordData = {
    word: document.querySelector("#wordInput").value,
    definition: document.querySelector("#definitionInput").value,
    language: document.querySelector("#languageInput").value,
    level: parseInt(document.querySelector("#levelInput").value, 10),
  };

  if (!wordData.language || !wordData.level) {
    alert("Please select a valid language and level.");
    return;
  }

  const action = wordId ? "editWord" : "addWord";
  const message = wordId ? { action, wordId, updatedData: wordData } : { action, wordData };

  chrome.runtime.sendMessage(message, () => {
    fetchWords();
    resetForm();
  });
});

function resetForm() {
  document.querySelector("#wordForm").reset();
  document.querySelector("#wordId").value = "";
  // After resetting, re-apply filters which might get cleared by form reset affecting filter inputs
  filterWordTable();
}

function filterWordTable() {
  const wordInput = document.querySelector("#wordInput").value.toLowerCase().trim();
  const filterLanguage = document.querySelector("#languageInput").value;
  const filterLevel = document.querySelector("#levelInput").value;
  const tableRows = document.querySelectorAll("#wordTable tbody tr");

  tableRows.forEach((row) => {
    const wordCell = row.querySelector("td:nth-child(1)").textContent.toLowerCase();
    const languageCell = row.querySelector("td:nth-child(3)").textContent;
    const levelCell = row.querySelector("td:nth-child(4)").textContent;

    // Only filter by wordInput if it's not empty (i.e., user is typing in the word field for filtering, not adding/editing)
    // This assumes that when #wordId is empty (add mode), #wordInput can be used for filtering.
    // When #wordId has a value (edit mode), #wordInput shows the word being edited and shouldn't filter.
    // A dedicated filter input field might be clearer, but this retains existing behavior.
    const wordMatches = document.querySelector("#wordId").value ? true : (!wordInput || wordCell.includes(wordInput));
    const languageMatches = !filterLanguage || languageCell === filterLanguage;
    const levelMatches = !filterLevel || levelCell === filterLevel;

    row.style.display = wordMatches && languageMatches && levelMatches ? "" : "none";
  });
}

// Event listener for the table body (event delegation)
document.querySelector("#wordTable tbody").addEventListener("click", (event) => {
  const target = event.target;
  if (target.classList.contains("deleteButton")) {
    const wordId = target.dataset.id;
    const wordText = target.closest("tr").querySelector("td:nth-child(1)").textContent;
    handleDelete(wordId, wordText);
  } else if (target.closest(".clickableRow")) {
    // Check if the click was on a cell or the row itself, not on a button within the row
    if (!target.closest("button")) {
      const row = target.closest(".clickableRow");
      const wordId = row.dataset.id;
      handleEdit(wordId);
    }
  }
});

// Trigger filtering when Enter is pressed in the word input (for filtering)
document.querySelector("#wordInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault(); // Prevent form submission
    // Only filter if we are not in "edit mode" (i.e., wordId is not set)
    if (!document.querySelector("#wordId").value) {
        filterWordTable();
    }
  }
});

// Update table on language or level changes from the form's select dropdowns
document.querySelector("#languageInput").addEventListener("change", filterWordTable);
document.querySelector("#levelInput").addEventListener("change", filterWordTable);

// Initial population of the table
document.addEventListener("DOMContentLoaded", fetchWords);