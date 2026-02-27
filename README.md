# Nova CLI

Nova is an intelligent, conversational terminal assistant that translates your natural language requests into executable shell commands. It acts as a protective layer between you and your operating system, ensuring commands are safe to run while explaining what they do.

## Key Features

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

## Security & Privacy Overview

Nova prioritizes your system's safety and the absolute privacy of your credentials. Every generated command runs through a built-in security validator before it is shown to you.

- **API Key Privacy (No Middlemen)**: Your Google Gemini API key is stored **strictly locally** on your machine at `~/.nova/config.json`. It is never sent to any third-party telemetry servers or middlemen. Nova communicates with Google's official HTTPS API directly.
- **Strict File Permissions**: When you authenticate, Nova automatically locks down your configuration file (`chmod 600` on Unix systems), ensuring that only your user account can read or write to the API key file. Masked typing prevents shoulder-surfing during setup.
- **Command Blocking (Red Level)**: Operations that destroy the root filesystem, format drives, or perform common malware tactics are completely blocked out of the box. Nova will refuse to execute them even if prompted.
- **Permission Warnings (Yellow Level)**: Operations requiring elevated privileges (like `sudo`) or modifying system permissions will display an explicit warning tag and require your absolute consent before execution.
- **Safe Evaluation (Green Level)**: Standard directory traversal, file creation, and status checks are marked as explicitly safe for peace of mind.
