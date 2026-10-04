const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateCodeAnalysisPrompt = (code) => {
  const str = `
You are an expert software engineer and code reviewer with strong knowledge of multiple programming languages, data structures, algorithms, and best practices.

Your task is to review the following code carefully.

CODE:
${code}

REVIEW REQUIREMENTS:
1. Analyze the code for:
   - ❌ Bugs and logical errors
   - ❌ Edge cases
   - ❌ Incorrect assumptions
   - 📝 Code quality and readability issues
   - 📝 Possible improvements
   - 📝 Time and space complexity

2. If bugs exist:
   - Clearly explain each bug in simple language.
   - Provide the corrected code.
   - Do not unnecessarily rewrite working parts.

3. If there are no bugs:
   - Mention that the code is correct.
   - Provide an optimized/improved version only if there is a meaningful optimization.
   - Otherwise, return the original code as the recommended version.

4. Keep the explanation:
   - Short
   - Human-readable
   - Easy to understand
   - Focused on the important points
   - Avoid unnecessary technical jargon

5. Use these symbols where appropriate:
   - ✅ Correct / good
   - ❌ Bug / problem
   - 📝 Suggestion / improvement

6. IMPORTANT:
   - Your response MUST be valid JSON.
   - Do NOT use Markdown code fences.
   - Do NOT add text before or after the JSON.
   - Do NOT use trailing commas.
   - All JSON keys and string values must use double quotes.
   - If there are no bugs, return an empty bugs array.
   - If there are no suggestions, return an empty suggestions array.

7. The response MUST follow EXACTLY this structure:

{
  "summary": "Short overall review of the code.",
  "bugs": [
    {
      "title": "Short bug title",
      "description": "Simple explanation of the problem.",
      "severity": "low | medium | high",
      "fix": "How to fix it."
    }
  ],
  "complexity": {
    "time": "O(...)",
    "space": "O(...)"
  },
  "suggestions": [
    "📝 Suggestion 1",
    "📝 Suggestion 2"
  ],
  "severity": "low | medium | high",
  "corrected_code": "Complete corrected or optimized code"
}

SEVERITY RULES:
- "low" → Minor style/readability issue.
- "medium" → Bug, inefficient approach, or important improvement.
- "high" → Major logical error, incorrect output, crash, or serious performance issue.

IMPORTANT:
Return ONLY the JSON object.
`;

  return str;
};
async function analyzeCode(code) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: generateCodeAnalysisPrompt(code),
    });
    const text = (response.text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const jsonText = text.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonText) {
      throw new Error("The analysis response was not valid JSON.");
    }

    const analysis = JSON.parse(jsonText);
    return {
      summary: String(analysis.summary || "Analysis completed."),
      bugs: Array.isArray(analysis.bugs) ? analysis.bugs.map((bug) => ({
        title: String(bug.title || "Issue"),
        description: String(bug.description || ""),
        severity: ["low", "medium", "high"].includes(bug.severity) ? bug.severity : "medium",
        fix: String(bug.fix || ""),
      })) : [],
      complexity: {
        time: String(analysis.complexity?.time || "Not estimated"),
        space: String(analysis.complexity?.space || "Not estimated"),
      },
      suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions.map(String) : [],
      severity: ["low", "medium", "high"].includes(analysis.severity) ? analysis.severity : "low",
      corrected_code: String(analysis.corrected_code || code),
    };
  } catch (error) {
    console.error("Code analysis error:", error.message || error);
    throw new Error("Unable to analyze code. Please try again.");
  }
}

module.exports = analyzeCode;
