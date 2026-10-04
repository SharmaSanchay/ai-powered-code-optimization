import {
    RedirectToSignIn,
    SignedIn,
    SignedOut,
    SignInButton,
    UserButton,
} from "@clerk/clerk-react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import { useState } from "react";
import "./App.css";

function App() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [downloadText, setDownloadText] = useState("");
  const [loading, setLoading] = useState(false);
  const [purpose,setpurpose]=useState("Analyze Code");
  const [language, setLanguage] = useState("javascript");
  const handleAnalyzeCode = async () => {
    setLoading(true);
    setResult(null);
    setDownloadText("");
    try {
      setpurpose("analyze");
      const response = await axios.post("http://localhost:3000/issue", {
        code,
      });
      setResult(response.data);
      setDownloadText(JSON.stringify(response.data, null, 2));
    } catch (error) {
      setResult({ error: error.response?.data?.error || "An error occurred while analyzing the code." });
      setDownloadText("");
    }
    setLoading(false);
  };

  const handleDownloadIssues = () => {
    if (!downloadText) {
      alert("Please analyze code first.");
      return;
    }
    const element = document.createElement("a");
    const file = new Blob([downloadText], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "code-issues.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  const handleRunCode = async () => {
     try {
      setpurpose("output");
      setLoading(true);
      setResult(null);
      const response = await axios.post("http://localhost:3000/run", {
        code,
        language,
      });
      setResult(response.data);
     } catch (error) {
        alert("An error occurred while running the code.");
        setResult({ error: error.response?.data?.error || error.message });
     }
     setLoading(false);
  };

  return (
    <>
      <SignedIn>
        <div className="container">
          <nav className="navbar">
            <h1 className="navbar-title">Code Analyzer</h1>
            <div className="navbar-options">
              <select
                className="language-selector"
                value={language}
                onChange={handleLanguageChange}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
              </select>
              <button className="navbar-button" onClick={handleRunCode}>
                Run Code
              </button>
              <div className="navbar-signin">
                <SignedOut>
                  <SignInButton />
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </div>
            </div>
          </nav>
          <p className="description">
            Paste your code on the left and click analyze to see issues on the
            right.
          </p>
          <div className="code-container">
            <div className="code-editor">
              <label className="label">Your Code</label>
              <Editor
                height="800px"
                defaultLanguage={language}
                language={language}
                value={code}
                onChange={(value) => setCode(value || "")}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                }}
              />
            </div>
            <div className="issues">
              <label className="label">{purpose}</label>
              <div className="result-panel" aria-live="polite">
                {loading && <p className="result-empty">Working...</p>}
                {!loading && !result && <p className="result-empty">Your results will appear here.</p>}
                {!loading && result?.error && <p className="result-error">{result.error}</p>}
                {!loading && result && !result.error && purpose === "analyze" && (
                  <>
                    <section className="result-section">
                      <div className="result-heading">
                        <h2>Review</h2>
                        <span className={`severity severity-${result.severity || "low"}`}>
                          {result.severity || "low"} severity
                        </span>
                      </div>
                      <p>{result.summary}</p>
                    </section>
                    <section className="result-section">
                      <h2>Issues ({result.bugs?.length || 0})</h2>
                      {result.bugs?.length ? result.bugs.map((bug, index) => (
                        <article className="bug-item" key={`${bug.title}-${index}`}>
                          <div className="result-heading">
                            <h3>{bug.title}</h3>
                            <span className={`severity severity-${bug.severity}`}>{bug.severity}</span>
                          </div>
                          <p>{bug.description}</p>
                          {bug.fix && <p><strong>Fix:</strong> {bug.fix}</p>}
                        </article>
                      )) : <p>No bugs identified.</p>}
                    </section>
                    <section className="result-section complexity">
                      <h2>Complexity</h2>
                      <p><strong>Time</strong><span>{result.complexity?.time || "Not estimated"}</span></p>
                      <p><strong>Space</strong><span>{result.complexity?.space || "Not estimated"}</span></p>
                    </section>
                    <section className="result-section">
                      <h2>Suggestions</h2>
                      {result.suggestions?.length ? (
                        <ul>{result.suggestions.map((suggestion, index) => <li key={index}>{suggestion}</li>)}</ul>
                      ) : <p>No suggestions.</p>}
                    </section>
                    <section className="result-section">
                      <h2>Corrected Code</h2>
                      <pre className="code-result"><code>{result.corrected_code}</code></pre>
                    </section>
                  </>
                )}
                {!loading && result && !result.error && purpose === "output" && (
                  <>
                    <section className="result-section">
                      <div className="result-heading">
                        <h2>{result.success ? "Execution complete" : "Execution failed"}</h2>
                        <span className={`severity ${result.success ? "severity-low" : "severity-high"}`}>
                          exit {result.exit_code ?? "n/a"}
                        </span>
                      </div>
                      {result.timed_out && <p>Execution timed out.</p>}
                      {result.output_limited && <p>Output exceeded the 10 KB limit.</p>}
                    </section>
                    <section className="result-section">
                      <h2>Output</h2>
                      <pre className="code-result">{result.stdout || "(no output)"}</pre>
                    </section>
                    {result.stderr && <section className="result-section">
                      <h2>Errors</h2>
                      <pre className="code-result error-output">{result.stderr}</pre>
                    </section>}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="button-row">
            <button className="analyze-button" onClick={handleAnalyzeCode}>
              Analyze Code
            </button>
            <button
              className="analyze-button"
              onClick={handleDownloadIssues}
              disabled={!downloadText}
              style={{ marginLeft: "10px" }}
            >
              Download Issues
            </button>
          </div>
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

export default App;
