// webpage/wordList.js

// Import the reusable function for creating the level distribution bar
import { createLevelDistributionBarHTML } from '../shared/uiUtils.js';

let allFetchedWords = {}; // Stores all words fetched from storage to allow client-side filtering for the distribution bar

// --- Functions for Word Distribution Bar ---

/**
 * Calculates the distribution of word levels from a given array of word objects.
 * @param {Array<Object>} wordsArray - An array of word objects (e.g., [{word: "...", level: 1, language: "..."}]).
 * @returns {Object} An object representing the distribution (e.g., {"1": 50, "2": 25, "unknown": 25}).
 */
function calculateOverallWordDistribution(wordsArray) {
    const counts = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    let totalWordsWithLevels = 0;

    if (wordsArray && Array.isArray(wordsArray)) {
        wordsArray.forEach(wordData => {
            if (wordData && wordData.level) { // Ensure level exists and is valid
                const levelStr = String(wordData.level);
                if (counts.hasOwnProperty(levelStr)) {
                    counts[levelStr]++;
                    totalWordsWithLevels++;
                }
            }
        });
    }

    const distribution = {};
    if (totalWordsWithLevels === 0) {
        // If no words match or no words have levels, show as 100% unknown
        return { "1":0, "2":0, "3":0, "4":0, "5":0, "unknown": 100 };
    }

    // Calculate percentages
    for (const levelKey in counts) {
        distribution[levelKey] = (counts[levelKey] / totalWordsWithLevels) * 100;
    }

    // Optional: Sophisticated rounding to ensure sum is exactly 100%
    // This basic rounding should be sufficient for visualization.
    // The createLevelDistributionBarHTML function also has scaling for visual fit.
    let roundedSum = 0;
    Object.keys(distribution).forEach(key => {
        distribution[key] = Math.round(distribution[key]);
        roundedSum += distribution[key];
    });

    if (roundedSum !== 100 && totalWordsWithLevels > 0) {
        let diff = 100 - roundedSum;
        // Attempt to adjust the largest component to make sum 100
        // Filters out levels with 0 count before finding max, to avoid issues if some levels are empty.
        const nonEmptyLevels = Object.keys(counts).filter(k => counts[k] > 0);
        if (nonEmptyLevels.length > 0) {
            let maxLevel = nonEmptyLevels.reduce((a, b) => counts[a] > counts[b] ? a : b);
            distribution[maxLevel] += diff;
        } else if (distribution["unknown"] !== undefined) { // if all known levels were 0, adjust unknown
             distribution["unknown"] += diff; // This case should ideally not be hit if totalWordsWithLevels > 0
        }
    }
    return distribution;
}

/**
 * Updates the word distribution bar display based on the currently selected language filter.
 */
function updateWordDistributionDisplay() {
    const languageFilterElement = document.getElementById('distributionLanguageFilter');
    if (!languageFilterElement) return; // Safety check

    const selectedLanguage = languageFilterElement.value;
    let wordsForDistribution = Object.values(allFetchedWords); // Use an array copy

    if (selectedLanguage) { // If a specific language is selected (not "Any Language")
        wordsForDistribution = wordsForDistribution.filter(word => word.language === selectedLanguage);
    }

    const overallDistributionData = calculateOverallWordDistribution(wordsForDistribution);
    const barPlaceholder = document.getElementById("overallWordDistributionBarPlaceholder");

    if (barPlaceholder) {
        barPlaceholder.innerHTML = createLevelDistributionBarHTML(overallDistributionData, {
            width: "100%", // Bar will take full width of its placeholder
            height: "20px",  // Define a fixed height for the bar
            defaultTitle: `Word Distribution (${selectedLanguage || 'Any Language'})`
        });
    }
}

// --- Existing Word List Functions ---

