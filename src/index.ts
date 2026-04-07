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
import { modelSetCommand, modelStatusCommand } from "./commands/model.js";
import { providerSetCommand, providerStatusCommand } from "./commands/provider.js";
import { auditCommand } from "./commands/audit.js";
import { themeSetCommand, themeListCommand } from "./commands/theme.js";
import { updateCommand } from "./commands/update.js";

const program = new Command();

program
    .name("nova")
    .description(
        "Your AI-powered terminal copilot. Translate natural language into executable CLI commands."
    )
    .version("1.0.0", "-v, --version", "Display the current version")
    .addHelpText('after', `
Features:
  Context Memory: Nova remembers your recent conversations for better context.
   Persistent Memory: Use 'nova remember' to set permanent rules (e.g. "Always use TypeScript").
   Conversational AI: Ask questions or just say hello, Nova will chat with you.
  Validated Security: Dangerous commands are strictly blocked to protect your system.

AI sağlayıcıları (Gemini, OpenAI, Anthropic):
  nova provider status              Aktif sağlayıcıyı göster
  nova provider set <ad>            gemini | openai | anthropic
  nova auth                         Anahtarı gizli gir; biçimden sağlayıcı tahmini
  nova auth <anahtar>               Aynı (argümanlı; shell geçmişine düşebilir)
  nova auth set [--provider <ad>] [anahtar]
                                    --provider yoksa anahtar önekine göre tahmin:
                                    sk-ant… → Anthropic, sk-… → OpenAI, diğer → Gemini
  nova auth status                  Anahtar / config özeti

Examples:
  $ nova "delete all txt files in this folder" 
  $ nova ?
  $ nova remember "I prefer using Docker"
  $ nova memory -l
  $ nova reset
  $ nova auth set
  $ nova provider set openai
`);

// ─── Default Command: ask ────────────────────────────────────
program
    .command("ask", { isDefault: true })
    .description("Translate a natural language prompt into a shell command")
    .argument("<prompt...>", "Your request in natural language")
    .option("-f, --file <paths...>", "Attach files as context")
    .action(async (promptParts: string[], options: { file?: string[] }) => {
        const prompt = promptParts.join(" ").trim();

        // Intercept help/question marks to avoid unnecessary AI API calls
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

auth
    .command("set")
    .description(
        "API anahtarını kaydet; --provider yoksa anahtar biçiminden sağlayıcı tahmin edilir ve aktif yapılır"
    )
    .option(
        "-p, --provider <name>",
        "gemini | openai | anthropic (zorla; yoksa sk-ant… / sk-… / diğer → tahmin)"
    )
    .argument("[api-key]", "İsteğe bağlı; verilmezse güvenli (maskeli) sorulur")
    .action(async (apiKey: string | undefined, options: { provider?: string }) => {
        await authCommand(apiKey, { provider: options.provider });
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

program
    .command("audit")
    .description("View recent commands executed via Nova (Audit Trail)")
    .action(() => {
        auditCommand();
    });

// ─── Model Selection Command ─────────────────────────────────
const modelCmd = program
    .command("model")
    .description("Switch or view the active AI model id (sağlayıcıya göre değişir)");

modelCmd
    .command("set <model-name>")
    .description("Model id (örn. gemini-2.5-pro, gpt-4o, claude-3-5-sonnet-20241022)")
    .action((modelName: string) => {
        modelSetCommand(modelName);
    });

modelCmd
    .command("status")
    .description("View the currently active AI model")
    .action(() => {
        modelStatusCommand();
    });

// ─── Theme Customization Command ─────────────────────────────
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
    .option("-f, --force", "Force dependency reinstall and full rebuild even if up to date")
    .action((options) => {
        updateCommand(options.force);
    });

// Shortcut: `nova auth` → interactive mode, `nova auth <key>` → direct set
auth
    .argument("[api-key]", "API anahtarı (yoksa maskeli sorulur; biçimden sağlayıcı tahmini)")
    .option("-p, --provider <name>", "gemini | openai | anthropic (zorla; yoksa tahmin)")
    .action(async (apiKey: string | undefined, options: { provider?: string }) => {
        await authCommand(apiKey, { provider: options.provider });
    });

// ─── Provider (Gemini / OpenAI / Anthropic) ─────────────────
const providerCmd = program.command("provider").description("Aktif AI sağlayıcısını seç veya görüntüle");

providerCmd
    .command("set <name>")
    .description("Aktif sağlayıcıyı ayarla: gemini, openai veya anthropic")
    .action((name: string) => {
        providerSetCommand(name);
    });

providerCmd
    .command("status")
    .description("Şu anki aktif sağlayıcıyı göster")
    .action(() => {
        providerStatusCommand();
    });

// ─── Parse & Execute ─────────────────────────────────────────
program.parse(process.argv);
