// webpage/wordList.js
import { createLevelDistributionBarHTML } from '../shared/uiUtils.js';
import { availableLanguages } from '../shared/config.js';

let allFetchedWords = {}; // Stores all words fetched from storage

// --- Functions for Word Distribution Bar ---
function calculateOverallWordDistribution(wordsArray) {
    const counts = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    let totalWordsWithLevels = 0;

    if (wordsArray && Array.isArray(wordsArray)) {
        wordsArray.forEach(wordData => {
            if (wordData && wordData.level) {
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
        return { "1":0, "2":0, "3":0, "4":0, "5":0, "unknown": 100 };
    }

    for (const levelKey in counts) {
        distribution[levelKey] = (counts[levelKey] / totalWordsWithLevels) * 100;
    }
    
    let roundedSum = 0;
    Object.keys(distribution).forEach(key => {
        distribution[key] = Math.round(distribution[key]);
        roundedSum += distribution[key];
    });

    if (roundedSum !== 100 && totalWordsWithLevels > 0) {
        let diff = 100 - roundedSum;
        const nonEmptyLevels = Object.keys(counts).filter(k => counts[k] > 0);
        if (nonEmptyLevels.length > 0) {
            let maxLevel = nonEmptyLevels.reduce((a, b) => counts[a] > counts[b] ? a : b);
            distribution[maxLevel] += diff;
        } else if (distribution["unknown"] !== undefined) {
             distribution["unknown"] += diff;
        }
    }
    return distribution;
}

function updateWordDistributionDisplay() {
    const languageFilterElement = document.getElementById('distributionLanguageFilter');
    if (!languageFilterElement) return;

    const selectedLanguage = languageFilterElement.value;
    let wordsForDistribution = Object.values(allFetchedWords);

    if (selectedLanguage) { // If a specific language is selected (not "Any Language" which has value "")
        wordsForDistribution = wordsForDistribution.filter(word => word.language === selectedLanguage);
    }

    const overallDistributionData = calculateOverallWordDistribution(wordsForDistribution);
    const barPlaceholder = document.getElementById("overallWordDistributionBarPlaceholder");

    if (barPlaceholder) {
        barPlaceholder.innerHTML = createLevelDistributionBarHTML(overallDistributionData, {
            width: "100%",
            height: "20px",
            defaultTitle: `Word Distribution (${selectedLanguage || 'Any Language'})`
        });
    }
}

function populateLanguageDropdowns() {
    const dropdownConfigs = [
        { selector: "#distributionLanguageFilter", defaultText: "Any Language", defaultValue: "" },
        { selector: "#languageInput", defaultText: "Any Language", defaultValue: "" }
    ];

    dropdownConfigs.forEach(config => {
        const dropdown = document.querySelector(config.selector);
        if (dropdown) {
            dropdown.innerHTML = ''; // Clear existing options

            const defaultOption = document.createElement('option');
            defaultOption.value = config.defaultValue;
            defaultOption.textContent = config.defaultText;
            dropdown.appendChild(defaultOption);

            availableLanguages.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang;
                option.textContent = lang;
                dropdown.appendChild(option);
            });
        }
    });
}

// --- Existing Word List Functions ---
function populateTable(words) {
  const tableBody = document.querySelector("#wordTable tbody");
  tableBody.innerHTML = "";

  const wordsArray = Array.isArray(words) ? words : Object.values(words);

  if (wordsArray.length === 0) {
    const colSpan = document.querySelector("#wordTable thead tr").cells.length;
    tableBody.innerHTML = `<tr><td colspan="${colSpan || 6}" style="text-align:center;">No words found.</td></tr>`;
    return;
  }

  wordsArray.forEach((wordData) => {
    let id; // Find or generate ID for the row
    for (const key in allFetchedWords) {
        if (allFetchedWords[key] === wordData) { // This comparison might be tricky if objects are cloned
            // A better way is if wordData itself contains its original ID from storage
            // For now, assuming wordData might be a direct reference or we use word + date as a pseudo-key
            id = key; // This assumes allFetchedWords uses IDs that are useful as dataset.id
            break;
        }
    }
    // If wordData has an 'id' property (e.g. if words are {id: '...', word: '...', ...}) use it.
    // This example uses the key from allFetchedWords if found, or generates one.
    if (!id && wordData.id) id = wordData.id; // Prefer an ID if the word object itself has one
    if (!id) id = wordData.word + (wordData.dateAdded || Date.now()); // Fallback, less ideal for stable IDs


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
  // To reliably get wordData, we need its ID as stored in chrome.storage (which are the keys of allFetchedWords)
  // The row.dataset.id should correspond to these keys.
  const wordData = allFetchedWords[wordId];
  if (wordData) {
    document.querySelector("#wordId").value = wordId; // Store the actual ID
    document.querySelector("#wordInput").value = wordData.word;
    document.querySelector("#definitionInput").value = wordData.definition;
    document.querySelector("#languageInput").value = wordData.language;
    document.querySelector("#levelInput").value = wordData.level;
  } else {
      console.error("Word data not found for ID:", wordId, "Available IDs:", Object.keys(allFetchedWords));
      // Fallback or alert user if needed
  }
}

function handleDelete(wordId, wordText) {
  const confirmed = window.confirm(`Are you sure you want to delete "${wordText}"?`);
  if (!confirmed) {
    return;
  }
  // wordId here *must* be the key used in chrome.storage.local
  chrome.runtime.sendMessage({ action: "deleteWord", wordId }, () => {
    fetchWords(); // Refresh table and distribution bar
  });
}

function fetchWords() {
  chrome.runtime.sendMessage({ action: "getWords" }, (response) => {
    if (response) {
      allFetchedWords = response;
      filterWordTable(); // This will populate the table based on existing filters
      updateWordDistributionDisplay();
    } else {
      console.error("Failed to fetch words");
      allFetchedWords = {}; // Ensure it's an object
      filterWordTable(); // Still try to update table (will show 'no words')
      updateWordDistributionDisplay(); // Update bar (will show unknown)
    }
  });
}

document.querySelector("#wordForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const wordId = document.querySelector("#wordId").value; // This will be the actual key if editing
  const wordData = {
    word: document.querySelector("#wordInput").value,
    definition: document.querySelector("#definitionInput").value,
    language: document.querySelector("#languageInput").value,
    level: parseInt(document.querySelector("#levelInput").value, 10),
    // dateAdded will be set by background.js for new words, or preserved for edits
  };

  if (!wordData.language) { // languageInput value is "" if "Any Language" selected
    alert("Please select a specific language for the word.");
    return;
  }
  if (!wordData.level || isNaN(wordData.level)) {
     alert("Please select a valid level for the word.");
     return;
  }

  const action = wordId ? "editWord" : "addWord";
  const message = wordId ? { action, wordId, updatedData: wordData } : { action, wordData };

  chrome.runtime.sendMessage(message, (response) => {
    if (response && response.error) {
        alert("Error: " + response.error);
    } else {
        fetchWords();
        resetFormOnSubmit();
    }
  });
});

function resetFormOnSubmit() {
  document.querySelector("#wordForm").reset();
  document.querySelector("#wordId").value = "";
  // After resetting, the language and level dropdowns go to "Any Language"/"Any Level".
  // Filter the table to reflect this.
  filterWordTable();
}


function filterWordTable() {
  const wordInputFilter = document.querySelector("#wordInput").value.toLowerCase().trim();
  const languageFilter = document.querySelector("#languageInput").value; // Language from the main form for filtering
  const levelFilter = document.querySelector("#levelInput").value;     // Level from the main form for filtering

  let wordsToDisplayInTable = Object.values(allFetchedWords);

  // Apply word text filter only if it's not empty AND not in edit mode
  if (wordInputFilter && !document.querySelector("#wordId").value) {
      wordsToDisplayInTable = wordsToDisplayInTable.filter(wordData =>
          wordData.word.toLowerCase().includes(wordInputFilter)
      );
  }
  // Apply language filter (if a specific language is selected)
  if (languageFilter) { // True if not ""
      wordsToDisplayInTable = wordsToDisplayInTable.filter(wordData =>
          wordData.language === languageFilter
      );
  }
  // Apply level filter (if a specific level is selected)
  if (levelFilter) { // True if not ""
      wordsToDisplayInTable = wordsToDisplayInTable.filter(wordData =>
          String(wordData.level) === levelFilter
      );
  }
  populateTable(wordsToDisplayInTable);
}


// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    populateLanguageDropdowns(); // Populate language dropdowns
    fetchWords(); // Initial fetch

    const distributionLangFilter = document.getElementById('distributionLanguageFilter');
    if (distributionLangFilter) {
        distributionLangFilter.addEventListener('change', updateWordDistributionDisplay);
    }

    document.querySelector("#wordTable tbody").addEventListener("click", (event) => {
        const target = event.target;
        const row = target.closest(".clickableRow"); // Get the closest row for context

        if (target.classList.contains("deleteButton")) {
            const wordId = target.dataset.id; // ID of the word to delete
            const wordText = row ? row.querySelector("td:nth-child(1)").textContent : "this word";
            handleDelete(wordId, wordText);
        } else if (row) { // If a row was clicked (but not a button inside it)
            if (!target.closest("button")) {
                const wordId = row.dataset.id; // ID of the word to edit
                handleEdit(wordId);
            }
        }
    });

    // Form input listeners for live filtering of the table
    document.querySelector("#wordInput").addEventListener("input", () => {
        if (!document.querySelector("#wordId").value) { // Only filter if not in edit mode
            filterWordTable();
        }
    });
    document.querySelector("#languageInput").addEventListener("change", filterWordTable);
    document.querySelector("#levelInput").addEventListener("change", filterWordTable);
});