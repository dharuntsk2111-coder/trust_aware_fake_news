import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const isWindows = process.platform === "win32";
const venvPython = isWindows
  ? join(".venv", "Scripts", "python.exe")
  : join(".venv", "bin", "python");

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (r.error) {
    console.error(`\nCould not run ${cmd}: ${r.error.message}`);
    process.exit(1);
  }
  return r.status ?? 1;
}

function setup() {
  const [cmd, preArgs] = isWindows ? ["py", ["-3.11"]] : ["python3.11", []];
  console.log(`Creating .venv with ${cmd} ${preArgs.join(" ")}`.trim());
  if (run(cmd, [...preArgs, "-m", "venv", ".venv"]) !== 0) {
    console.error(
      "\nCould not create the virtualenv. Install Python 3.11 first " +
        "(python.org), then run this again."
    );
    process.exit(1);
  }
  run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"]);
  const code = run(venvPython, [
    "-m", "pip", "install", "-r", "requirements.txt",
    "--extra-index-url", "https://download.pytorch.org/whl/cpu",
  ]);
  process.exit(code);
}

const args = process.argv.slice(2);

if (args[0] === "--setup") setup();

if (!existsSync(venvPython)) {
  console.error(
    `\nNo virtualenv found at ${venvPython}.\nRun:  npm run setup\n`
  );
  process.exit(1);
}

process.exit(run(venvPython, args));
