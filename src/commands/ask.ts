/**
 * Ask Command
 *
 * Core flow:
 * 1. Take user's natural language prompt
 * 2. Send to AI service (expects { type, message, command } JSON)
 * 3. Display AI's conversational message
 * 4. If type is "chat", exit. (e.g. "selam")
 * 5. If type is "command", validate safety.
 * 6. Display command box and ask for confirmation.
 * 7. Execute the command (or cancel)
 */

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { confirm } from "@inquirer/prompts";
import { translateToCommand, AIResponse, AttachedFile } from "../services/ai.js";
import { executeCommand } from "../utils/executor.js";
import { validateCommand, getRiskIcon } from "../utils/security.js";
import { addMessage } from "../services/history.js";
import { appendLog } from "../utils/logger.js";

export async function askCommand(prompt: string, contextFiles?: string[]): Promise<void> {
    // ─── Validate Input ──────────────────────────────────────
    if (!prompt.trim()) {
        console.log(chalk.red("✖ Please provide a prompt."));
        console.log(chalk.dim('  Example: nova ask "list all files in this folder"'));
        process.exit(1);
    }

    // ─── Process Files (If Any) ──────────────────────────────
    const attachedFiles: AttachedFile[] = [];

    if (contextFiles && contextFiles.length > 0) {
        for (const filePath of contextFiles) {
            try {
                const resolvedPath = path.resolve(filePath);
                if (!fs.existsSync(resolvedPath)) {
                    console.log(chalk.yellow(`  ⚠ Uyarı: "${filePath}" bulunamadı, atlanıyor.`));
                    continue;
                }
                const stat = fs.statSync(resolvedPath);
                if (stat.isDirectory()) {
                    console.log(chalk.yellow(`  ⚠ Uyarı: "${filePath}" bir klasör, atlanıyor.`));
                    continue;
                }
                if (stat.size > 1024 * 1024) { // 1MB limit
                    console.log(chalk.yellow(`  ⚠ Uyarı: "${filePath}" çok büyük (>1MB), atlanıyor.`));
                    continue;
                }
                const content = fs.readFileSync(resolvedPath, "utf-8");
                attachedFiles.push({
                    name: path.basename(resolvedPath),
                    content: content
                });
                console.log(chalk.blue(`  📄 Dosya bağlama eklendi: ${path.basename(resolvedPath)}`));
            } catch (err) {
                console.log(chalk.yellow(`  ⚠ Uyarı: "${filePath}" okunamadı, atlanıyor.`));
            }
        }
        if (attachedFiles.length > 0) console.log(); // Spacing
    }

    // ─── Call AI Service ─────────────────────────────────────
    const spinner = ora({
        text: chalk.cyan("Nova düşünüyor..."),
        spinner: "dots2",
    }).start();

    let aiResult: AIResponse;

    try {
        aiResult = await translateToCommand(prompt, attachedFiles);
        spinner.stop();

        // Save conversation context (prompt only, to keep history clean of massive files)
        addMessage("user", prompt);
        addMessage("model", JSON.stringify(aiResult));
    } catch (error) {
        spinner.fail(chalk.red("Failed to reach Nova."));

        if (error instanceof Error) {
            console.log(chalk.red(`  → ${error.message}`));
        } else {
            console.log(chalk.red(`  → An unknown error occurred.`));
        }

        console.log();
        process.exit(1);
    }

    // ─── Display AI Message ─────────────────────────────────
    console.log();
    console.log(chalk.cyanBright("  ✨ Nova: ") + chalk.white(aiResult.message));
    console.log();

    // ─── Chat Only Mode ─────────────────────────────────────
    if (aiResult.type === "chat" || !aiResult.command) {
        // AI decided this doesn't need an action, just a reply.
        return;
    }

    // ─── Security Validation ────────────────────────────────
    const validation = validateCommand(aiResult.command);

    if (validation.level === "blocked") {
        console.log(chalk.red.bold(`  ${getRiskIcon(validation.level)} BLOCKED — Dangerous command detected!`));
        console.log(chalk.red(`  Reason: ${validation.reason}`));
        console.log(chalk.dim("  Nova refused to execute this command for your safety."));
        console.log();
        process.exit(1);
    }

    if (validation.level === "warning") {
        console.log(chalk.yellow(`  ${getRiskIcon(validation.level)} Warning: ${validation.reason}`));
        console.log();
    }

    const riskBadge =
        validation.level === "safe"
            ? chalk.green(` ${getRiskIcon(validation.level)} SAFE `)
            : chalk.yellow(` ${getRiskIcon(validation.level)} CAUTION `);

    // ─── Display Generated Command ──────────────────────────
    console.log(chalk.dim("  ┌─────────────────────────────────────────┐"));
    console.log(
        chalk.dim("  │ ") +
        chalk.yellowBright.bold("$ ") +
        chalk.white.bold(aiResult.command) +
        "  " +
        riskBadge
    );
    console.log(chalk.dim("  └─────────────────────────────────────────┘"));
    console.log();

    // ─── Ask for Confirmation ───────────────────────────────
    try {
        const confirmMessage =
            validation.level === "warning"
                ? chalk.yellow.bold("⚠ Bu komut riskler barındırıyor. Yine de çalıştırılsın mı?")
                : chalk.green("Bu işlemi onaylıyor musun?");

        const shouldExecute = await confirm({
            message: confirmMessage,
            default: true,
        });

        if (!shouldExecute) {
            console.log(chalk.dim("\n  ✖ İşlem iptal edildi.\n"));
            appendLog(prompt, aiResult.command, "CANCELLED");
            return;
        }
    } catch {
        // User pressed Ctrl+C
        console.log(chalk.dim("\n  ✖ İşlem iptal edildi.\n"));
        appendLog(prompt, aiResult.command, "CANCELLED", "User interrupted");
        return;
    }

    // ─── Execute Command ────────────────────────────────────
    console.log(chalk.dim("\n  ⏳ İşleniyor...\n"));

    try {
        const result = await executeCommand(aiResult.command);

        if (result.stdout) {
            console.log(chalk.white(result.stdout));
        }

        if (result.stderr) {
            // Some programs (like git) print normal info to stderr.
            // Since the command exited successfully (code 0), we just display it.
            console.log(chalk.yellow(result.stderr));
        }

        console.log(chalk.green("\n  ✔ İşlem başarıyla tamamlandı.\n"));
        appendLog(prompt, aiResult.command, "SUCCESS");

    } catch (error) {
        let errorMessage = "Bilinmeyen hata";
        if (error instanceof Error) {
            errorMessage = error.message;
            console.log(chalk.red(`\n  ✖ Çalıştırma başarısız: ${errorMessage}\n`));
        } else {
            console.log(chalk.red(`\n  ✖ Çalıştırma başarısız.\n`));
        }

        appendLog(prompt, aiResult.command, "FAILED", errorMessage);

        try {
            const shouldFix = await confirm({
                message: chalk.cyan("Nova'nın bu hatayı analiz edip yeni bir çözüm üretmesini ister misiniz?"),
                default: true,
            });

            if (shouldFix) {
                const fixPrompt = `Çalıştırdığım "${aiResult.command}" komutu şu hatayı verdi:\n${errorMessage}\nBu hatayı düzelten yeni bir komut üret ve açıklamasını yap.`;
                await askCommand(fixPrompt, contextFiles);
                return;
            } else {
                console.log(chalk.dim("\n  ✖ Otomatik onarım iptal edildi.\n"));
            }
        } catch {
            console.log(chalk.dim("\n  ✖ Çıkış yapıldı.\n"));
        }

        process.exit(1);
    }
}