function populateTable(words) {
  const tableBody = document.querySelector("#wordTable tbody");
  tableBody.innerHTML = ""; // Clear existing rows

  // If 'words' is an object (from initial fetch), convert to array.
  // If it's already an array (e.g., from a filter operation that returns array), use as is.
  const wordsArray = Array.isArray(words) ? words : Object.values(words);


  if (wordsArray.length === 0) {
    const colSpan = document.querySelector("#wordTable thead tr").cells.length;
    tableBody.innerHTML = `<tr><td colspan="${colSpan || 6}" style="text-align:center;">No words found.</td></tr>`;
    return;
  }


  wordsArray.forEach((wordData) => { // Assuming wordData has an 'id' if it's from Object.entries
    // If words is an object, it would be Object.entries(words).forEach(([id, wordData])
    // For consistency, let's assume populateTable now receives an array of word objects,
    // where each object might need an 'id' if row.dataset.id is used.
    // For now, we'll assume wordData contains all necessary fields.
    // If wordData doesn't have an id from Object.values(), you'll need a unique key if row.dataset.id is critical.
    // Let's find the ID if allFetchedWords contains this wordData object
    let id;
    for (const key in allFetchedWords) {
        if (allFetchedWords[key] === wordData) {
            id = key;
            break;
        }
    }
    if (!id) id = wordData.word + Date.now(); // Fallback unique key, less ideal.

    const row = document.createElement("tr");
    row.classList.add("clickableRow");
    row.dataset.id = id; // Ensure 'id' is available

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
    const wordData = response[wordId]; // response here is the object of all words
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
    fetchWords(); // Refresh table and distribution bar
  });
}

function fetchWords() {
  chrome.runtime.sendMessage({ action: "getWords" }, (response) => {
    if (response) {
      allFetchedWords = response; // Store all words (as an object)
      // Initial table population (populateTable might need to handle object or array)
      // filterWordTable will apply current table filters and call populateTable with filtered array
      filterWordTable(); // This will populate the table based on existing filters
      updateWordDistributionDisplay(); // Update the distribution bar
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
    fetchWords(); // Refresh table and distribution bar
    resetFormOnSubmit(); // Modified name for clarity
  });
});

function resetFormOnSubmit() { // Renamed from resetForm to avoid conflict if there's another resetForm
  document.querySelector("#wordForm").reset();
  document.querySelector("#wordId").value = "";
  // After resetting, re-apply filters for the table which might get cleared by form reset
  // Do not call filterWordTable() here if it re-populates from allFetchedWords without considering form inputs for filtering
  // The main filterWordTable in fetchWords should handle this.
  // Or, if filterWordTable is lightweight and just hides rows:
  // filterWordTable();
}


function filterWordTable() {
  // This function filters the TABLE VIEW based on the FORM inputs
  // It does NOT affect allFetchedWords or the distribution bar filter
  const wordInput = document.querySelector("#wordInput").value.toLowerCase().trim();
  const filterLanguage = document.querySelector("#languageInput").value; // Language from the main form
  const filterLevel = document.querySelector("#levelInput").value; // Level from the main form

  let wordsToDisplayInTable = Object.values(allFetchedWords);

  // Filter by wordInput only if it's not empty AND not in edit mode
  if (wordInput && !document.querySelector("#wordId").value) {
      wordsToDisplayInTable = wordsToDisplayInTable.filter(wordData =>
          wordData.word.toLowerCase().includes(wordInput)
      );
  }
  if (filterLanguage) {
      wordsToDisplayInTable = wordsToDisplayInTable.filter(wordData =>
          wordData.language === filterLanguage
      );
  }
  if (filterLevel) {
      wordsToDisplayInTable = wordsToDisplayInTable.filter(wordData =>
          String(wordData.level) === filterLevel
      );
  }
  populateTable(wordsToDisplayInTable); // Populate table with the filtered array
}


// --- Event Listeners ---

document.addEventListener("DOMContentLoaded", () => {
    fetchWords(); // Initial fetch for words, table, and distribution bar

    const distributionLangFilter = document.getElementById('distributionLanguageFilter');
    if (distributionLangFilter) {
        distributionLangFilter.addEventListener('change', updateWordDistributionDisplay);
    }

    // Event listener for the table body (event delegation for delete/edit)
    document.querySelector("#wordTable tbody").addEventListener("click", (event) => {
        const target = event.target;
        if (target.classList.contains("deleteButton")) {
            const wordId = target.dataset.id;
            const wordText = target.closest("tr").querySelector("td:nth-child(1)").textContent;
            handleDelete(wordId, wordText);
        } else if (target.closest(".clickableRow")) {
            if (!target.closest("button")) { // Ensure not clicking a button inside the row
                const row = target.closest(".clickableRow");
                const wordId = row.dataset.id;
                handleEdit(wordId);
            }
        }
    });

    // Listen for changes on the main form's filter inputs to update the table view
    document.querySelector("#wordInput").addEventListener("input", () => {
        // Only filter if not in edit mode (wordId is empty)
        if (!document.querySelector("#wordId").value) {
            filterWordTable();
        }
    });
    document.querySelector("#languageInput").addEventListener("change", filterWordTable); // Main form language
    document.querySelector("#levelInput").addEventListener("change", filterWordTable); // Main form level
});