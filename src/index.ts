#!/usr/bin/env node

/**
 * Nova CLI — Entry Point
 *
 * Sets up the Commander program and registers all commands.
 */

import { createRequire } from "node:module";
import { Command } from "commander";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: PKG_VERSION } = require("../package.json") as { version: string };

import { askCommand } from "./commands/ask.js";
import { authCommand, authStatusCommand } from "./commands/auth.js";
import { resetCommand } from "./commands/reset.js";
import { rememberCommand } from "./commands/remember.js";
import { memoryListCommand, memoryClearCommand, memoryRemoveCommand } from "./commands/memory.js";
import { modelSetCommand, modelStatusCommand } from "./commands/model.js";
import {
    providerSetCommand,
    providerStatusCommand,
    providerListPresetsCommand,
} from "./commands/provider.js";
import { auditCommand } from "./commands/audit.js";
import { themeSetCommand, themeListCommand } from "./commands/theme.js";
import { updateCommand } from "./commands/update.js";
import { langSetCommand, langStatusCommand } from "./commands/lang.js";

const program = new Command();

program
    .name("nova")
    .description(
        "Your AI-powered terminal copilot. Translate natural language into executable CLI commands."
    )
    .version(PKG_VERSION, "-v, --version", "Display the current version")
    .addHelpText(
        "after",
        `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 QUICK START
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1) nova auth                        Enter API key (provider is auto-detected)
  2) nova "list all files"            Natural language → command → confirm → run

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 AI PROVIDERS  (Gemini · OpenAI · Anthropic)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  nova provider status                Active provider and base URL
  nova provider set gemini            Google Gemini (default)
  nova provider set openai            OpenAI (GPT series)
  nova provider set anthropic         Anthropic (Claude series)
  nova provider presets               List OpenAI-compatible presets

  OpenAI-compatible (local/cloud):
  nova provider set openai --preset groq       Groq  (Llama, Mixtral)
  nova provider set openai --preset ollama     Ollama (localhost:11434)
  nova provider set openai --preset lmstudio   LM Studio (localhost:1234)
  nova provider set openai --preset together   Together AI
  nova provider set openai --base-url <url>    Custom endpoint

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 AUTHENTICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  nova auth                           Masked input — provider inferred from key
  nova auth set                       Same as above (subcommand form)
  nova auth set -p openai <key>       Save key for a specific provider
  nova auth status                    Key status for all providers

  Key detection: sk-ant… → Anthropic · sk-… → OpenAI · AIza… / other → Gemini

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 MODEL SELECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  nova model status                   Active provider + model
  nova model set gemini-2.5-pro       Gemini Pro
  nova model set gpt-4o               OpenAI GPT-4o
  nova model set claude-3-5-sonnet-20241022    Claude Sonnet

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 MEMORY & CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  nova remember "Always use TypeScript"   Add a persistent rule
  nova memory -l                      List all saved rules
  nova memory -r <number>             Delete a specific rule
  nova memory -c                      Clear all rules
  nova reset                          Reset session history

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 LANGUAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  nova lang                           Show current language setting
  nova lang set en                    Switch to English (default)
  nova lang set tr                    Switch to Turkish (Türkçe)

  Controls both CLI output language and AI response language.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECURITY & AUDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  nova audit                          Recent commands (success / fail / cancel)
  Blocked:  rm -rf /, format, EncodedCommand, eval+fetch, reverse shells…
  Warning:  sudo, chmod 777, kill -9, registry changes…
  Redacted: API keys are masked before being written to audit logs.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 THEMES & UPDATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  nova theme list                     Available themes (default, dracula, ocean…)
  nova theme set dracula              Switch UI theme
  nova update                         Update to latest version (git pull + build)
  nova update -f                      Force rebuild

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  $ nova "delete all .log files in this folder"
  $ nova ask "git log last 5 commits" -f package.json
  $ nova remember "Always use Docker"
  $ nova provider set openai --preset groq
  $ nova model set llama-3.3-70b-versatile
  $ nova auth
  $ nova ?
`
    );

// ─── Default Command: ask ────────────────────────────────────
program
    .command("ask", { isDefault: true })
    .description("Translate a natural language prompt into a shell command")
    .argument("<prompt...>", "Your request in natural language")
    .option("-f, --file <paths...>", "Attach files as context")
    .action(async (promptParts: string[], options: { file?: string[] }) => {
        const prompt = promptParts.join(" ").trim();

        if (prompt === "?" || prompt.toLowerCase() === "help") {
            program.help();
            return;
        }

        await askCommand(prompt, options.file);
    });

// ─── Auth Command ────────────────────────────────────────────
const auth = program
    .command("auth")
    .description("Manage API keys for AI providers (Gemini, OpenAI, Anthropic)");

