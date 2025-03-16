document.addEventListener("DOMContentLoaded", () => {
    const wordTableBody = document.getElementById("wordTableBody");

    function loadWords() {
        chrome.storage.local.get("userWords", (data) => {
            const words = data.userWords || {};
            wordTableBody.innerHTML = "";

            Object.keys(words).forEach((word) => {
                const wordInfo = words[word];

                const row = document.createElement("tr");

                row.innerHTML = `
                    <td><input type="text" class="edit-input word-edit" value="${word}" disabled></td>
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
                    <td>
                        <button class="btn btn-edit">Edit</button>
                        <button class="btn btn-save" style="display:none;">Save</button>
                        <button class="btn btn-delete">Delete</button>
                    </td>
                `;

                // Attach events
                const editButton = row.querySelector(".btn-edit");
                const saveButton = row.querySelector(".btn-save");
                const deleteButton = row.querySelector(".btn-delete");

                editButton.addEventListener("click", () => {
                    row.querySelectorAll(".edit-input").forEach(input => input.disabled = false);
                    editButton.style.display = "none";
                    saveButton.style.display = "inline-block";
                });

                saveButton.addEventListener("click", () => {
                    const updatedWord = row.querySelector(".word-edit").value.trim();
                    const updatedLevel = parseInt(row.querySelector(".level-edit").value);
                    const updatedLanguage = row.querySelector(".language-edit").value;
                    const updatedContext = row.querySelector(".context-edit").value.trim();
                    const updatedNotes = row.querySelector(".notes-edit").value.trim();

                    if (!updatedWord) {
                        alert("Word cannot be empty.");
                        return;
                    }

                    // Update in storage
                    delete words[word]; // Remove old key if word was changed
                    words[updatedWord] = { level: updatedLevel, language: updatedLanguage, context: updatedContext, notes: updatedNotes };

                    chrome.storage.local.set({ userWords: words }, () => {
                        loadWords();
                    });
                });

                deleteButton.addEventListener("click", () => {
                    if (confirm(`Delete "${word}"?`)) {
                        delete words[word];
                        chrome.storage.local.set({ userWords: words }, () => {
                            loadWords();
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

            words[newWord] = { level: newLevel, language: newLanguage, context: newContext, notes: newNotes };

            chrome.storage.local.set({ userWords: words }, () => {
                loadWords();
                document.getElementById("newWord").value = "";
                document.getElementById("newContext").value = "";
                document.getElementById("newNotes").value = "";
            });
        });
    });

    loadWords();
});
