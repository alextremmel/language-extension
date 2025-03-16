document.addEventListener("DOMContentLoaded", () => {
    const wordTableBody = document.getElementById("wordTableBody");

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
                            <option value="1" ${wordInfo.level === 1 ? "selected" : ""}>1 - Easy</option>
                            <option value="2" ${wordInfo.level === 2 ? "selected" : ""}>2 - Medium</option>
                            <option value="3" ${wordInfo.level === 3 ? "selected" : ""}>3 - Hard</option>
                            <option value="4" ${wordInfo.level === 4 ? "selected" : ""}>4 - Very Hard</option>
                        </select>
                    </td>
                    <td>
                        <select class="edit-input language-edit">
                            <option value="English" ${wordInfo.language === "English" ? "selected" : ""}>English</option>
                            <option value="Korean" ${wordInfo.language === "Korean" ? "selected" : ""}>Korean</option>
                        </select>
                    </td>
                    <td><input type="text" class="edit-input context-edit" value="${wordInfo.context}"></td>
                    <td><input type="text" class="edit-input notes-edit" value="${wordInfo.notes}"></td>
                    <td><input type="text" class="edit-input definition-edit" value="${wordInfo.definition || ''}"></td>
                    <td><input type="text" class="edit-input date-edit" value="${wordInfo.dateAdded || new Date().toLocaleDateString('en-US')}"></td>
                    <td>
                        <button class="btn btn-save">Save</button>
                        <button class="btn btn-delete">Delete</button>
                    </td>
                `;

                const saveButton = row.querySelector(".btn-save");
                const deleteButton = row.querySelector(".btn-delete");

                saveButton.addEventListener("click", () => {
                    const updatedWord = row.querySelector(".word-edit").value.trim();
                    const updatedLevel = parseInt(row.querySelector(".level-edit").value);
                    const updatedLanguage = row.querySelector(".language-edit").value;
                    const updatedContext = row.querySelector(".context-edit").value.trim();
                    const updatedNotes = row.querySelector(".notes-edit").value.trim();
                    const updatedDefinition = row.querySelector(".definition-edit").value.trim();
                    const updatedDate = row.querySelector(".date-edit").value.trim();

                    if (!updatedWord) {
                        alert("Word cannot be empty.");
                        return;
                    }

                    delete words[word]; // Remove old key if word was changed
                    words[updatedWord] = { level: updatedLevel, language: updatedLanguage, context: updatedContext, notes: updatedNotes, definition: updatedDefinition, dateAdded: updatedDate };

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

                wordTableBody.appendChild(row);
            });
        });
    }

    document.getElementById("addWord").addEventListener("click", () => {
        const newWord = document.getElementById("newWord").value.trim();
        const newLevel = parseInt(document.getElementById("newLevel").value);
        const newLanguage = document.getElementById("newLanguage").value;
        const newContext = document.getElementById("newContext").value.trim();
        const newNotes = document.getElementById("newNotes").value.trim();
        const newDefinition = document.getElementById("newDefinition").value.trim();
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

            words[newWord] = { level: newLevel, language: newLanguage, context: newContext, notes: newNotes, definition: newDefinition, dateAdded: dateAdded };

            chrome.storage.local.set({ userWords: words }, () => {
                loadWords();
                document.getElementById("newWord").value = "";
                document.getElementById("newContext").value = "";
                document.getElementById("newNotes").value = "";
                document.getElementById("newDefinition").value = "";
            });
        });
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

    loadWords();
});