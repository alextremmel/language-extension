// shared/uiUtils.js

// Colors for the distribution bar, can be imported or re-defined if needed elsewhere too
export const levelColors = {
    "1": "rgba(0, 216, 0, 0.85)",    // Green, from highlight.css .highlight-level-1
    "2": "rgba(255, 215, 0, 0.85)",  // Gold/Yellow, from highlight.css .highlight-level-2
    "3": "rgba(255, 149, 0, 0.85)",  // Orange, from highlight.css .highlight-level-3
    "4": "rgba(255, 0, 0, 0.85)",    // Red, from highlight.css .highlight-level-4
    "5": "rgba(79, 135, 255, 0.85)", // Blue, from highlight.css .highlight-level-5
    "unknown": "rgba(204, 204, 204, 0.85)" // Light Grey for words not in user's list or undefined
};

/**
 * Creates HTML for a level distribution bar.
 * @param {object} levelDistribution - An object with keys as level numbers (string "1"-"5", "unknown") and values as percentages.
 * @param {object} [options={}] - Optional parameters.
 * @param {string} [options.width="100px"] - Width of the bar.
 * @param {string} [options.height="15px"] - Height of the bar.
 * @param {string} [options.defaultTitle="Level Distribution"] - A title for the bar container (used for tooltips).
 * @returns {string} HTML string for the distribution bar.
 */
export function createLevelDistributionBarHTML(levelDistribution, options = {}) {
    const barWidth = options.width || "100px";
    const barHeight = options.height || "15px";
    const defaultTitle = options.defaultTitle || "Level Distribution";

    if (!levelDistribution || typeof levelDistribution !== 'object' || Object.keys(levelDistribution).length === 0) {
        return `<div style="display: flex; width: ${barWidth}; height: ${barHeight}; border: 1px solid #ccc; border-radius: 3px; overflow: hidden;" title="${defaultTitle}: No data available">
                    <div style="width: 100%; background-color: ${levelColors.unknown};"></div>
                </div>`;
    }

    let barHTML = `<div style="display: flex; width: ${barWidth}; height: ${barHeight}; border: 1px solid #ccc; border-radius: 3px; overflow: hidden;" title="${defaultTitle}">`;
    const order = ["1", "2", "3", "4", "5", "unknown"]; // Defines the order of segments

    let totalPercentageFromInput = 0;
    for (const level of order) {
        totalPercentageFromInput += (levelDistribution[level] || 0);
    }

    if (totalPercentageFromInput === 0) {
         // If all provided percentages are zero (e.g., empty story content might lead to unknown: 0 if not handled to be unknown:100)
         // Or if only "unknown: 100" was effectively passed via a zero sum of knowns.
         const titleText = (levelDistribution.unknown === 100) ? "100% Unknown" : `${defaultTitle}: No scannable words or all data zero`;
         barHTML += `<div style="width: 100%; background-color: ${levelColors.unknown};" title="${titleText}"></div>`;
    } else {
        // Scale percentages to ensure they sum to 100 for visual representation if they don't already.
        const scaleFactor = totalPercentageFromInput > 0 ? 100 / totalPercentageFromInput : 1;

        for (const level of order) {
            const originalPercentage = levelDistribution[level] || 0;
            if (originalPercentage > 0) {
                const scaledPercentage = originalPercentage * scaleFactor; // Use scaled for width
                const color = levelColors[level] || levelColors.unknown;
                // Use originalPercentage for the title attribute for accuracy
                const titleText = level === "unknown" ? `Unknown: ${originalPercentage.toFixed(1)}%` : `Level ${level}: ${originalPercentage.toFixed(1)}%`;
                barHTML += `<div style="width: ${scaledPercentage.toFixed(2)}%; background-color: ${color};" title="${titleText}"></div>`;
            }
        }
    }

    barHTML += '</div>';
    return barHTML;
}