auth.command("set")
    .description(
        "Save an API key; provider is inferred from key format unless --provider is given"
    )
    .option(
        "-p, --provider <name>",
        "gemini | openai | anthropic (explicit; otherwise inferred from sk-ant… / sk-… / other)"
    )
    .argument("[api-key]", "Optional; if omitted you will be prompted securely (masked)")
    .action(async (apiKey: string | undefined, options: { provider?: string }) => {
        await authCommand(apiKey, { provider: options.provider });
    });

auth.command("status")
    .description("Check if an API key is configured for the active provider")
    .action(async () => {
        await authStatusCommand();
    });

// Shortcut: `nova auth` → interactive, `nova auth <key>` → direct set
auth.argument("[api-key]", "API key (optional; prompts securely if omitted)")
    .option("-p, --provider <name>", "gemini | openai | anthropic (explicit; otherwise inferred)")
    .action(async (apiKey: string | undefined, options: { provider?: string }) => {
        await authCommand(apiKey, { provider: options.provider });
    });

// ─── Reset Command ───────────────────────────────────────────
program
    .command("reset")
    .description("Clear Nova's conversational memory (session history)")
    .action(() => {
        resetCommand();
    });

// ─── Remember Command ────────────────────────────────────────
program
    .command("remember <fact>")
    .description("Save a persistent rule or preference to Nova's memory")
    .action(fact => {
        rememberCommand(fact);
    });

// ─── Memory Command ──────────────────────────────────────────
program
    .command("memory")
    .description("Manage Nova's persistent rules and memory")
    .option("-l, --list", "List all saved rules")
    .option("-c, --clear", "Clear all saved rules")
    .option("-r, --remove <index>", "Remove a specific rule by its 1-based index")
    .action(options => {
        if (options.clear) {
            memoryClearCommand();
        } else if (options.remove) {
            memoryRemoveCommand(options.remove);
        } else {
            memoryListCommand();
        }
    });

// ─── Audit Command ───────────────────────────────────────────
program
    .command("audit")
    .description("View recent commands executed via Nova (Audit Trail)")
    .action(() => {
        auditCommand();
    });

// ─── Model Selection Command ─────────────────────────────────
const modelCmd = program
    .command("model")
    .description("Switch or view the active AI model id");

modelCmd
    .command("set <model-name>")
    .description("Model id (e.g. gemini-2.5-pro, gpt-4o, claude-3-5-sonnet-20241022)")
    .action((modelName: string) => {
        modelSetCommand(modelName);
    });

modelCmd
    .command("status")
    .description("View the currently active AI model and provider")
    .action(() => {
        modelStatusCommand();
    });

// ─── Theme Command ───────────────────────────────────────────
const themeCmd = program
    .command("theme")
    .description("Switch or view the active Nova UI color theme");

themeCmd
    .command("set <theme-name>")
    .description("Set the visual color theme (e.g. ocean, dracula)")
    .action((themeName: string) => {
        themeSetCommand(themeName);
    });

themeCmd
    .command("list")
    .description("List all available color themes")
    .action(() => {
        themeListCommand();
    });

// ─── Auto-Update Command ─────────────────────────────────────
program
    .command("update")
    .description("Update Nova CLI to the latest version from GitHub")
    .option("-f, --force", "Force dependency reinstall and full rebuild even if already up to date")
    .action(options => {
        updateCommand(options.force);
    });

// ─── Provider Command ────────────────────────────────────────
const providerCmd = program
    .command("provider")
    .description("Select or view the active AI provider");

providerCmd
    .command("set <name>")
    .description("Set active provider: gemini, openai, or anthropic")
    .option("--preset <name>", "OpenAI-compatible preset: groq, ollama, lmstudio, together")
    .option("--base-url <url>", "Custom OpenAI-compatible endpoint URL (for openai provider)")
    .action((name: string, opts: { preset?: string; baseUrl?: string }) => {
        providerSetCommand(name, opts);
    });

providerCmd
    .command("status")
    .description("Show the currently active provider and its configuration")
    .action(() => {
        providerStatusCommand();
    });

providerCmd
    .command("presets")
    .description("List available OpenAI-compatible presets (Groq, Ollama, LM Studio, Together)")
    .action(() => {
        providerListPresetsCommand();
    });

// ─── Language Command ────────────────────────────────────────
const langCmd = program
    .command("lang")
    .description("Set the CLI display language and AI response language (en | tr)");

langCmd
    .command("set <language>")
    .description("Set language: en (English, default) or tr (Turkish)")
    .action((lang: string) => {
        langSetCommand(lang);
    });

langCmd
    .command("status")
    .description("Show the current language setting")
    .action(() => {
        langStatusCommand();
    });

// Show lang status when `nova lang` is called with no subcommand
langCmd.action(() => {
    langStatusCommand();
});

// ─── Parse & Execute ─────────────────────────────────────────
program.parse(process.argv);
