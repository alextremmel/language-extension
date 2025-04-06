let currentWordId = null;
let currentWordData = null;

function getRandomWord(callback) {
  const selectedLanguage = document.querySelector("#languageFilter").value;

  chrome.runtime.sendMessage({ action: "getWords" }, (response) => {
    let words = Object.entries(response);

    // Filter words by the selected language if a language is selected
    if (selectedLanguage) {
      words = words.filter(([wordId, wordData]) => wordData.language === selectedLanguage);
    }

    if (words.length === 0) {
      alert("No words available for the selected language.");
      return;
    }

    // Create a weighted array based on word levels
    const weightedWords = [];
    words.forEach(([wordId, wordData]) => {
      let weight;
      switch (wordData.level) {
        case 1:
          weight = 1; // Rarely include level 1 words
          break;
        case 2:
          weight = 4; // Moderate weight for level 2
          break;
        case 3:
          weight = 8; // Higher weight for level 3
          break;
        case 4:
          weight = 10; // Highest weight for level 4
          break;
        default:
          weight = 0; // Exclude words with invalid levels
      }

      for (let i = 0; i < weight; i++) {
        weightedWords.push([wordId, wordData]);
      }
    });

    if (weightedWords.length === 0) {
      alert("No words available after weighting.");
      return;
    }

    // Select a random word from the weighted array
    const randomIndex = Math.floor(Math.random() * weightedWords.length);
    const [wordId, wordData] = weightedWords[randomIndex];
    callback(wordId, wordData);
  });
}

// Add an event listener to reload flashcards when the language is changed
document.querySelector("#languageFilter").addEventListener("change", () => {
  getRandomWord(displayFlashcard);
});

// Handle clicks on the level table
document.querySelectorAll(".level-box").forEach((box) => {
  box.addEventListener("click", () => {
    // Remove the 'selected' class from all boxes
    document.querySelectorAll(".level-box").forEach((b) => b.classList.remove("selected"));

    // Add the 'selected' class to the clicked box
    box.classList.add("selected");

    // Update the currentWordData level to reflect the selected level
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

  definitionElement.textContent = wordData.definition;
  wordInput.value = "";
  wordInput.style.display = "inline-block";
  wordElement.textContent = wordData.word;
  wordElement.style.display = "none";
  controls.style.display = "none";

  // Highlight the current level in the table
  levelBoxes.forEach((box) => {
    box.classList.remove("selected");
    if (parseInt(box.dataset.level, 10) === wordData.level) {
      box.classList.add("selected");
    }
  });

  // Focus the input box
  wordInput.focus();
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const wordElement = document.querySelector("#word");
    const controls = document.querySelector("#controls");

    if (wordElement.style.display === "none") {
      // Reveal the word
      wordElement.style.display = "block";
      controls.style.display = "block";
    } else {
      // Save the new level and load the next word
      const selectedBox = document.querySelector(".level-box.selected");
      const newLevel = parseInt(selectedBox.dataset.level, 10);

      if (currentWordId && currentWordData) {
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
  getRandomWord(displayFlashcard);
});