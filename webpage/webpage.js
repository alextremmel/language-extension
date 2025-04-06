// Populate the table with words
function populateTable(words) {
  const tableBody = document.querySelector("#wordTable tbody");
  tableBody.innerHTML = "";

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
      <td>
        <button class="deleteButton" data-id="${id}">Delete</button>
      </td>
    `;

    tableBody.appendChild(row);
  });

  // Add event listener for delete buttons
  document.querySelectorAll(".deleteButton").forEach((button) => {
    button.addEventListener("click", handleDelete);
  });

  // Add event listener for clicking on rows to trigger editing
  document.querySelectorAll(".clickableRow").forEach((row) => {
    row.addEventListener("click", handleRowClick);
  });
}

function handleRowClick(event) {
  if (event.target.classList.contains("deleteButton")) {
    return;
  }
  const wordId = event.currentTarget.dataset.id;
  handleEdit(wordId);
}

function fetchWords() {
  chrome.runtime.sendMessage({ action: "getWords" }, (response) => {
    if (response) {
      populateTable(response);
      filterWordTable();
    } else {
      console.error("Failed to fetch words");
    }
  });
}

// Handle form submission for adding/editing words
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

  if (wordId) {
    chrome.runtime.sendMessage({ action: "editWord", wordId, updatedData: wordData }, () => {
      fetchWords();
      resetForm();
    });
  } else {
    chrome.runtime.sendMessage({ action: "addWord", wordData }, () => {
      fetchWords();
      resetForm();
    });
  }
});

// Modified handleEdit that accepts either an event or a word ID string
function handleEdit(wordIdOrEvent) {
  let wordId;
  if (typeof wordIdOrEvent === "string") {
    wordId = wordIdOrEvent;
  } else {
    wordId = wordIdOrEvent.target.dataset.id;
  }
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

function handleDelete(event) {
  const wordId = event.target.dataset.id;
  const row = event.target.closest("tr");
  const word = row.querySelector("td:nth-child(1)").textContent;

  const confirmed = window.confirm(`Are you sure you want to delete "${word}"?`);
  if (!confirmed) {
    return;
  }

  chrome.runtime.sendMessage({ action: "deleteWord", wordId }, () => {
    fetchWords();
  });
}

function resetForm() {
  document.querySelector("#wordForm").reset();
  document.querySelector("#wordId").value = "";
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

    const wordMatches = !wordInput || wordCell.includes(wordInput);
    const languageMatches = !filterLanguage || languageCell === filterLanguage;
    const levelMatches = !filterLevel || levelCell === filterLevel;

    row.style.display = wordMatches && languageMatches && levelMatches ? "" : "none";
  });
}

// Trigger filtering only when Enter is pressed in the word input
document.querySelector("#wordInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault(); // Prevent form submission on Enter if needed
    filterWordTable();
  }
});

// Update table on language or level changes
document.querySelector("#languageInput").addEventListener("change", () => {
  filterWordTable();
});
document.querySelector("#levelInput").addEventListener("change", () => {
  filterWordTable();
});

document.addEventListener("DOMContentLoaded", fetchWords);