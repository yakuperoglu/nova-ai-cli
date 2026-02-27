#!/usr/bin/env node

/**
 * Nova CLI — Entry Point
 *
 * Sets up the Commander program and registers commands:
 *   - ask (default): Translate natural language → shell command
 *   - auth: Save/check API key in global config
 */

import { Command } from "commander";
import { askCommand } from "./commands/ask.js";
import { authCommand, authStatusCommand } from "./commands/auth.js";
import { resetCommand } from "./commands/reset.js";
import { rememberCommand } from "./commands/remember.js";
import { memoryListCommand, memoryClearCommand, memoryRemoveCommand } from "./commands/memory.js";

const program = new Command();

program
    .name("nova")
    .description(
        "🚀 Your AI-powered terminal copilot. Translate natural language into executable CLI commands."
    )
    .version("1.0.0", "-v, --version", "Display the current version")
    .addHelpText('after', `
Features:
  🧠 Context Memory: Nova remembers your recent conversations for better context.
  💾 Persistent Memory: Use 'nova remember' to set permanent rules (e.g. "Always use TypeScript").
  💬 Conversational AI: Ask questions or just say hello, Nova will chat with you.
  🛡️ Validated Security: Dangerous commands are strictly blocked to protect your system.

Examples:
  $ nova "bu klasördeki tüm txt dosyalarını sil" 
  $ nova ?
  $ nova remember "Docker kullanmayı tercih ediyorum"
  $ nova memory -l
  $ nova reset
`);

// ─── Default Command: ask ────────────────────────────────────
program
    .command("ask", { isDefault: true })
    .description("Translate a natural language prompt into a shell command")
    .argument("<prompt...>", "Your request in natural language")
    .action(async (promptParts: string[]) => {
        const prompt = promptParts.join(" ").trim();

        // Intercept help/question marks to avoid unnecessary AI API calls
        if (prompt === "?" || prompt.toLowerCase() === "help") {
            program.help();
            return;
        }

        await askCommand(prompt);
    });

// ─── Auth Command ────────────────────────────────────────────
const auth = program
    .command("auth")
    .description("Manage your API key for AI services");

auth
    .command("set")
    .description("Save your Gemini API key (stored in ~/.nova/config.json)")
    .argument("<api-key>", "Your Gemini API key")
    .action(async (apiKey: string) => {
        await authCommand(apiKey);
    });

auth
    .command("status")
    .description("Check if an API key is configured")
    .action(async () => {
        await authStatusCommand();
    });

program
    .command("reset")
    .description("Clear Nova's conversational memory (history)")
    .action(() => {
        resetCommand();
    });

program
    .command("remember <fact>")
    .description("Save a persistent rule or preference to Nova's memory")
    .action((fact) => {
        rememberCommand(fact);
    });

program
    .command("memory")
    .description("Manage Nova's persistent memory")
    .option("-l, --list", "List all saved memories/rules")
    .option("-c, --clear", "Clear all saved memories/rules")
    .option("-r, --remove <index>", "Remove a specific memory by its 1-based index")
    .action((options) => {
        if (options.clear) {
            memoryClearCommand();
        } else if (options.remove) {
            memoryRemoveCommand(options.remove);
        } else {
            memoryListCommand();
        }
    });

// Shortcut: `nova auth` → interactive mode, `nova auth <key>` → direct set
auth
    .argument("[api-key]", "Your Gemini API key (if omitted, prompts interactively)")
    .action(async (apiKey: string | undefined) => {
        await authCommand(apiKey);
    });

// ─── Parse & Execute ─────────────────────────────────────────
program.parse(process.argv);
