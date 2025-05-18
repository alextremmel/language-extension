// webpage/wordList.js
import { createLevelDistributionBarHTML } from '../shared/uiUtils.js';
import { availableLanguages } from '../shared/config.js';

let allFetchedWords = {}; // Stores all words fetched from storage
let currentlyDisplayedWords = []; // Stores the words currently shown in the table for export

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

    if (selectedLanguage) { 
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
            dropdown.innerHTML = ''; 

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
    let id; 
    for (const key in allFetchedWords) {
        if (allFetchedWords[key] === wordData) { 
            id = key; 
            break;
        }
    }
    if (!id && wordData.id) id = wordData.id; 
    if (!id) id = wordData.word + (wordData.dateAdded || Date.now());


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
  const wordData = allFetchedWords[wordId];
  if (wordData) {
    document.querySelector("#wordId").value = wordId; 
    document.querySelector("#wordInput").value = wordData.word;
    document.querySelector("#definitionInput").value = wordData.definition;
    document.querySelector("#languageInput").value = wordData.language;
    document.querySelector("#levelInput").value = wordData.level;
  } else {
      console.error("Word data not found for ID:", wordId, "Available IDs:", Object.keys(allFetchedWords));
  }
}

function handleDelete(wordId, wordText) {
  const confirmed = window.confirm(`Are you sure you want to delete "${wordText}"?`);
  if (!confirmed) {
    return;
  }
  chrome.runtime.sendMessage({ action: "deleteWord", wordId }, () => {
    fetchWords(); 
  });
}

