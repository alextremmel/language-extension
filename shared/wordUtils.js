/**
 * Processes an input string by splitting it into words.
 * 
 * @param {string} input - The input string to process.
 * @returns {string[]} - An array of processed words, or an empty array if the input is empty.
 */
function processInputWords(input) {
    const trimmedInput = input.trim();
    if (trimmedInput === "") {
        return []; // Return an empty array if the input is empty
    }
    return trimmedInput
        .split(/\s+/) // Split into words
        .filter(word => word.trim() !== ""); // Remove empty strings
}

// Export the utility functions
export { processInputWords };