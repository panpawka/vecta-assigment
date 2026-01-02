import { readJSON } from "../db.js";

/**
 * Searches the knowledge base for relevant articles.
 * @param {string} query - The search query.
 * @returns {Array} - Array of relevant articles with score.
 */
export function searchKnowledge(query) {
  const knowledge = readJSON("knowledge.json");
  if (!knowledge) return [];

  // Simple keyword matching for now
  const terms = query.toLowerCase().split(/\s+/);

  const results = knowledge.map((article) => {
    let score = 0;
    // Handle missing fields gracefully
    const safeTitle = article.title || "";
    const safeContent = article.content || "";
    const safeTags = article.tags || [];

    const text = (
      safeTitle +
      " " +
      safeContent +
      " " +
      safeTags.join(" ")
    ).toLowerCase();

    terms.forEach((term) => {
      if (text.includes(term)) {
        score += 1;
        // Bonus for title match if title exists
        if (safeTitle && safeTitle.toLowerCase().includes(term)) score += 2;
      }
    });

    // Extract a title from content if missing (first line)
    let displayTitle = article.title;
    if (!displayTitle && safeContent) {
      const firstLine = safeContent.split("\n")[0].trim();
      displayTitle =
        firstLine.length > 50 ? firstLine.substring(0, 47) + "..." : firstLine;
    }

    return { ...article, title: displayTitle, score };
  });

  return results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // Return top 3
}
