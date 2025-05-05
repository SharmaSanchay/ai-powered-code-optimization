import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  RedirectToSignIn,
} from "@clerk/clerk-react";
import "./App.css";
import axios from "axios";

function App() {
  const [code, setCode] = useState("");
  const [correctedCode, setCorrectedCode] = useState("");
  const [downloadText, setDownloadText] = useState("");
  const [loading, setLoading] = useState(false);
  const [purpose,setpurpose]=useState("Analyze Code");
  const [language, setLanguage] = useState("javascript");
  const handleAnalyzeCode = async () => {
    setLoading(true);
    setCorrectedCode("");
    setDownloadText("");
    try {
      setpurpose("analyze");
      const response = await axios.post("http://localhost:3000/issue", {
        code,
      });
      setCorrectedCode(response.data);
      setDownloadText(response.data);
    } catch (error) {
      setCorrectedCode("An error occurred while analyzing the code.");
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
      setCorrectedCode("");
      const response = await axios.post("http://localhost:3000/run", {
        code,
        language,
      });
      console.log(response);
      setCorrectedCode(response.data);
     } catch (error) {
        alert("An error occurred while running the code.");
        setCorrectedCode(error.message);
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
                <option value="java">Java</option>
                <option value="c">C</option>
                <option value="cpp">C++</option>
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
              <textarea
                className="textarea"
                value={loading ? "Please wait..." : correctedCode}
                readOnly
                placeholder="Corrected code will appear here"
              />
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
