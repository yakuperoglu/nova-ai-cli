# Nova CLI

Nova is an intelligent, conversational terminal assistant that translates your natural language requests into executable shell commands. It acts as a protective layer between you and your operating system, ensuring commands are safe to run while explaining what they do.

## Key Features

- **Project File Context**: Attach physical files (like `package.json` or source code) to your prompt so Nova can generate highly accurate commands based on your actual project constraints.
- **Auto-Fix (Self-Healing)**: If a generated command fails to execute, Nova intercepts the error and offers to autonomously generate a corrected command.
- **Conversational Context**: Nova remembers your recent questions and answers, allowing you to ask follow-up questions naturally without losing context.
- **Persistent Memory**: You can set permanent rules and preferences (e.g., "Always use TypeScript") that Nova will strictly follow for every command it generates.
- **Built-in Assistant Mode**: Simply typing `nova ?` or `nova help` provides an instant native feature list and guide without using API tokens.
- **Cross-Platform Support**: Generates correct shell commands for Windows (PowerShell), macOS, and Linux (bash/zsh).
- **Security First**: 
  - Dangerous commands (like `rm -rf /` or `format C:`) are strictly blocked.
  - Risky commands (like `sudo` or permission changes) require explicit confirmation.
  - Your API configuration and memory data are locked down with restrictive file permissions.
- **Interactive Authentication**: Secure, masked keyboard entry for your API credentials.

---

## Installation Guide (For Beginners)

Welcome! Installing Nova is very simple. Just follow these 3 steps:

### Step 1: Install Node.js
Nova built on Node.js. If you don't have it installed:
1. Go to [nodejs.org](https://nodejs.org/)
2. Download the version that says "LTS" (Long Term Support).
3. Run the installer and click "Next" until it finishes.

### Step 2: Install Nova
Open your terminal (Command Prompt or PowerShell on Windows, Terminal on Mac) and copy-paste this line, then press Enter:

```bash
npm install -g nova-cli
```

### Step 3: Get Your Free AI Key
Nova needs a "key" to connect to its brain (Google Gemini).
1. Go to [Google AI Studio](https://aistudio.google.com/apikey) and sign in with your Google account.
2. Click "Create API Key" and copy the long text it gives you.
3. Go back to your terminal, type `nova auth`, and press Enter.
4. Paste your key when it asks (it will be hidden as you type for security) and hit Enter.

That's it! Nova is ready to use.

---

## Usage Examples

### 1. Generating Commands
To ask Nova to do something, just type `nova ask` (or simply `nova` since ask is the default) followed by what you want in quotes:

```bash
nova ask "find all PDF files in my downloads folder"
```

Nova will read your request, explain what the best command is, and ask if you want to execute it:

```
  Nova: This command will search your Downloads directory for any files ending with .pdf.

  ┌─────────────────────────────────────────┐
  │ $ find ~/Downloads -name "*.pdf"   SAFE
  └─────────────────────────────────────────┘

? Execute this action? (y/N) 
```

### 2. General Conversation
You can just chat with Nova natively:

```bash
nova ask "hello"
```
```
  Nova: Hello! How can I assist you with your terminal today?
```

### 3. Persistent Memory (Permanent Rules)
Tell Nova how you prefer to work, and it will remember forever.

Add a rule:
```bash
nova remember "Always use TypeScript for new projects"
```

List your rules:
```bash
nova memory --list
```

Remove a specific rule (e.g., rule number 1):
```bash
nova memory --remove 1
```

Clear all memory rules:
```bash
nova memory --clear
```

### 4. Contextual Chat Memory
Nova remembers the last 10 messages of your current session automatically.
If you wish to clear this short-term context memory to start fresh:
```bash
nova reset
```

### 5. Auto-Fix (Self-Healing Commands)
If a command you execute fails, Nova will catch the error and offer to fix it for you automatically:
```bash
  ✖ Çalıştırma başarısız: Command failed (exit code 1): ...
? Nova'nın bu hatayı analiz edip yeni bir çözüm üretmesini ister misiniz? (Y/n)
```
If you press Enter (Yes), Nova reads the raw error output from your shell and generates a new, corrected command instantly, skipping the need to manually copy-paste logs.

### 6. File Context (Attach Project Files)
Need Nova to generate a command based on a specific file? Use the `-f` (or `--file`) option:
```bash
nova ask "Run the linting script defined in this file" -f package.json
```
Nova reads `package.json`, analyzes it, and outputs exactly `npm run lint` without hallucinating or taking up valuable history memory limits.

### 7. View & Change AI Models
Nova's core brain is dynamic. You can swap out the AI model powering the CLI at any time (defaults to `gemini-2.5-flash` for max speed).
```bash
# Check current active model
nova model status

# Switch to a stronger model for complex reasoning
nova model set gemini-2.5-pro
```

### 8. View Audit Logs (History of Executions)
Nova keeps a secure, timestamped record of every command it executes (or that you cancel) so you always have a rollback trail.
```bash
nova audit
```
*Outputs exactly what was requested, what was run, and the exit status (SUCCESS, FAILED, CANCELLED).*

## Security & Privacy Overview

Nova prioritizes your system's safety and the absolute privacy of your credentials. Every generated command runs through a built-in security validator before it is shown to you.

- **API Key Privacy (No Middlemen)**: Your Google Gemini API key is stored **strictly locally** on your machine at `~/.nova/config.json`. It is never sent to any third-party telemetry servers or middlemen. Nova communicates with Google's official HTTPS API directly.
- **Strict File Permissions**: When you authenticate, Nova automatically locks down your configuration file (`chmod 600` on Unix systems), ensuring that only your user account can read or write to the API key file. Masked typing prevents shoulder-surfing during setup.
- **Command Blocking (Red Level)**: Operations that destroy the root filesystem, format drives, or perform common malware tactics are completely blocked out of the box. Nova will refuse to execute them even if prompted.
- **Permission Warnings (Yellow Level)**: Operations requiring elevated privileges (like `sudo`) or modifying system permissions will display an explicit warning tag and require your absolute consent before execution.
- **Safe Evaluation (Green Level)**: Standard directory traversal, file creation, and status checks are marked as explicitly safe for peace of mind.

## 🎨 Theme & UI Customization

Nova allows you to customize its interface with a variety of color palettes to match your terminal setup perfectly. We have detached from hardcoded colors and built a Custom Theme Engine instead!

**View Themes:**
```bash
nova theme list
```
*(Displays all available visual themes with a preview: default, dracula, ocean, monokai, hacker)*

**Set a Theme:**
```bash
nova theme set <theme-name>
# Example: nova theme set dracula
```

## 🚀 Installation

```bash
# Global installation from NPM (Once published)
npm install -g nova-ai-cli

# OR: Clone and run locally
git clone https://github.com/yakuperoglu/nova-cli.git
cd nova-cli
npm install
npm run build
npm link
```

## 🔄 Updating Nova

Nova includes a built-in Self-Update mechanism that pulls the latest source code from your Git working directory, installs any dependencies, and rebuilds the TypeScript application seamlessly.

```bash
# Pulls the latest commits and rebuilds the CLI
nova update

# Forces a clean package dependency install and rebuild regardless of git status
nova update -f
```