function fetchWords() {
  chrome.runtime.sendMessage({ action: "getWords" }, (response) => {
    if (response) {
      allFetchedWords = response;
      filterWordTable(); 
      updateWordDistributionDisplay();
    } else {
      console.error("Failed to fetch words");
      allFetchedWords = {}; 
      filterWordTable(); 
      updateWordDistributionDisplay(); 
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

  if (!wordData.language) { 
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
  filterWordTable();
}


function filterWordTable() {
  const wordInputFilter = document.querySelector("#wordInput").value.toLowerCase().trim();
  const languageFilter = document.querySelector("#languageInput").value; 
  const levelFilter = document.querySelector("#levelInput").value;     

  let wordsToDisplayInTable = Object.values(allFetchedWords);

  if (wordInputFilter && !document.querySelector("#wordId").value) {
      wordsToDisplayInTable = wordsToDisplayInTable.filter(wordData =>
          wordData.word.toLowerCase().includes(wordInputFilter)
      );
  }
  if (languageFilter) { 
      wordsToDisplayInTable = wordsToDisplayInTable.filter(wordData =>
          wordData.language === languageFilter
      );
  }
  if (levelFilter) { 
      wordsToDisplayInTable = wordsToDisplayInTable.filter(wordData =>
          String(wordData.level) === levelFilter
      );
  }
  
  // Update the global variable for export
  currentlyDisplayedWords = [...wordsToDisplayInTable]; 
  populateTable(wordsToDisplayInTable);
}

// --- CSV Import/Export Functions ---

/**
 * Handles the export of currently filtered words to a CSV file.
 */
function handleExportToCSV() {
    if (currentlyDisplayedWords.length === 0) {
        alert("No words to export. Please clear filters or add words.");
        return;
    }

    // Define CSV headers
    const headers = ["Word", "Definition", "Language", "Level"];
    // Prepare CSV content
    let csvContent = headers.join(",") + "\n";

    currentlyDisplayedWords.forEach(wordData => {
        // Sanitize data for CSV (e.g., escape commas, quotes, newlines within fields)
        const sanitize = (str) => {
            if (str === null || typeof str === 'undefined') return '';
            let s = String(str);
            // If the string contains a comma, newline, or double quote, enclose it in double quotes
            if (s.includes(',') || s.includes('\n') || s.includes('"')) {
                // Escape existing double quotes by doubling them
                s = s.replace(/"/g, '""');
                return `"${s}"`;
            }
            return s;
        };

        const row = [
            sanitize(wordData.word),
            sanitize(wordData.definition),
            sanitize(wordData.language),
            sanitize(wordData.level)
        ];
        csvContent += row.join(",") + "\n";
    });

    // Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) { // feature detection
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "word_list_export.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        alert("CSV export is not supported in your browser.");
    }
}

/**
 * Handles the import of words from a CSV file.
 * @param {Event} event - The file input change event.
 */
function handleImportFromCSV(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    if (!file.name.endsWith('.csv')) {
        alert("Please select a .csv file.");
        // Reset file input so the same file can be selected again if needed
        event.target.value = null; 
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n').filter(row => row.trim() !== ''); // Split rows and remove empty ones

        if (rows.length <= 1) {
            alert("CSV file is empty or contains only headers.");
            event.target.value = null;
            return;
        }

        const headerRow = rows[0].trim().toLowerCase().split(',');
        const expectedHeaders = ["word", "definition", "language", "level"];
        
        // Basic header validation
        if (!expectedHeaders.every((h, i) => headerRow[i] && headerRow[i].trim() === h)) {
             alert(`Invalid CSV header. Expected: "${expectedHeaders.join(',')}"\nFound: "${rows[0].trim()}"`);
             event.target.value = null;
             return;
        }

        let importedCount = 0;
        let errorCount = 0;
        const wordsToImport = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].trim();
            if (!row) continue; // Skip empty lines

            // Simple CSV parsing: split by comma. Does not handle commas within quoted fields well.
            // For more robust parsing, a library would be needed.
            const values = row.split(','); 

            // Basic validation: check number of columns
            if (values.length !== expectedHeaders.length) {
                console.warn(`Skipping row ${i + 1}: Incorrect number of columns. Expected ${expectedHeaders.length}, got ${values.length}. Row: ${row}`);
                errorCount++;
                continue;
            }
            
            // Trim and unquote values if they are quoted
            const unquote = (str) => {
                if (typeof str === 'string' && str.startsWith('"') && str.endsWith('"')) {
                    return str.slice(1, -1).replace(/""/g, '"'); // Remove surrounding quotes and unescape double quotes
                }
                return str;
            };

            const word = unquote(values[0]?.trim());
            const definition = unquote(values[1]?.trim());
            const language = unquote(values[2]?.trim());
            const levelStr = unquote(values[3]?.trim());
            const level = parseInt(levelStr, 10);

            if (!word || !definition || !language || isNaN(level) || level < 1 || level > 5) {
                console.warn(`Skipping row ${i + 1}: Invalid data. Word: ${word}, Def: ${definition}, Lang: ${language}, Level: ${levelStr}. Row: ${row}`);
                errorCount++;
                continue;
            }

            // Check if language is one of the available languages
            if (!availableLanguages.includes(language)) {
                console.warn(`Skipping row ${i + 1}: Language "${language}" is not in the list of available languages. Word: ${word}. Row: ${row}`);
                errorCount++;
                continue;
            }
            
            wordsToImport.push({ word, definition, language, level });
        }

        if (wordsToImport.length > 0) {
            // Send words to background script for adding
            // Using a loop of addWord for simplicity. For very large imports, a bulk add message would be better.
            let wordsProcessed = 0;
            wordsToImport.forEach(wordData => {
                chrome.runtime.sendMessage({ action: "addWord", wordData }, (response) => {
                    wordsProcessed++;
                    if (response && response.error) {
                        console.error("Error importing word:", wordData.word, response.error);
                        // Optionally increment a specific import error counter
                    } else {
                        importedCount++;
                    }
                    // Refresh list after all messages are likely processed
                    if (wordsProcessed === wordsToImport.length) {
                        fetchWords(); 
                        alert(`CSV Import Complete!\nSuccessfully imported: ${importedCount} words.\nSkipped due to errors: ${errorCount} words.`);
                    }
                });
            });
        } else if (errorCount > 0) {
             alert(`CSV Import Failed.\nNo words were imported.\nSkipped due to errors: ${errorCount} words.`);
        } else {
            alert("No valid words found to import in the CSV file.");
        }
        event.target.value = null; // Reset file input
    };

    reader.onerror = function() {
        alert("Error reading the CSV file.");
        console.error("FileReader error:", reader.error);
        event.target.value = null; // Reset file input
    };

    reader.readAsText(file);
}


// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    populateLanguageDropdowns(); 
    fetchWords(); 

    const distributionLangFilter = document.getElementById('distributionLanguageFilter');
    if (distributionLangFilter) {
        distributionLangFilter.addEventListener('change', updateWordDistributionDisplay);
    }

    document.querySelector("#wordTable tbody").addEventListener("click", (event) => {
        const target = event.target;
        const row = target.closest(".clickableRow"); 

        if (target.classList.contains("deleteButton")) {
            const wordId = target.dataset.id; 
            const wordText = row ? row.querySelector("td:nth-child(1)").textContent : "this word";
            handleDelete(wordId, wordText);
        } else if (row) { 
            if (!target.closest("button")) {
                const wordId = row.dataset.id; 
                handleEdit(wordId);
            }
        }
    });

    document.querySelector("#wordInput").addEventListener("input", () => {
        if (!document.querySelector("#wordId").value) { 
            filterWordTable();
        }
    });
    document.querySelector("#languageInput").addEventListener("change", filterWordTable);
    document.querySelector("#levelInput").addEventListener("change", filterWordTable);

    // Event listeners for new CSV buttons
    const exportButton = document.getElementById("exportCsvButton");
    if (exportButton) {
        exportButton.addEventListener("click", handleExportToCSV);
    }

    const importButton = document.getElementById("importCsvButton");
    const csvFileInput = document.getElementById("csvFileInput");
    if (importButton && csvFileInput) {
        importButton.addEventListener("click", () => {
            csvFileInput.click(); // Trigger the hidden file input
        });
        csvFileInput.addEventListener("change", handleImportFromCSV);
    }
});
