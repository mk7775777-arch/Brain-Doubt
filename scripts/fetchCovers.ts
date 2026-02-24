import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function getNCERTCoverURLs() {
  const prompt = `
    Find the official or most accurate NCERT book cover image URLs for the following books. 
    Return the result as a JSON array of objects with 'id' and 'thumbnailUrl'.
    
    Books:
    1. Mathematics Part I (Class 12) - id: c12-math-1
    2. Mathematics Part II (Class 12) - id: c12-math-2
    3. Physics Part I (Class 12) - id: c12-phy-1
    4. Physics Part II (Class 12) - id: c12-phy-2
    5. Chemistry Part I (Class 12) - id: c12-chem-1
    6. Chemistry Part II (Class 12) - id: c12-chem-2
    7. Biology (Class 12) - id: c12-bio
    8. Mathematics (Class 11) - id: c11-math
    9. Physics Part I (Class 11) - id: c11-phy-1
    10. Mathematics (Class 10) - id: c10-math
    11. Science (Class 10) - id: c10-sci
    12. India and the Contemporary World II (Class 10) - id: c10-ss-1
    13. Mathematics (Class 9) - id: c9-math
    14. Science (Class 9) - id: c9-sci
    15. Mathematics (Class 8) - id: c8-math
    16. Science (Class 8) - id: c8-sci
    17. Mathematics (Class 6) - id: c6-math
    18. Math-Magic (Class 1) - id: c1-math
    19. Marigold (Class 1) - id: c1-eng
    20. Rimjhim (Class 1) - id: c1-hindi
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            thumbnailUrl: { type: Type.STRING }
          },
          required: ["id", "thumbnailUrl"]
        }
      }
    }
  });

  console.log(response.text);
}

getNCERTCoverURLs();
