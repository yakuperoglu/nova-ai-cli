# Nova CLI — v2.1.1

Nova is an AI-powered terminal assistant that translates natural language into safe, executable shell commands. It supports **Google Gemini, OpenAI, Anthropic Claude**, and any **OpenAI-compatible** provider (Groq, Ollama, LM Studio, Together AI).

---

## Key Features

- **Multi-Provider AI**: Switch between Gemini, OpenAI, Anthropic, or any OpenAI-compatible endpoint at any time.
- **Smart API Key Detection**: Just paste your key — Nova detects the provider from the key format automatically (`sk-ant…` → Anthropic, `sk-…` → OpenAI, `AIza…` → Gemini).
- **OpenAI-Compatible Presets**: One command to switch to Groq, Ollama, LM Studio, or Together AI.
- **Project File Context**: Attach files (`-f package.json`) so Nova generates commands based on your actual project.
- **Auto-Fix (Self-Healing)**: When a command fails, Nova reads the error and offers a corrected version instantly.
- **Conversational Context**: Remembers your last 10 messages. Follow-up questions work naturally.
- **Persistent Memory**: Save permanent rules (e.g. "Always use TypeScript") that Nova follows in every session.
- **3-Tier Security Engine**:
  - **Blocked (Hard Deny)**: `rm -rf /`, `format C:`, `EncodedCommand`, `eval+fetch`, reverse shells, disabling Windows Defender, clearing event logs, and 25+ more patterns.
  - **Warning (Confirm)**: `sudo`, `chmod 777`, `kill -9`, registry edits, firewall changes.
  - **Audit Log Redaction**: API keys and tokens are masked before being written to the audit log.
- **Network Timeout Protection**: All AI API calls (OpenAI, Anthropic) have a 25-second timeout with clear error messages.
- **Cross-Platform**: Windows (PowerShell), macOS and Linux (bash/zsh).
- **Color Themes**: `default`, `dracula`, `ocean`, `monokai`, `hacker`.
- **Self-Updating**: `nova update` pulls latest code and rebuilds automatically.
- **Test Suite**: 73 unit tests covering security rules, provider inference, log redaction, and timeout behavior.

---

## Installation

### Step 1 — Install Node.js

