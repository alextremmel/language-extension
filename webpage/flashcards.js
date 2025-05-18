// webpage/flashcards.js
import { availableLanguages } from '../shared/config.js';

let currentWordId = null;
let currentWordData = null;

function populateLanguageFilter() {
    const languageFilter = document.querySelector("#languageFilter");
    if (!languageFilter) return;

    languageFilter.innerHTML = ''; // Clear existing options

    // Hardcode "Any Language" option
    const anyOption = document.createElement('option');
    anyOption.value = ""; // Value for "Any Language"
    anyOption.textContent = "Any Language";
    languageFilter.appendChild(anyOption);

    // Add configured languages
    availableLanguages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang;
        languageFilter.appendChild(option);
    });
}


function getRandomWord(callback) {
  const selectedLanguage = document.querySelector("#languageFilter").value;

  chrome.runtime.sendMessage({ action: "getWords" }, (response) => {
    if (!response) {
        alert("Failed to get words from background script.");
        return;
    }
    let words = Object.entries(response);

    // Filter words by the selected language if a language is selected (not an empty string)
    if (selectedLanguage) {
      words = words.filter(([wordId, wordData]) => wordData.language === selectedLanguage);
    }

    if (words.length === 0) {
      const definitionElement = document.querySelector("#definition");
      if (definitionElement) definitionElement.textContent = "No words available for the selected language or criteria. Add some words or change the filter!";
      const wordInputElement = document.querySelector("#wordInput");
      const wordElement = document.querySelector("#word");
      const controlsElement = document.querySelector("#controls");
      if (wordInputElement) wordInputElement.style.display = "none";
      if (wordElement) wordElement.style.display = "none";
      if (controlsElement) controlsElement.style.display = "none";
      currentWordId = null; // Reset current word
      currentWordData = null;
      return;
    }

    // Create a weighted array based on word levels
    const weightedWords = [];
    words.forEach(([wordId, wordData]) => {
      let weight;
      switch (wordData.level) {
        case 1: weight = 1; break;
        case 2: weight = 4; break;
        case 3: weight = 8; break;
        case 4: weight = 10; break;
        default: weight = 0; // Exclude words with invalid or level 5 (proper nouns usually not for active recall this way)
      }
      for (let i = 0; i < weight; i++) {
        weightedWords.push([wordId, wordData]);
      }
    });

    if (weightedWords.length === 0) {
      const definitionElement = document.querySelector("#definition");
      if (definitionElement) definitionElement.textContent = "No suitable words for flashcards after weighting (e.g. only level 5 words).";
      const wordInputElement = document.querySelector("#wordInput");
      const wordElement = document.querySelector("#word");
      const controlsElement = document.querySelector("#controls");
      if (wordInputElement) wordInputElement.style.display = "none";
      if (wordElement) wordElement.style.display = "none";
      if (controlsElement) controlsElement.style.display = "none";
      currentWordId = null;
      currentWordData = null;
      return;
    }

    const randomIndex = Math.floor(Math.random() * weightedWords.length);
    const [wordId, wordData] = weightedWords[randomIndex];
    callback(wordId, wordData);
  });
}

// Add an event listener to reload flashcards when the language is changed
document.querySelector("#languageFilter").addEventListener("change", () => {
  // Reset flashcard view before loading new word
  const definitionElement = document.querySelector("#definition");
  if(definitionElement) definitionElement.textContent = "Loading next word...";
  const wordInputElement = document.querySelector("#wordInput");
  const wordElement = document.querySelector("#word");
  const controlsElement = document.querySelector("#controls");

  if(wordInputElement) {
    wordInputElement.style.display = "inline-block"; // Ensure input is visible
    wordInputElement.value = ""; // Clear previous input
  }
  if(wordElement) wordElement.style.display = "none";
  if(controlsElement) controlsElement.style.display = "none";

  getRandomWord(displayFlashcard);
});

// Handle clicks on the level table
document.querySelectorAll(".level-box").forEach((box) => {
  box.addEventListener("click", () => {
    document.querySelectorAll(".level-box").forEach((b) => b.classList.remove("selected"));
    box.classList.add("selected");
    if (currentWordData) {
      currentWordData.level = parseInt(box.dataset.level, 10);
    }
  });
});

// Highlight the current level in the table when displaying a flashcard
function displayFlashcard(wordId, wordData) {
  currentWordId = wordId;
  currentWordData = wordData;

  const definitionElement = document.querySelector("#definition");
  const wordInput = document.querySelector("#wordInput");
  const wordElement = document.querySelector("#word");
  const controls = document.querySelector("#controls");
  const levelBoxes = document.querySelectorAll(".level-box");

  if (definitionElement) definitionElement.textContent = wordData.definition;
  if (wordInput) {
    wordInput.value = "";
    wordInput.style.display = "inline-block";
    wordInput.focus(); // Focus the input box
  }
  if (wordElement) {
    wordElement.textContent = wordData.word;
    wordElement.style.display = "none";
  }
  if (controls) controls.style.display = "none";


  levelBoxes.forEach((box) => {
    box.classList.remove("selected");
    if (parseInt(box.dataset.level, 10) === wordData.level) {
      box.classList.add("selected");
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const wordInput = document.querySelector("#wordInput");
    const wordElement = document.querySelector("#word");
    const controls = document.querySelector("#controls");

    // Ensure we are in a state where 'Enter' makes sense (e.g. a word is loaded)
    if (!currentWordId || !currentWordData) {
        // If no word is loaded (e.g. "No words available"), try to load one or do nothing.
        // This prevents errors if user hits Enter on an empty flashcard screen.
        getRandomWord(displayFlashcard);
        return;
    }


    if (wordElement.style.display === "none") {
      // Word input is visible, user has (presumably) typed. Reveal the word.
      wordElement.style.display = "block";
      controls.style.display = "block"; // Show level controls
      // Optional: check wordInput.value against wordData.word and give feedback
    } else {
      // Word is revealed, controls are visible. User hits Enter to save level and get next word.
      const selectedBox = document.querySelector(".level-box.selected");
      if (!selectedBox) {
        alert("Please select a new level for the word.");
        return;
      }
      const newLevel = parseInt(selectedBox.dataset.level, 10);

      if (currentWordId && currentWordData) { // Redundant check, but safe
        const updatedData = { ...currentWordData, level: newLevel };
        chrome.runtime.sendMessage({ action: "editWord", wordId: currentWordId, updatedData }, () => {
          getRandomWord(displayFlashcard);
        });
      }
    }
  }
});

// Initialize the first flashcard
document.addEventListener("DOMContentLoaded", () => {
  populateLanguageFilter();
  getRandomWord(displayFlashcard);
});