document.addEventListener("DOMContentLoaded", () => {
    const wordTableBody = document.getElementById("wordTableBody");
    const newRelatedWordsList = document.getElementById("newRelatedWordsList");
    const newRelatedWordInput = document.getElementById("newRelatedWordInput");

    function loadWords(filter = {}) {
        chrome.storage.local.get("userWords", (data) => {
            const words = data.userWords || {};
            wordTableBody.innerHTML = "";

            Object.keys(words).forEach((word, index) => {
                const wordInfo = words[word];

                if (filter.word && !word.includes(filter.word)) return;
                if (filter.level && wordInfo.level != filter.level) return;
                if (filter.language && wordInfo.language != filter.language) return;

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td><input type="text" class="edit-input word-edit" value="${word}"></td>
                    <td>
                        <select class="edit-input level-edit">
                            <option value="1" ${wordInfo.level === 1 ? "selected" : ""}>1 - Easy (Green)</option>
                            <option value="2" ${wordInfo.level === 2 ? "selected" : ""}>2 - Medium (Yellow)</option>
                            <option value="3" ${wordInfo.level === 3 ? "selected" : ""}>3 - Hard (Orange)</option>
                            <option value="4" ${wordInfo.level === 4 ? "selected" : ""}>4 - Very Hard (Red)</option>
                            <option value="5" ${wordInfo.level === 5 ? "selected" : ""}>5 - Proper Noun (Blue)</option>
                        </select>
                    </td>
                    <td>
                        <select class="edit-input language-edit">
                            <option value="Korean" ${wordInfo.language === "Korean" ? "selected" : ""}>Korean</option>
                            <option value="English" ${wordInfo.language === "English" ? "selected" : ""}>English</option>
                            <option value="French" ${wordInfo.language === "French" ? "selected" : ""}>French</option>
                            <option value="Spanish" ${wordInfo.language === "Spanish" ? "selected" : ""}>Spanish</option>
                            <option value="Chinese" ${wordInfo.language === "Chinese" ? "selected" : ""}>Chinese</option>
                        </select>
                    </td>
                    <td><input type="text" class="edit-input notes-edit" value="${wordInfo.notes}"></td>
                    <td><input type="text" class="edit-input definition-edit" value="${wordInfo.definition || ''}"></td>
                    <td>
                        <ul class="related-words-list">
                            ${wordInfo.relatedWords ? wordInfo.relatedWords.split(',').map(relatedWord => {
                                const [relatedWordText, relatedWordLevel] = relatedWord.split(':');
                                return `
                                    <li>
                                        ${relatedWordText.trim()}
                                        <select class="related-word-level">
                                            <option value="1" ${relatedWordLevel === '1' ? "selected" : ""}>1 - Easy (Green)</option>
                                            <option value="2" ${relatedWordLevel === '2' ? "selected" : ""}>2 - Medium (Yellow)</option>
                                            <option value="3" ${relatedWordLevel === '3' ? "selected" : ""}>3 - Hard (Orange)</option>
                                            <option value="4" ${relatedWordLevel === '4' ? "selected" : ""}>4 - Very Hard (Red)</option>
                                            <option value="5" ${relatedWordLevel === '5' ? "selected" : ""}>5 - Proper Noun (Blue)</option>
                                        </select>
                                        <button class="btn btn-delete-related-word" data-word="${word}" data-related-word="${relatedWordText.trim()}">Delete</button>
                                    </li>
                                `;
                            }).join('') : ''}
                        </ul>
                        <input type="text" class="edit-input related-word-input">
                        <button class="btn btn-add-related-word" data-word="${word}">Add Related Word</button>
                    </td>
                    <td><input type="text" class="edit-input date-edit" value="${wordInfo.dateAdded || new Date().toLocaleDateString('en-US')}"></td>
                    <td>
                        <button class="btn btn-save">Save</button>
                        <button class="btn btn-delete">Delete</button>
                    </td>
                `;

                const saveButton = row.querySelector(".btn-save");
                const deleteButton = row.querySelector(".btn-delete");

                // Add event listeners to detect changes and change the save button color
                row.querySelectorAll(".edit-input").forEach(input => {
                    input.addEventListener("input", () => {
                        saveButton.style.backgroundColor = "yellow";
                    });
                });

                saveButton.addEventListener("click", () => {
                    const updatedWord = row.querySelector(".word-edit").value.trim();
                    const updatedLevel = parseInt(row.querySelector(".level-edit").value);
                    const updatedLanguage = row.querySelector(".language-edit").value;
                    const updatedNotes = row.querySelector(".notes-edit").value.trim();
                    const updatedDefinition = row.querySelector(".definition-edit").value.trim();
                    const updatedRelatedWords = Array.from(row.querySelectorAll(".related-words-list li")).map(li => {
                        const relatedWord = li.childNodes[0].textContent.trim();
                        const relatedWordLevel = li.querySelector(".related-word-level").value;
                        return `${relatedWord}:${relatedWordLevel}`;
                    }).join(',');
                    const updatedDate = row.querySelector(".date-edit").value.trim();

                    if (!updatedWord) {
                        alert("Word cannot be empty.");
                        return;
                    }

                    delete words[word]; // Remove old key if word was changed
                    words[updatedWord] = { level: updatedLevel, language: updatedLanguage, notes: updatedNotes, definition: updatedDefinition, relatedWords: updatedRelatedWords, dateAdded: updatedDate };

                    chrome.storage.local.set({ userWords: words }, () => {
                        loadWords(filter);
                    });
                });

                deleteButton.addEventListener("click", () => {
                    if (confirm(`Delete "${word}"?`)) {
                        delete words[word];
                        chrome.storage.local.set({ userWords: words }, () => {
                            loadWords(filter);
                        });
                    }
                });

                row.querySelector(".btn-add-related-word").addEventListener("click", (event) => {
                    const word = event.target.getAttribute('data-word');
                    const relatedWordInput = row.querySelector(".related-word-input");
                    const relatedWord = relatedWordInput.value.trim();
                    if (relatedWord) {
                        const relatedWordsList = row.querySelector(".related-words-list");
                        const li = document.createElement("li");
                        li.innerHTML = `${relatedWord} 
                            <select class="related-word-level">
                                <option value="1">1 - Easy (Green)</option>
                                <option value="2">2 - Medium (Yellow)</option>
                                <option value="3">3 - Hard (Orange)</option>
                                <option value="4">4 - Very Hard (Red)</option>
                                <option value="5">5 - Proper Noun (Blue)</option>
                            </select>
                            <button class="btn btn-delete-related-word" data-word="${word}" data-related-word="${relatedWord}">Delete</button>`;
                        relatedWordsList.appendChild(li);
                        relatedWordInput.value = '';
                    }
                });

                row.querySelectorAll(".btn-delete-related-word").forEach(button => {
                    button.addEventListener("click", (event) => {
                        const li = event.target.closest("li");
                        li.remove();
                    });
                });

                wordTableBody.appendChild(row);
            });
        });
    }

    function exportWords(filter = {}) {
        chrome.storage.local.get("userWords", (data) => {
            const words = data.userWords || {};
            const filteredWords = Object.keys(words).filter(word => {
                const wordInfo = words[word];
                if (filter.word && !word.includes(filter.word)) return false;
                if (filter.level && wordInfo.level != filter.level) return false;
                if (filter.language && wordInfo.language != filter.language) return false;
                return true;
            });

            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Word,Level,Language,Notes,Definition,Date Added,Related Words\n";

            filteredWords.forEach(word => {
                const wordInfo = words[word];
                const row = [
                    word,
                    wordInfo.level,
                    wordInfo.language,
                    wordInfo.notes,
                    wordInfo.definition,
                    wordInfo.dateAdded,
                    wordInfo.relatedWords
                ].join(",");
                csvContent += row + "\n";
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "words.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    function copyWordsToClipboard() {
        chrome.storage.local.get("userWords", (data) => {
            const words = data.userWords || {};
            const allWords = Object.keys(words).join(", ");
            navigator.clipboard.writeText(allWords).then(() => {
                alert("Words copied to clipboard!");
            }).catch(err => {
                console.error("Could not copy words: ", err);
            });
        });
    }

    function importWords(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const csvContent = event.target.result;
            const rows = csvContent.split("\n").slice(1); // Skip header row
            const newWords = {};

            rows.forEach(row => {
                const [word, level, language, notes, definition, dateAdded, relatedWords] = row.split(",");
                if (word) {
                    newWords[word.trim()] = {
                        level: parseInt(level.trim()),
                        language: language.trim(),
                        notes: notes.trim(),
                        definition: definition.trim(),
                        dateAdded: dateAdded.trim(),
                        relatedWords: relatedWords.trim()
                    };
                }
            });

            chrome.storage.local.get("userWords", (data) => {
                const words = data.userWords || {};
                Object.assign(words, newWords);
                chrome.storage.local.set({ userWords: words }, () => {
                    loadWords();
                });
            });
        };
        reader.readAsText(file);
    }

    document.getElementById("addWord").addEventListener("click", () => {
        const newWord = document.getElementById("newWord").value.trim();
        const newLevel = parseInt(document.getElementById("newLevel").value);
        const newLanguage = document.getElementById("newLanguage").value;
        const newNotes = document.getElementById("newNotes").value.trim();
        const newDefinition = document.getElementById("newDefinition").value.trim();
        const newRelatedWords = Array.from(newRelatedWordsList.querySelectorAll("li")).map(li => {
            const relatedWord = li.childNodes[0].textContent.trim();
            const relatedWordLevel = li.querySelector(".related-word-level").value;
            return `${relatedWord}:${relatedWordLevel}`;
        }).join(',');
        const dateAdded = new Date().toLocaleDateString('en-US');

        if (!newWord) {
            alert("Please enter a word.");
            return;
        }

        chrome.storage.local.get("userWords", (data) => {
            let words = data.userWords || {};

            if (words[newWord]) {
                alert("This word already exists.");
                return;
            }

            words[newWord] = { level: newLevel, language: newLanguage, notes: newNotes, definition: newDefinition, relatedWords: newRelatedWords, dateAdded: dateAdded };

            chrome.storage.local.set({ userWords: words }, () => {
                loadWords();
                document.getElementById("newWord").value = "";
                document.getElementById("newNotes").value = "";
                document.getElementById("newDefinition").value = "";
                newRelatedWordsList.innerHTML = "";
            });
        });
    });

    document.getElementById("addRelatedWord").addEventListener("click", () => {
        const relatedWord = newRelatedWordInput.value.trim();
        if (relatedWord) {
            const li = document.createElement("li");
            li.innerHTML = `${relatedWord} 
                <select class="related-word-level">
                    <option value="1">1 - Easy (Green)</option>
                    <option value="2">2 - Medium (Yellow)</option>
                    <option value="3">3 - Hard (Orange)</option>
                    <option value="4">4 - Very Hard (Red)</option>
                    <option value="5">5 - Proper Noun (Blue)</option>
                </select>
                <button class="btn btn-delete-related-word">Delete</button>`;
            newRelatedWordsList.appendChild(li);
            newRelatedWordInput.value = '';
            li.querySelector(".btn-delete-related-word").addEventListener("click", () => {
                li.remove();
            });
        }
    });

    document.getElementById("filterWords").addEventListener("click", () => {
        const filterWord = document.getElementById("filterWord").value.trim();
        const filterLevel = document.getElementById("filterLevel").value;
        const filterLanguage = document.getElementById("filterLanguage").value;

        const filter = {
            word: filterWord,
            level: filterLevel,
            language: filterLanguage
        };

        loadWords(filter);
    });

    document.getElementById("exportWords").addEventListener("click", () => {
        const filterWord = document.getElementById("filterWord").value.trim();
        const filterLevel = document.getElementById("filterLevel").value;
        const filterLanguage = document.getElementById("filterLanguage").value;

        const filter = {
            word: filterWord,
            level: filterLevel,
            language: filterLanguage
        };

        exportWords(filter);
    });

    document.getElementById("copyWords").addEventListener("click", () => {
        copyWordsToClipboard();
    });

    document.getElementById("importWords").addEventListener("click", () => {
        document.getElementById("importFile").click();
    });

    document.getElementById("importFile").addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            importWords(file);
        }
    });

    loadWords();
});