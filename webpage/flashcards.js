let currentWordId = null;
let currentWordData = null;

// Fetch words from storage and filter by levels 2, 3, and 4
function getRandomWord(callback) {
  chrome.runtime.sendMessage({ action: "getWords" }, (response) => {
    const words = Object.entries(response).filter(([id, wordData]) => {
      return wordData.level >= 2 && wordData.level <= 4;
    });

    if (words.length === 0) {
      alert("No words available for levels 2, 3, or 4.");
      return;
    }

    const randomIndex = Math.floor(Math.random() * words.length);
    const [wordId, wordData] = words[randomIndex];
    callback(wordId, wordData);
  });
}

// Display the flashcard with the definition
function displayFlashcard(wordId, wordData) {
  currentWordId = wordId;
  currentWordData = wordData;

  const definitionElement = document.querySelector("#definition");
  const wordInput = document.querySelector("#wordInput");
  const wordElement = document.querySelector("#word");
  const controls = document.querySelector("#controls");
  const levelAdjust = document.querySelector("#levelAdjust");
  const currentLevel = document.querySelector("#currentLevel");
  const nextButton = document.querySelector("#nextButton");

  definitionElement.textContent = wordData.definition;
  wordInput.value = "";
  wordInput.style.display = "inline-block";
  wordElement.textContent = wordData.word;
  wordElement.style.display = "none";
  controls.style.display = "none";
  nextButton.style.display = "none";

  // Set the dropdown to the current level of the word
  levelAdjust.value = wordData.level;

  // Update the current level display
  currentLevel.textContent = `Current Level: ${wordData.level}`;

  // Focus the input box
  wordInput.focus();
}

// Handle the enter key for revealing the word and moving to the next word
document.querySelector("#wordInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const wordElement = document.querySelector("#word");
    const controls = document.querySelector("#controls");
    const nextButton = document.querySelector("#nextButton");

    if (wordElement.style.display === "none") {
      // Reveal the word
      wordElement.style.display = "block";
      controls.style.display = "block";
      nextButton.style.display = "inline-block";
    } else {
      // Load the next word
      getRandomWord(displayFlashcard);
    }
  }
});

// Save the adjusted level
document.querySelector("#saveLevelButton").addEventListener("click", () => {
  const newLevel = parseInt(document.querySelector("#levelAdjust").value, 10);

  if (currentWordId && currentWordData) {
    const updatedData = { ...currentWordData, level: newLevel };
    chrome.runtime.sendMessage({ action: "editWord", wordId: currentWordId, updatedData }, () => {
      alert("Level updated successfully!");
    });
  }
});

// Initialize the first flashcard
document.addEventListener("DOMContentLoaded", () => {
  getRandomWord(displayFlashcard);
});

