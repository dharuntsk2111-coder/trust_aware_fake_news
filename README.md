# Trust-Aware Fake News Detection

Checks a claim against fact-checked evidence and reports **two separate numbers**:

- **Model confidence** — how sure the classifier is.
- **Trust score** — how well retrieved evidence actually supports that prediction.

When the two disagree, the system answers **UNVERIFIED** instead of guessing. A
plain classifier cannot do this: it must label every claim, so a confident
wrong answer looks exactly like a confident right one.

DeBERTa-v3 with attention pooling, FAISS retrieval over 19,770 fact-checked
claims, temperature-scaled confidence, and SHAP word attributions. Runs on CPU.

---

## 1. What you need first

| Requirement | Notes |
|---|---|
| **Python 3.11** | 3.11.9 is the last version with a Windows installer. **Not 3.12 or newer** — one dependency has no build for them. |
| **Node.js 18 or newer** | Tested on Node 22. |
| **~5 GB free disk** | Python packages ~3 GB, model artifacts ~800 MB. |
| **~3 GB free RAM** | The model needs about 2 GB while running. |
| **A Hugging Face token** | With read access to the private model repo. |

### Installing Python 3.11 on Windows

Download **Python 3.11.9** from
[python.org](https://www.python.org/downloads/release/python-3119/) and choose
**Windows installer (64-bit)** from the files table at the bottom of that page.

On the installer's first screen, tick **Add python.exe to PATH** before
clicking Install.

> Do not install Python from the Microsoft Store. It creates a stub that fails
> with "Python was not found".

Check it worked:

```
py -0p
```

You should see a line containing `3.11`.



## 2. Install

From the project folder, run these two commands **in order**:

```bash
npm install
npm run setup
```

What they do:

1. `npm install` — downloads the small tool that runs the backend and frontend together.
2. `npm run setup` — creates the Python virtual environment in `.venv`, installs
   every Python package (including the CPU build of PyTorch), then installs the
   frontend packages.

**This takes 5–15 minutes** depending on your connection. PyTorch alone is a
large download, so it is normal for it to look stuck for a while.

---

## 3. Add your Hugging Face token

The trained model lives in a private Hugging Face repository, so the project
needs a token to download it.

Copy the example file:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# macOS / Linux
cp .env.example .env
```

Open `.env` and replace the placeholder with your real token:

```
HF_TOKEN=hf_your_real_token_here
```

Create a token at <https://huggingface.co/settings/tokens> — a **Read** token
is enough. If you use a fine-grained token, grant it access to the model repo
explicitly.

> `.env` is listed in `.gitignore` and must never be committed.

---

## 4. Run it

```bash
npm run dev
```

This starts both halves of the application together:

| | Address |
|---|---|
| **Web interface** | <http://localhost:5173> |
| API | <http://127.0.0.1:8000> |
| API documentation | <http://127.0.0.1:8000/docs> |

Open **<http://localhost:5173>** in your browser.

Press **Ctrl+C** in the terminal to stop both.

### The first run is slow — this is expected

On the very first run, the model is downloaded from Hugging Face (about
800 MB). After that it is cached on your machine and never downloaded again.

Every time you start the server, the model takes **about 3 minutes to load**
into memory. During that time the page shows:

> The model is still loading — this takes a few minutes after the server
> starts. Try again shortly.

That message is correct behaviour, not an error. Wait until the terminal
prints `pipeline loaded, model_loaded is now true`, then click Check again.

---

## 5. Check that everything works

With the application **not** running, so the two do not compete for memory:

```bash
npm test
```

This loads the model and checks five known claims. All five must pass:

| Claim | Expected |
|---|---|
| Drinking hot water cures cancer | FAKE, trust 0.872 |
| The government announced a new tax policy yesterday | UNVERIFIED, trust 0.3168 |
| Drinking hot water cures cancer and boosts your immune system | FAKE, trust 0.872 |
| Garlic prevents COVID-19 infection | UNVERIFIED, trust 0.3490 |
| Drinking hot water cures cancer. | FAKE, trust 0.872 |

It finishes with `SMOKE TEST PASSED`. Allow about 5 minutes — most of that is
loading the model.

A different **verdict** means something is broken. Trust values may differ in
the last decimal between machines, which is normal.

To test the API endpoints instead, start the app with `npm run dev` in one
terminal, then run `npm run test:api` in another.

---

## 6. All commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the API and web interface together |
| `npm test` | Run the five acceptance checks |
| `npm run test:api` | Test the API endpoints (needs the app running) |
| `npm run build` | Build the web interface for production |
| `npm run dev:api` | Start only the API |
| `npm run dev:ui` | Start only the web interface |
| `npm run setup` | Install everything (first-time setup) |

---

## 7. Trying it out

Four example claims are listed on the page, and each shows something
different:

- **Drinking hot water cures cancer** — FAKE with high trust. Model and
  evidence agree, so the system commits to the answer.
- **Garlic prevents COVID-19 infection** — the classifier says REAL with 99.7%
  confidence and is **wrong**. The retrieved fact-checks disagree, so the
  system returns UNVERIFIED instead. This is the whole point of the project in
  one example.
- **The government announced a new tax policy yesterday** — UNVERIFIED for a
  different reason: no sufficiently similar fact-check exists.
- **Drinking hot water cures cancer and boosts your immune system** — split
  into two parts, each checked separately with its own evidence.

Click **Why this verdict?** on any result to see SHAP word contributions. It
takes about 15 seconds, because it runs the model many times with different
words removed.

---

## 8. Project layout

```
src/            the machine-learning pipeline
  config.py       constants and environment variables
  model.py        DeBERTa with attention pooling
  retrieval.py    FAISS evidence search
  trust.py        the trust score
  pipeline.py     ties it together; loaded once at startup
api/            FastAPI web service
ui/             React + Vite + Tailwind interface
scripts/        smoke_test.py, api_test.py, rebuild_corpus.py
Dockerfile      builds the API for Hugging Face Spaces
render.yaml     describes the static site for Render
```

`CLAUDE.md` holds the full technical specification, the reference
implementation, and the project's known limitations.

---

## 9. If something goes wrong

**"Python was not found"**
Python 3.11 is not installed, or not on PATH. Reinstall it from python.org
with **Add python.exe to PATH** ticked, then open a **new** terminal.

**"No virtualenv found at .venv..."**
You skipped `npm run setup`. Run it.

**"Could not reach the verification service"**
The backend is not running, or the page is pointing at the wrong address.
Check that `npm run dev` is still running and look at its terminal output for
errors.

**"The model is still loading"**
Normal for the first ~3 minutes after starting. Wait, then try again.

**A 401 or 404 while downloading the model**
The `HF_TOKEN` in `.env` is missing, wrong, or lacks access to the private
model repo.

**`pip install` fails on shap or sentencepiece**
You are probably on Python 3.12 or newer. This project needs **3.11**. Delete
the `.venv` folder, install Python 3.11, and run `npm run setup` again.

**Port already in use**
Something is already using port 8000 or 5173, often a previous run that did
not shut down. Close that terminal window, or restart the machine.

---

## 10. Deployment notes

**This project runs locally.** There is no hosted instance, and the steps in
sections 2 to 4 are the supported way to run it.

That is a constraint of the free hosting tiers, not of the code. The model
needs about 2 GB of RAM:

| Host | Why it does not fit |
|---|---|
| Render free web service | 512 MB of RAM — not enough to load the checkpoint. The 2 GB instance is a paid plan. |
| Hugging Face Spaces | 16 GB of RAM on the free CPU tier, but as of 2026 the Docker and Gradio SDKs require a PRO subscription. Only Static Spaces are free. |
| Google Cloud Run | Fits, but scales to zero: an idle instance re-downloads the 736 MB checkpoint and reloads it, so the first request after a pause takes around four minutes. |

Two config files are kept in the repository so a deployment needs no new work:

- **`Dockerfile`** — builds the API alone, CPU-only PyTorch, listening on port
  7860. Valid for any Docker host; it was written against the Hugging Face
  Spaces layout, so caches are writable by uid 1000.
- **`render.yaml`** — describes the frontend as a Render static site, with
  `VITE_API_URL` supplied at build time.

If the API is ever hosted, set `ALLOWED_ORIGINS` on it to the website's origin.
It defaults to `*`, which is appropriate for local use only.

---

## 11. The repository

The code is on GitHub at
<https://github.com/dharuntsk2111-coder/trust_aware_fake_news> (private).

What is deliberately **not** committed:

- `.env` — the Hugging Face token. `.env.example` is the committed template.
- `model.pt`, `faiss.index`, `evidence.parquet` — the trained artifacts live in
  the Hugging Face model repo and are downloaded on first run.
- `.venv/`, `node_modules/`, `ui/dist/` — all rebuilt by `npm run setup`.

To confirm the token file was never committed:

```bash
git ls-files | grep -c "^\.env$"
```

This must print `0`.

---

## 12. Known limitations

- **Negation blindness.** Retrieval cannot tell a claim from its opposite:
  "masks work" and "masks do not work" look nearly identical to it. A true
  claim can therefore match debunked opposite claims and be marked FAKE.
- **No pronoun resolution** when splitting compound claims — "they contain
  mercury" loses track of what "they" refers to.
- **Reads the first 64 words only.** Best suited to single-sentence claims.
- **The evidence is static and pre-2023.** Claims about recent events have no
  matching fact-check and come back UNVERIFIED.
