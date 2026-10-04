const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const configurations = {
  javascript: { extension: ".js", command: process.execPath, args: (file) => [file] },
  python: { extension: ".py", command: "python3", args: (file) => ["-I", file] },
};

const OUTPUT_LIMIT = 10000;
const TIMEOUT_MS = 5000;

function execute(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { PATH: process.env.PATH || "" },
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let outputExceeded = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, TIMEOUT_MS);

    const collect = (target) => (chunk) => {
      if (stdout.length + stderr.length + chunk.length > OUTPUT_LIMIT) {
        outputExceeded = true;
        child.kill("SIGKILL");
        return;
      }
      if (target === "stdout") stdout += chunk.toString();
      else stderr += chunk.toString();
    };

    child.stdout.on("data", collect("stdout"));
    child.stderr.on("data", collect("stderr"));
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (exitCode, signal) => {
      clearTimeout(timeout);
      resolve({ stdout, stderr, exitCode, signal, timedOut, outputExceeded });
    });
  });
}

async function run(code, language) {
  let directory;
  try {
    if (typeof code !== "string" || !code.trim()) {
      throw new Error("Code must be a non-empty string.");
    }

    const normalizedLanguage = String(language || "").toLowerCase();
    const configuration = configurations[normalizedLanguage];
    if (!configuration) {
      throw new Error("Unsupported language. Choose JavaScript or Python.");
    }

    directory = await fs.mkdtemp(path.join(os.tmpdir(), "code-runner-"));
    const file = path.join(directory, `main${configuration.extension}`);
    await fs.writeFile(file, code, { mode: 0o600 });
    const result = await execute(configuration.command, configuration.args(file), directory);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exit_code: result.exitCode,
      timed_out: result.timedOut,
      output_limited: result.outputExceeded,
      success: result.exitCode === 0 && !result.timedOut && !result.outputExceeded,
    };
  } catch (error) {
    console.error("Execution error:", error.message || error);
    throw error;
  } finally {
    if (directory) await fs.rm(directory, { recursive: true, force: true });
  }
}

module.exports = run;
