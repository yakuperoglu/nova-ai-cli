# Nova CLI

Nova is an intelligent, conversational terminal assistant that translates your natural language requests into executable shell commands. It acts as a protective layer between you and your operating system, ensuring commands are safe to run while explaining what they do.

## Features

- **Conversational AI**: Ask questions and get intelligent, explanatory answers along with your commands.
- **Cross-Platform Support**: Generates correct commands for Windows (PowerShell), macOS, and Linux (bash/zsh).
- **Security First**: 
  - Dangerous commands (like `rm -rf /` or `format C:`) are strictly blocked.
  - Risky commands (like `sudo` or permission changes) require explicit confirmation.
  - Your API configuration is locked down with restrictive file permissions.
- **Interactive Authentication**: Secure, masked entry for your API credentials.
- **Smart Chain Processing**: Properly strings together complex multi-step commands based on your OS.

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

## Usage Example

To ask Nova to do something, just type `nova ask` followed by what you want in quotes:

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

You can even just chat with Nova:

```bash
nova ask "hello"
```
```
  Nova: Hello! How can I assist you with your terminal today?
```

## Security Overview

Nova prioritizes your system's safety. Every generated command runs through a built-in security validator before it is shown to you.

- **Blocked Level**: Operations that destroy the root filesystem, format drives, or perform common malware tactics are completely blocked. Nova will refuse to execute them.
- **Warning Level**: Operations requiring elevated privileges or modifying system permissions will display an explicit warning and require your consent.
- **Safe Level**: Standard directory traversal, file creation, and status checks.
