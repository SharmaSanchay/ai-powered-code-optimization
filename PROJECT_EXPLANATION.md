# AI-Powered Code Optimization — Complete Project Explanation

A full-stack web application that lets users **write code** in a Monaco editor, **run it** server-side in 13+ languages, and **analyze it** with Google Gemini AI to get issues, fixes, and optimized code — all behind Clerk authentication.

---

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Project Folder Structure](#project-folder-structure)
- [Backend — Step by Step](#backend--step-by-step)
  - [Step 1 — Entry Point (index.js)](#step-1--entry-point-indexjs)
  - [Step 2 — AI Code Analysis Service (service/AIcode.js)](#step-2--ai-code-analysis-service-serviceaicodejs)
  - [Step 3 — Code Runner Service (service/run.js)](#step-3--code-runner-service-servicerunjs)
  - [Step 4 — Environment Variables](#step-4--environment-variables)
  - [Step 5 — Dependencies](#step-5--dependencies)
  - [Backend Data Flow Summary](#backend-data-flow-summary)
- [Frontend — Step by Step](#frontend--step-by-step)
  - [Step 1 — HTML Entry Point (index.html)](#step-1--html-entry-point-indexhtml)
  - [Step 2 — React Bootstrap (src/main.jsx)](#step-2--react-bootstrap-srcmainjsx)
  - [Step 3 — Main Application (src/App.jsx)](#step-3--main-application-srcappjsx)
  - [Step 4 — Styling (src/App.css and src/index.css)](#step-4--styling-srcappcss-and-srcindexcss)
  - [Step 5 — Environment Variables](#step-5--environment-variables-1)
  - [Step 6 — Build Tool (vite.config.js)](#step-6--build-tool-viteconfigjs)
  - [Step 7 — Dependencies](#step-7--dependencies)
  - [Frontend Data Flow Summary](#frontend-data-flow-summary)
- [How Frontend and Backend Talk to Each Other](#how-frontend-and-backend-talk-to-each-other)
- [How to Run the Project](#how-to-run-the-project)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│   React + Vite + Monaco Editor + Clerk Auth             │
│   Runs on: http://localhost:5173                        │
└────────────────┬──────────────────┬─────────────────────┘
                 │  POST /issue     │  POST /run
                 │  (analyze code)  │  (execute code)
                 ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                      BACKEND                            │
│   Express.js Server on http://localhost:3000             │
│                                                         │
│   ┌──────────────────┐    ┌──────────────────────────┐  │
│   │  service/AIcode  │    │  service/run             │  │
│   │  (Gemini AI API) │    │  (child_process + exec)  │  │
│   └──────────────────┘    └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Project Folder Structure

```
interview/
├── assets/                    # Demo screenshots for the readme
│   ├── demo1.png ... demo6.png
│
├── backend/
│   ├── .env                   # GEMINI_API_KEY
│   ├── index.js               # Express server — entry point
│   ├── package.json           # Backend dependencies
│   └── service/
│       ├── .env               # GEMINI_API_KEY (loaded by AIcode.js)
│       ├── AIcode.js          # Gemini AI code analysis logic
│       └── run.js             # Multi-language code execution logic
│
├── frontend/
│   ├── .env.local             # Clerk publishable + secret keys
│   ├── index.html             # HTML shell for the SPA
│   ├── vite.config.js         # Vite build configuration
│   ├── package.json           # Frontend dependencies
│   └── src/
│       ├── main.jsx           # React + ClerkProvider bootstrap
│       ├── App.jsx            # Main application component
│       ├── App.css            # Component-level styles
│       └── index.css          # Global/base styles
│
└── readme.md                  # Project overview with screenshots
```

---

---

# Backend — Step by Step

The backend is a **Node.js + Express** server that exposes two API endpoints — one for AI-powered code analysis and one for running code in multiple languages.

---

### Step 1 — Entry Point (`index.js`)

> **File:** `backend/index.js`

This is where the Express server is created and configured.

**What happens line by line:**

1. **Import dependencies** — `express`, `dotenv`, `cors`, and two custom service modules (`AIcode.js` and `run.js`).
2. **Configure CORS** — `cors({ origin: "*" })` allows requests from any origin (the frontend running on a different port).
3. **Parse JSON bodies** — `express.json()` middleware lets the server read JSON data from `req.body`.
4. **Define two routes:**

| Route | Method | Purpose |
|-------|--------|---------|
| `/issue` | POST | Receives code → sends it to Gemini AI → returns analysis |
| `/run` | POST | Receives code + language → executes it on the server → returns output |

5. **Start the server** on **port 3000**.

**`POST /issue` flow:**
```
Client sends:  { "code": "function add(a,b) { return a - b; }" }
Server does:   calls analyzeCode(code) → Gemini AI reviews the code
Server returns: "❌ Bug found: subtraction instead of addition ..."
```

**`POST /run` flow:**
```
Client sends:  { "code": "print('hello')", "language": "python" }
Server does:   calls run(code, language) → executes via child_process
Server returns: "hello"
```

**Error handling:** Both routes are wrapped in `try/catch` blocks. If anything fails, a `500` status with an error message is returned.

---

### Step 2 — AI Code Analysis Service (`service/AIcode.js`)

> **File:** `backend/service/AIcode.js`

This file is responsible for sending user code to the **Google Gemini AI** model and returning a structured review.

**Step-by-step breakdown:**

1. **Initialize the Gemini client:**
   - Imports `GoogleGenAI` from the `@google/genai` package.
   - Loads the `GEMINI_API_KEY` from the `.env` file located in the same `service/` directory.
   - Creates an `ai` instance connected to Google's Gemini API.

2. **Define the system prompt (`SYSTEM_PROMPT`):**
   - Tells Gemini to act as a **senior code reviewer and programming expert**.
   - Instructs it to respond in a specific emoji-based format:
     - `📝 Summary` — one-line summary of what the code does.
     - `❌ Issues Found` — list of bugs, their impact, and how to fix them.
     - `✅ Corrected / Optimized Code` — the improved version of the code.
     - `💡 Key Changes` — bullet list of what was changed and why.
   - Enforces formatting rules: no markdown headings (`#`), no bold (`**`).

3. **Build the user prompt (`generateCodeAnalysisPrompt` function):**
   - Takes the user's raw code string.
   - Wraps it in a fenced code block and adds the instruction "Analyze the following code".

4. **Call the Gemini API (`analyzeCode` function):**
   - Sends the system prompt + user prompt to the `gemini-3.5-flash` model.
   - Receives the AI's response text.
   - Runs `cleanOutput()` to strip any leftover `#` headings or `**` bold markers the AI might have included.
   - Returns the cleaned analysis string back to the caller (`index.js`).

5. **Export** the `analyzeCode` function so `index.js` can use it.

---

### Step 3 — Code Runner Service (`service/run.js`)

> **File:** `backend/service/run.js`

This file handles **executing user-submitted code** in multiple programming languages directly on the server machine.

**Step-by-step breakdown:**

1. **Language mapping (`languageMap` object):**
   - Maps user-friendly aliases to canonical language names, for example:
     - `"py"` → `"python"`, `"js"` → `"javascript"`, `"c++"` → `"cpp"`, `"rs"` → `"rust"`
   - Supports **13 languages**: Python, JavaScript, TypeScript, Java, C, C++, C#, Ruby, Go, Rust, PHP, Swift, Bash.

2. **Extension mapping (`extensionMap` object):**
   - Maps each canonical language name to its file extension:
     - `"python"` → `"py"`, `"java"` → `"java"`, `"cpp"` → `"cpp"`, etc.

3. **Command builder (`getCommand` function):**
   - Given a language and a file path, it returns the correct shell command to compile/run that file:

   | Language | Command Generated |
   |----------|-------------------|
   | Python | `python3 "file.py"` |
   | JavaScript | `node "file.js"` |
   | Java | `javac "file.java" && java -cp dir Main` |
   | C | `gcc "file.c" -o output && ./output` |
   | C++ | `g++ "file.cpp" -o output && ./output` |
   | Go | `go run "file.go"` |
   | Rust | `rustc "file.rs" -o output && ./output` |
   | TypeScript | `npx ts-node "file.ts"` |
   | Ruby | `ruby "file.rb"` |
   | PHP | `php "file.php"` |
   | Swift | `swift "file.swift"` |
   | C# | `dotnet-script "file.cs"` |
   | Bash | `bash "file.sh"` |

4. **Execution flow (`run` function):**
   - **a.** Normalize the language name using `languageMap` (e.g., `"py"` becomes `"python"`).
   - **b.** Look up the file extension using `extensionMap`.
   - **c.** Create a **temporary directory** in the OS temp folder (e.g., `/tmp/code-run-XXXX`).
   - **d.** Write the user's code to a file inside that temp directory (e.g., `main.py`). For Java, the file is always named `Main.java`.
   - **e.** Build the shell command using `getCommand()`.
   - **f.** Execute the command using Node.js `child_process.exec()` with:
     - A **15-second timeout** — if the code takes longer, the process is killed.
     - A **1 MB output buffer** — prevents memory issues from huge outputs.
   - **g.** Return `stdout` (successful output) or an error message (compilation errors, runtime errors, timeout).
   - **h.** **Clean up** — delete the temporary directory in a `finally` block, no matter what happened.

5. **Export** the `run` function so `index.js` can use it.

---

### Step 4 — Environment Variables

| File | Variable | Purpose |
|------|----------|---------|
| `backend/.env` | `GEMINI_API_KEY` | Google Gemini API key (loaded by `dotenv` in `index.js`) |
| `backend/service/.env` | `GEMINI_API_KEY` | Same API key (loaded directly by `AIcode.js` via its own `dotenv.config()` call with an explicit path) |

> **Important:** You must generate your own Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) and place it in both `.env` files.

---

### Step 5 — Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | v5 | Web framework — creates the HTTP server and handles routes |
| `cors` | v2.8 | Enables Cross-Origin Resource Sharing so the frontend can call the backend |
| `dotenv` | v16 | Loads environment variables from `.env` files into `process.env` |
| `@google/genai` | v2.17 | Official Google Gemini AI SDK (new version, used in `AIcode.js`) |
| `@google/generative-ai` | v0.24 | Google Generative AI SDK (legacy version, installed but not actively used) |
| `axios` | v1.9 | HTTP client library (installed but not used in current backend code) |
| `@clerk/express` | v1.4 | Clerk authentication middleware for Express (available for protecting routes) |

---

### Backend Data Flow Summary

```
User clicks "Analyze Code"           User clicks "Run Code"
         │                                     │
         ▼                                     ▼
  POST /issue                            POST /run
  { code: "..." }                        { code: "...", language: "python" }
         │                                     │
         ▼                                     ▼
  analyzeCode(code)                      run(code, language)
         │                                     │
         ▼                                     ▼
  Gemini AI API call                     Write code to temp file
  (gemini-3.5-flash model)              Execute via child_process.exec()
         │                                     │
         ▼                                     ▼
  Structured review text                 stdout / stderr output
  (summary, issues, fix)                 (or error / timeout message)
         │                                     │
         ▼                                     ▼
  JSON response → frontend              JSON response → frontend
```

---

---

# Frontend — Step by Step

The frontend is a **React** single-page application built with **Vite**, featuring a **Monaco code editor** (the same editor engine used in VS Code) and **Clerk** for user authentication.

---

### Step 1 — HTML Entry Point (`index.html`)

> **File:** `frontend/index.html`

This is the single HTML page that Vite serves to the browser. It contains:

- A `<div id="root"></div>` — the mount point where React will render the entire application.
- A `<script type="module" src="/src/main.jsx">` — tells Vite to load the React entry point. Vite handles all the module bundling and hot-module replacement from here.

There is no visible HTML content here — everything the user sees is rendered by React into the `#root` div.

---

### Step 2 — React Bootstrap (`src/main.jsx`)

> **File:** `frontend/src/main.jsx`

This is where the React application boots up. Here is what happens step by step:

1. **Import React and ReactDOM** — standard React 19 setup for creating the app.
2. **Import the `App` component** — the main application component from `App.jsx`.
3. **Import global styles** — loads `index.css` for base styling.
4. **Import `ClerkProvider`** from `@clerk/react` — this component wraps the entire app to provide authentication context everywhere.
5. **Read the Clerk Publishable Key** from `import.meta.env.VITE_CLERK_PUBLISHABLE_KEY` (this is set in the `.env.local` file).
6. **Safety check** — throws an error if the key is missing, preventing the app from running without authentication configured.
7. **Render the app** into the `#root` div:
   ```
   <React.StrictMode>
     <ClerkProvider publishableKey={KEY} afterSignOutUrl="/">
       <App />
     </ClerkProvider>
   </React.StrictMode>
   ```
   - `React.StrictMode` — enables extra development warnings and checks.
   - `ClerkProvider` — makes Clerk hooks and components (`useUser`, `SignInButton`, `UserButton`, etc.) available throughout the entire app.
   - `afterSignOutUrl="/"` — redirects the user back to the home page after they sign out.

---

### Step 3 — Main Application (`src/App.jsx`)

> **File:** `frontend/src/App.jsx`

This is the **heart of the frontend** — a single component that contains all the UI and business logic.

#### 3a. Imports

- **React and `useState`** — for component rendering and state management.
- **`Editor` from `@monaco-editor/react`** — the Monaco code editor component.
- **Clerk components** — `Show`, `SignInButton`, `SignUpButton`, `UserButton`, `RedirectToSignIn` for authentication UI.
- **`axios`** — for making HTTP requests to the backend.
- **`App.css`** — component-specific styles.

#### 3b. State Management

The component manages 6 pieces of state using React's `useState` hook:

| State Variable | Initial Value | What It Stores |
|----------------|---------------|----------------|
| `code` | `""` | The code the user types in the Monaco editor |
| `correctedCode` | `""` | The AI analysis result OR the code execution output |
| `downloadText` | `""` | Stores the analysis text so it can be downloaded as a file |
| `loading` | `false` | Controls whether the full-screen loading spinner is shown |
| `purpose` | `"Analyze Code"` | Label text for the right panel — changes to `"analyze"` or `"output"` depending on the action |
| `language` | `"javascript"` | The currently selected programming language |

#### 3c. Handler Functions (Business Logic)

**`handleAnalyzeCode()`** — Triggered when the user clicks the "Analyze Code" button:
1. Sets `loading = true` → shows the spinner overlay.
2. Clears any previous results from the right panel.
3. Sets the right panel label to `"analyze"`.
4. Sends a `POST` request to `http://localhost:3000/issue` with the user's code in the request body.
5. When the response arrives, displays the AI's analysis in the right-side textarea.
6. Also stores the response text in `downloadText` for later download.
7. Sets `loading = false` → hides the spinner.
8. If any error occurs, shows an error message in the right panel.

**`handleRunCode()`** — Triggered when the user clicks the "Run Code" button in the navbar:
1. Sets `loading = true` → shows the spinner overlay.
2. Clears any previous results.
3. Sets the right panel label to `"output"`.
4. Sends a `POST` request to `http://localhost:3000/run` with the code and the selected language.
5. When the response arrives, displays the execution output (stdout/stderr) in the right panel.
6. Sets `loading = false` → hides the spinner.
7. If any error occurs, shows an alert and displays the error message.

**`handleDownloadIssues()`** — Triggered when the user clicks the "Download Issues" button:
1. Checks if there is any analysis text to download. If not, shows an alert.
2. Creates a `Blob` (binary large object) from the analysis text.
3. Generates a temporary download URL using `URL.createObjectURL()`.
4. Creates a hidden `<a>` link element, sets its `href` to the blob URL and `download` attribute to `"code-issues.txt"`.
5. Programmatically clicks the link to trigger the browser download.
6. Removes the temporary link element from the DOM.

**`handleLanguageChange(event)`** — Triggered when the user selects a different language from the dropdown:
1. Updates the `language` state with the new value.
2. The Monaco editor automatically re-applies syntax highlighting to match the new language.

#### 3d. UI Layout (What the User Sees)

The component renders the following visual structure:

```
┌─────────────────────────────────────────────────────────────┐
│ LOADING OVERLAY (only visible when loading === true)        │
│   ┌─────────────┐                                           │
│   │  ◉ spinner  │  "Processing your code..."                │
│   └─────────────┘                                           │
├─────────────────────────────────────────────────────────────┤
│ NAVBAR                                                      │
│  "Code Analyzer"     [Language ▾] [Run Code] [👤 Auth]      │
├─────────────────────────────────────────────────────────────┤
│ DESCRIPTION TEXT                                            │
│  "Paste your code on the left and click analyze to see      │
│   issues on the right."                                     │
├──────────────────────────┬──────────────────────────────────┤
│ LEFT PANEL               │ RIGHT PANEL                      │
│ Monaco Code Editor       │ Results Textarea                 │
│                          │                                  │
│ - User types/pastes code │ - Shows AI analysis OR           │
│ - Syntax highlighting    │   code execution output          │
│ - Line numbers           │ - Read-only                      │
│ - Auto-completion        │ - Monospace font                 │
│                          │                                  │
│ Height: 800px            │ Height: 800px                    │
│ Theme: vs-light          │                                  │
├──────────────────────────┴──────────────────────────────────┤
│ BUTTON ROW (centered)                                       │
│         [Analyze Code]    [Download Issues]                  │
├─────────────────────────────────────────────────────────────┤
│ SIGNED-OUT MESSAGE (only visible when user is NOT logged in)│
│  "Welcome to Code Analyzer"                                 │
│  "Please sign in or sign up to analyze and run your code."  │
└─────────────────────────────────────────────────────────────┘
```

#### 3e. Clerk Authentication Components Used

| Component | What It Does |
|-----------|-------------|
| `<Show when="signed-out">` | Only renders its children when the user is **NOT** logged in |
| `<Show when="signed-in">` | Only renders its children when the user **IS** logged in |
| `<SignInButton mode="modal" />` | Renders a "Sign In" button that opens Clerk's sign-in modal when clicked |
| `<SignUpButton mode="modal" />` | Renders a "Sign Up" button that opens Clerk's sign-up modal when clicked |
| `<UserButton />` | Renders the logged-in user's avatar with a dropdown menu (profile, sign out, etc.) |

#### 3f. Monaco Editor Configuration

```jsx
<Editor
  height="800px"                          // Fixed editor height
  defaultLanguage={language}              // Initial language
  language={language}                     // Dynamically updates with dropdown
  value={code}                            // Bound to the `code` state
  onChange={(value) => setCode(value)}     // Updates state on every keystroke
  theme="vs-light"                        // Light color theme
  options={{
    minimap: { enabled: false },          // Hides the minimap sidebar
    fontSize: 14,                         // Code font size
  }}
/>
```

The Monaco editor gives users:
- Full **syntax highlighting** for the selected language.
- **Auto-completion** and IntelliSense suggestions.
- **Line numbers**, bracket matching, and code folding.
- A professional **VS Code-like editing experience** directly in the browser.

---

### Step 4 — Styling (`src/App.css` and `src/index.css`)

#### `src/index.css` — Global Base Styles

This file sets up the baseline styles for the entire page:
- **Resets** all margins and padding to zero (`* { margin: 0; padding: 0; }`).
- Sets `box-sizing: border-box` globally so padding is included in element widths.
- Sets the **default font stack** to system fonts (Apple, Windows, Linux).
- Sets the **page background** to white (`#ffffff`).
- Defines a monospace font for `<code>` elements.

#### `src/App.css` — Component-Level Styles

This file styles every visual element in the app:

| CSS Class | What It Styles |
|-----------|---------------|
| `.container` | Main page wrapper — flexbox column layout, centered content, light gray background (`#f8f8f8`) |
| `.navbar` | Top navigation bar — flex row with space-between alignment |
| `.navbar-title` | "Code Analyzer" heading — centered text, 1.5rem font size |
| `.navbar-options` | Groups the language selector, run button, and auth buttons together |
| `.navbar-signin button` | Sign in/up buttons — bright blue (`#007acc`), scales up slightly on hover |
| `.language-selector` | Language dropdown — bordered, turns blue on hover |
| `.navbar-button` | "Run Code" button — green (`#28a745`), darker green on hover |
| `.code-container` | Two-column flex layout that holds the editor on the left and results on the right |
| `.code-editor` | Left column container for the Monaco editor |
| `.issues` | Right column container for the results textarea |
| `.textarea` | Results textarea — monospace font, 800px minimum height, light border |
| `.analyze-button` | "Analyze Code" and "Download Issues" buttons — gray (`#6c757d`), grayed-out disabled state |
| `.button-row` | Centers the action buttons horizontally below the editor panels |
| `.loader-overlay` | Full-screen loading overlay — fixed position, semi-transparent white background with blur effect |
| `.loader-spinner` | CSS-only spinning circle — blue top border rotating with `@keyframes spin` animation |
| `.loader-text` | "Processing your code..." label — bold, dark text |

---

### Step 5 — Environment Variables

> **File:** `frontend/.env.local`

| Variable | Purpose |
|----------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk's **publishable key** — identifies your Clerk application (safe to expose in frontend code) |
| `CLERK_SECRET_KEY` | Clerk's **secret key** — used for any server-side Clerk operations |

> **Important:** You must create your own Clerk application at [clerk.com](https://clerk.com) and paste your keys into this file.

> **How Vite handles env vars:** Vite only exposes environment variables that are prefixed with `VITE_` to the frontend JavaScript code. That is why the publishable key uses the `VITE_` prefix.

---

### Step 6 — Build Tool (`vite.config.js`)

> **File:** `frontend/vite.config.js`

A minimal Vite configuration file:
- Imports `defineConfig` from Vite for type-safe configuration.
- Imports the `@vitejs/plugin-react` plugin to enable JSX transformation, React Fast Refresh (hot reloading), and other React-specific optimizations.
- No custom port, path aliases, or proxy settings — the app runs on Vite's default `http://localhost:5173`.

---

### Step 7 — Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | v19 | Core UI library for building the component-based interface |
| `react-dom` | v19 | Renders React components into the browser DOM |
| `@monaco-editor/react` | v4.7 | React wrapper for the Monaco code editor (VS Code's editor engine) |
| `@clerk/react` | v6.14 | Clerk authentication — provides sign-in, sign-up, and user profile components |
| `axios` | v1.9 | HTTP client for making API calls to the backend server |
| `vite` | v6.3 | Build tool and development server with fast hot-module replacement |
| `@vitejs/plugin-react` | v4.3 | Vite plugin for React support (JSX, fast refresh) |
| `eslint` + plugins | various | Code linting and quality checks (development only) |

---

### Frontend Data Flow Summary

```
User types code in Monaco Editor
         │
         ├──── Clicks "Run Code" ──────────────────────┐
         │                                              │
         ├──── Clicks "Analyze Code" ───────┐           │
         │                                  │           │
         │                                  ▼           ▼
         │                          axios.post()   axios.post()
         │                          /issue         /run
         │                                  │           │
         │                                  ▼           ▼
         │                          AI review      Code output
         │                          text           (stdout/stderr)
         │                                  │           │
         │                                  └─────┬─────┘
         │                                        │
         │                                        ▼
         │                              setCorrectedCode(response)
         │                                        │
         │                                        ▼
         │                              Displayed in the right
         │                              textarea panel
         │
         └──── Clicks "Download Issues" ────────────────┐
                                                        │
                                                        ▼
                                                 Creates a Blob
                                                 from analysis text
                                                        │
                                                        ▼
                                                 Browser downloads
                                                 "code-issues.txt"
```

---

---

## How Frontend and Backend Talk to Each Other

| User Action | Frontend Function | HTTP Request | Backend Route | Backend Service | What Happens |
|-------------|-------------------|-------------|---------------|-----------------|--------------|
| Click "Analyze Code" | `handleAnalyzeCode()` | `POST http://localhost:3000/issue` | `app.post('/issue')` | `AIcode.js` → Gemini AI | Code is sent to Gemini AI, analysis is returned |
| Click "Run Code" | `handleRunCode()` | `POST http://localhost:3000/run` | `app.post('/run')` | `run.js` → `child_process.exec()` | Code is written to a temp file, executed, output is returned |

**Key points:**
- The frontend runs on **port 5173** (Vite dev server).
- The backend runs on **port 3000** (Express server).
- CORS is enabled on the backend with `origin: "*"` to allow cross-origin requests from the frontend.
- All communication happens via **JSON over HTTP** using **axios** on the frontend and **Express** on the backend.
- Requests and responses are standard JSON objects — no WebSockets or real-time connections.

---

## How to Run the Project

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (comes bundled with Node.js)
- A **Clerk account** — sign up and get your API keys from [clerk.com](https://clerk.com)
- A **Google Gemini API key** — get it from [Google AI Studio](https://aistudio.google.com/apikey)
- (Optional) Language runtimes installed on your machine for code execution: Python 3, Java (JDK), GCC/G++, Go, Rust, Ruby, PHP, Swift, etc.

### Step 1 — Set Up Environment Variables

**Backend** — create/edit `backend/.env` and `backend/service/.env`:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

**Frontend** — create/edit `frontend/.env.local`:
```
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
```

### Step 2 — Install Dependencies and Start the Backend

```bash
cd backend
npm install
node index.js
```
You should see: `Server is running on port 3000`

### Step 3 — Install Dependencies and Start the Frontend

```bash
cd frontend
npm install
npm run dev
```
You should see Vite output with a local URL like: `http://localhost:5173`

### Step 4 — Use the Application

1. Open `http://localhost:5173` in your browser.
2. **Sign in** or **sign up** using the Clerk authentication buttons in the navbar.
3. **Select a programming language** from the dropdown menu (JavaScript, Python, Java, C, C++).
4. **Write or paste your code** in the left-side Monaco editor.
5. Click **"Run Code"** to execute your code on the server and see the output on the right panel.
6. Click **"Analyze Code"** to get an AI-powered code review with bug detection, fixes, and optimized code.
7. Click **"Download Issues"** to save the AI analysis as a `code-issues.txt` file on your computer.
