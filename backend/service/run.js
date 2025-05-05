const axios = require('axios');

const extensionMap = {
  python: "py",
  javascript: "js",
  java: "java",
  c: "c",
  cpp: "cpp",
  csharp: "cs",
  ruby: "rb",
  go: "go",
  rust: "rs",
  php: "php",
  swift: "swift",
  typescript: "ts",
  bash: "sh"
};

async function run(code, language, version = "*") {
  try {
    const ext = extensionMap[language.toLowerCase()] || "txt";

    const response = await axios.post(
      "https://emkc.org/api/v2/piston/execute",
      {
        language,
        version,
        files: [
          {
            content: code,
          },
        ],
      },
      {
        timeout: 120000 // 2 minutes
      }
    );

    const result = response.data;

    // 🛑 Treat empty output or SIGKILL as an error
    const { output, code: exitCode, signal } = result.run;
    if (!output || signal === 'SIGKILL' || exitCode !== 0) {
      throw new Error("Execution failed or returned no output.");
    }

    console.log(output);
    return output;

  } catch (error) {
    console.error("Execution error:", error.message || error);
    return "Error: Code execution failed or timed out.";
  }
}

module.exports = run;