Download the **LTS** version from [nodejs.org](https://nodejs.org/).

### Step 2 — Install Nova

```bash
npm install -g nova-ai-cli
```

Or clone and run locally:

```bash
git clone https://github.com/yakuperoglu/nova-ai-cli.git
cd nova-ai-cli
npm install
npm run build
npm link
```

### Step 3 — Add Your API Key

Run the interactive auth command. Nova will detect your provider from the key format automatically:

```bash
nova auth
```

```
  Enter your API key
  → Provider is inferred from key format: sk-ant… → Anthropic, sk-… → OpenAI, other → Gemini

  API Key: ••••••••••••••••

  [OK] API key saved successfully!
  → Provider: openai
```

That's it. Nova is ready.

---

## Usage

### 1. Natural Language → Shell Command

```bash
nova "find all PDF files in my downloads folder"
# or explicitly:
nova ask "find all PDF files in my downloads folder"
```

```
  Nova: This searches your Downloads folder for files ending with .pdf.

  ┌─────────────────────────────────────────┐
  │ $ find ~/Downloads -name "*.pdf"   SAFE │
  └─────────────────────────────────────────┘

? Do you approve this action? (Y/n)
```

### 2. Attach Project Files as Context

```bash
nova ask "run the lint script" -f package.json
nova ask "what does this function do?" -f src/utils/security.ts
```

Nova reads the file, understands its content, and generates an accurate command without guessing.

### 3. Conversational Chat

```bash
nova ask "hello"
# → Nova: Hello! How can I assist you with your terminal today?

nova ask "what is a symlink?"
# → Nova explains without generating a command
```

### 4. Auto-Fix (Self-Healing)

When a command fails, Nova catches the error and offers to fix it:

```
  [FAIL] Execution failed: Command failed (exit code 1): ...

? Would you like Nova to analyze this error and generate a new solution? (Y/n)
```

Press Enter and Nova reads the raw error output and retries with a corrected command.

---

## AI Providers

Nova supports three built-in providers and any OpenAI-compatible endpoint.

### Check and Switch Provider

```bash
nova provider status          # show active provider, model, base URL
nova provider set gemini      # switch to Google Gemini (default)
nova provider set openai      # switch to OpenAI
nova provider set anthropic   # switch to Anthropic Claude
```

### OpenAI-Compatible Presets (Groq, Ollama, LM Studio, Together AI)

```bash
nova provider presets         # list all available presets

nova provider set openai --preset groq       # Groq (fast Llama/Mixtral)
nova provider set openai --preset ollama     # Ollama (local, localhost:11434)
nova provider set openai --preset lmstudio   # LM Studio (local, localhost:1234)
nova provider set openai --preset together   # Together AI

# Custom endpoint (any OpenAI-compatible API)
nova provider set openai --base-url https://my-llm-server.com/v1
```

After switching preset, set the appropriate model:

```bash
nova model set llama-3.3-70b-versatile    # for Groq
nova model set llama3.2                   # for Ollama
nova model set local-model                # for LM Studio
```

### Default Models per Provider

| Provider | Default Model |
|---|---|
| gemini | `gemini-2.5-flash` |
| openai | `gpt-4o-mini` |
| anthropic | `claude-3-5-haiku-20241022` |

---

## Authentication

### Interactive (Recommended — key stays out of shell history)

```bash
nova auth
```

### Direct (key visible in shell history — use with caution)

```bash
nova auth sk-proj-xxxxxxxxxxxxxxxx
```

### Force a Specific Provider

```bash
nova auth set --provider openai sk-proj-xxxxxxxx
nova auth set --provider anthropic sk-ant-api03-xxxxxxxx
nova auth set --provider gemini AIzaSyDxxxxxxxxx
```

### Check Status

```bash
nova auth status
```

```
  Active provider: openai
  [OK] API key is configured for this provider
  → Key: sk-pro•••••••••••1234
  Keys saved for other providers: gemini
```

---

## Model Selection

```bash
nova model status                          # current provider + model

# Gemini
nova model set gemini-2.5-flash            # fast (default)
nova model set gemini-2.5-pro              # more capable

# OpenAI
nova model set gpt-4o-mini                 # fast (default)
nova model set gpt-4o                      # most capable

# Anthropic
nova model set claude-3-5-haiku-20241022   # fast (default)
nova model set claude-3-5-sonnet-20241022  # more capable
```

---

## Memory & Context

### Persistent Rules (survive sessions and resets)

```bash
nova remember "Always use TypeScript for new projects"
nova remember "Prefer Docker over local installs"

nova memory --list              # list all rules
nova memory --remove 1          # remove rule #1
nova memory --clear             # clear all rules
```

### Session Context

Nova remembers your last 10 messages automatically. Clear it to start fresh:

```bash
nova reset
```

---

## Security

Nova runs every AI-generated command through a **3-tier security engine** before showing it to you.

### Tier 1 — Hard Blocked (never executed)

| Category | Examples |
|---|---|
| Obfuscated execution | `powershell -EncodedCommand …`, `IEX(…)`, `Invoke-Expression`, Base64 decode chains |
| Remote code execution | `eval $(curl …)`, `` `wget … ` ``, `$()` fetch substitution |
| Inline backdoors | Python/Node/Ruby/Perl one-liners with socket/exec/subprocess |
| Reverse shells | `nc -lvp`, `ncat -e`, `/dev/tcp/`, `/dev/udp/` |
| Security tool disabling | `Set-MpPreference -Disable`, `netsh firewall … off`, `wevtutil cl`, `auditpol` |
| Filesystem destruction | `rm -rf /`, `mkfs.*`, `format C:`, `dd if=… of=/dev/sda` |
| System shutdown | `shutdown`, `reboot`, `systemctl poweroff` |

### Tier 2 — Warning (confirmation required)

`sudo`, `chmod 777`, `kill -9`, `killall`, `iptables`, `passwd`, `useradd/del`, `crontab`, `REG DELETE`, `Set-ExecutionPolicy`

### Tier 3 — Audit Log Redaction

API keys, tokens, and passwords are automatically masked before being written to `~/.nova/audit.log`:

- `sk-proj-abc123…` → `sk-***REDACTED***`
- `AIzaSyDxxx…` → `AIza***REDACTED***`
- `Bearer eyJ…` → `Bearer ***REDACTED***`
- `password=secret` → `password=***REDACTED***`

### File Permissions

Config, history, memory, and audit files are locked to owner-only (`chmod 600`) on Unix systems.

### Network Timeout

All AI API calls (OpenAI, Anthropic) abort after **25 seconds** with a clear error message. This prevents the CLI from hanging on slow or unreachable endpoints.

---

## Audit Log

```bash
nova audit
```

Shows the last 30 executed/cancelled/failed commands with timestamps.

```
[2026-04-09T14:32:01Z] | [SUCCESS]   | Prompt: "list all files" | Command: "ls -la"
[2026-04-09T14:35:17Z] | [CANCELLED] | Prompt: "delete node_modules" | Command: "rm -rf node_modules"
[2026-04-09T14:40:03Z] | [FAILED]    | Prompt: "run tests" | Command: "npm test" | Error: ...
```

---

## Themes

```bash
nova theme list              # preview all themes
nova theme set dracula       # switch theme
nova theme set ocean
nova theme set monokai
nova theme set hacker
nova theme set default
```

---

## Self-Update

```bash
nova update         # git pull + npm install + build
nova update -f      # force full rebuild even if already up to date
```

Requires installation via `git clone`. npm global installs should use `npm update -g nova-ai-cli`.

---

## All Commands

```
nova <prompt>                     Natural language → command (default)
nova ask <prompt> [-f <file...>]  Same, with optional file context

nova auth                         Interactive API key setup
nova auth set [-p <provider>] [key]
nova auth status

nova provider status
nova provider set <gemini|openai|anthropic> [--preset <name>] [--base-url <url>]
nova provider presets

nova model status
nova model set <model-id>

nova lang
nova lang set <en|tr>

nova remember "<rule>"
nova memory [-l | -c | -r <n>]
nova reset

nova audit
nova theme list
nova theme set <name>
nova update [-f]

nova -v / --version
nova --help / nova ?
```

---

## Privacy

- All API keys are stored **locally** at `~/.nova/config.json` — never sent to any third-party server.
- Nova communicates **directly** with the AI provider's official API over HTTPS.
- No telemetry, no analytics, no external logging.

---

## Development

```bash
npm run build       # compile TypeScript
npm run dev         # run with tsx (no compile step)
npm test            # run 73 unit tests (vitest)
npm run test:watch  # watch mode
```
