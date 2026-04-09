/**
 * Ask Command
 *
 * Core flow:
 * 1. Take user's natural language prompt
 * 2. Send to AI service (expects { type, message, command } JSON)
 * 3. Display AI's conversational message
 * 4. If type is "chat", exit.
 * 5. If type is "command", validate safety.
 * 6. Display command box and ask for confirmation.
 * 7. Execute the command (or cancel)
 */

import fs from "node:fs";
import path from "node:path";
import ora from "ora";
import { confirm } from "@inquirer/prompts";
import { translateToCommand, AIResponse, AttachedFile } from "../services/ai.js";
import { executeCommand } from "../utils/executor.js";
import { validateCommand, getRiskIcon } from "../utils/security.js";
import { readPolicy, findPolicyFile, matchPolicy } from "../services/policy.js";
import { addMessage } from "../services/history.js";
import { appendLog } from "../utils/logger.js";
import { theme } from "../utils/theme.js";
import { t } from "../utils/i18n.js";

const MAX_AUTO_FIX_RETRIES = 3;

export async function askCommand(prompt: string, contextFiles?: string[], retryCount: number = 0): Promise<void> {
    if (!prompt.trim()) {
        console.log(theme.error(`[FAIL] ${t("ask.noPrompt")}`));
        console.log(theme.dim(`  ${t("ask.noPromptExample")}`));
        process.exit(1);
    }

    // ─── Process Files ───────────────────────────────────────
    const attachedFiles: AttachedFile[] = [];

    if (contextFiles && contextFiles.length > 0) {
        for (const filePath of contextFiles) {
            try {
                const resolvedPath = path.resolve(filePath);
                if (!fs.existsSync(resolvedPath)) {
                    console.log(theme.warning(`  ${t("ask.fileWarning", { file: filePath, reason: t("ask.fileNotFound") })}`));
                    continue;
                }
                const stat = fs.statSync(resolvedPath);
                if (stat.isDirectory()) {
                    console.log(theme.warning(`  ${t("ask.fileWarning", { file: filePath, reason: t("ask.fileIsDir") })}`));
                    continue;
                }
                if (stat.size > 1024 * 1024) {
                    console.log(theme.warning(`  ${t("ask.fileWarning", { file: filePath, reason: t("ask.fileTooLarge") })}`));
                    continue;
                }
                const content = fs.readFileSync(resolvedPath, "utf-8");
                attachedFiles.push({ name: path.basename(resolvedPath), content });
                console.log(theme.brand(`   ${t("ask.fileAttached", { file: path.basename(resolvedPath) })}`));
            } catch {
                console.log(theme.warning(`  ${t("ask.fileWarning", { file: filePath, reason: t("ask.fileCannotRead") })}`));
            }
        }
        if (attachedFiles.length > 0) console.log();
    }

    // ─── Call AI Service ─────────────────────────────────────
    const spinner = ora({
        text: theme.brand(t("ask.thinking")),
        spinner: "dots2",
    }).start();

    let aiResult: AIResponse;

    try {
        aiResult = await translateToCommand(prompt, attachedFiles);
        spinner.stop();

        addMessage("user", prompt);
        addMessage("model", JSON.stringify(aiResult));
    } catch (error) {
        spinner.fail(theme.error(t("ask.failedToReach")));
        if (error instanceof Error) {
            console.log(theme.error(`  → ${error.message}`));
        } else {
            console.log(theme.error(`  → ${t("common.unknownError")}`));
        }
        console.log();
        process.exit(1);
    }

    // ─── Display AI Message ──────────────────────────────────
    console.log();
    console.log(theme.brand("  Nova: ") + aiResult.message);
    console.log();

    if (aiResult.type === "chat" || !aiResult.command) {
        return;
    }

    // ─── Security Validation (Tier 1–3) ─────────────────────
    const validation = validateCommand(aiResult.command);

    if (validation.level === "blocked") {
        console.log(theme.error(`  ${getRiskIcon(validation.level)} ${t("ask.blocked")}`));
        console.log(theme.error(`  ${t("ask.blockedReason", { reason: validation.reason ?? "" })}`));
        console.log(theme.dim(`  ${t("ask.blockedSafety")}`));
        console.log();
        process.exit(1);
    }

    // ─── Policy Validation (Tier 4: project rules) ───────────
    const policyFilePath = findPolicyFile();
    let policyRules: import("../services/policy.js").PolicyRule[] = [];
    if (policyFilePath) {
        const policyFile = readPolicy(policyFilePath);
        if (policyFile === null) {
            console.log(theme.error(`  [POLICY] ${t("policy.parseError", { path: policyFilePath })}`));
            console.log(theme.dim(`  ${t("policy.parseErrorHint")}`));
            console.log();
            process.exit(1);
        }
        policyRules = policyFile.rules;
    }

    // Policy DENY: block the command (cannot be bypassed by user)
    const denyMatch = matchPolicy(aiResult.command, policyRules.filter((r) => r.type === "deny"));
    if (denyMatch.matched) {
        const reason = denyMatch.rule.reason ?? denyMatch.rule.pattern;
        console.log(theme.error(`  [POLICY] ${t("policy.deniedTitle")}`));
        console.log(theme.error(`  ${t("policy.deniedReason", { reason })}`));
        console.log(theme.dim(`  ${t("policy.deniedHint")}`));
        console.log();
        process.exit(1);
    }

    // Policy ALLOW: suppress warning for explicitly permitted commands
    // (hard-blocked commands from Tier 1-2 are already exited above)
    let effectiveLevel = validation.level;
    if (validation.level === "warning") {
        const allowMatch = matchPolicy(aiResult.command, policyRules.filter((r) => r.type === "allow"));
        if (allowMatch.matched) {
            const reason = allowMatch.rule.reason ?? allowMatch.rule.pattern;
            console.log(theme.success(`  ${t("policy.allowedOverride", { reason })}`));
            console.log();
            effectiveLevel = "safe";
        }
    }

    if (effectiveLevel === "warning") {
        console.log(theme.warning(`  ${getRiskIcon(validation.level)} ${validation.reason ?? ""}`));
        console.log();
    }

    const riskBadge =
        effectiveLevel === "safe"
            ? theme.success(` ${getRiskIcon("safe")} SAFE `)
            : theme.warning(` ${getRiskIcon("warning")} CAUTION `);

    // ─── Display Command ─────────────────────────────────────
    console.log(theme.dim("  ┌─────────────────────────────────────────┐"));
    console.log(
        theme.dim("  │ ") +
        theme.warning("$ ") +
        theme.brand(aiResult.command) +
        "  " +
        riskBadge
    );
    console.log(theme.dim("  └─────────────────────────────────────────┘"));
    console.log();

    // ─── Ask Confirmation ────────────────────────────────────
    try {
        const confirmMessage =
            effectiveLevel === "warning"
                ? theme.warning(t("ask.confirmWarning"))
                : theme.success(t("ask.confirmSafe"));

        const shouldExecute = await confirm({ message: confirmMessage, default: true });

        if (!shouldExecute) {
            console.log(theme.dim(`\n  [FAIL] ${t("ask.cancelled")}\n`));
            appendLog(prompt, aiResult.command, "CANCELLED");
            return;
        }
    } catch {
        console.log(theme.dim(`\n  [FAIL] ${t("ask.cancelled")}\n`));
        appendLog(prompt, aiResult.command, "CANCELLED", "User interrupted");
        return;
    }

    // ─── Execute ─────────────────────────────────────────────
    console.log(theme.dim(`\n  ${t("common.processing")}\n`));

    try {
        await executeCommand(aiResult.command);

        console.log(theme.success(`\n  ${t("ask.success")}\n`));
        appendLog(prompt, aiResult.command, "SUCCESS");
    } catch (error) {
        let errorMessage = "Unknown error";
        if (error instanceof Error) {
            errorMessage = error.message;
            console.log(theme.error(`\n  [FAIL] ${t("ask.execFailed", { error: errorMessage })}\n`));
        } else {
            console.log(theme.error(`\n  [FAIL] ${t("ask.execFailed", { error: t("common.unknownError") })}\n`));
        }

        appendLog(prompt, aiResult.command, "FAILED", errorMessage);

        if (retryCount < MAX_AUTO_FIX_RETRIES) {
            const attemptsLeft = MAX_AUTO_FIX_RETRIES - retryCount;
            try {
                const shouldFix = await confirm({
                    message: theme.brand(t("ask.fixPrompt", { attemptsLeft: String(attemptsLeft) })),
                    default: true,
                });

                if (shouldFix) {
                    const fixPrompt = `The command I executed "${aiResult.command}" resulted in this error:\n${errorMessage}\nGenerate a new command that fixes this error and explain it.`;
                    await askCommand(fixPrompt, contextFiles, retryCount + 1);
                    return;
                } else {
                    console.log(theme.dim(`\n  [FAIL] ${t("ask.fixCancelled")}\n`));
                }
            } catch {
                console.log(theme.dim(`\n  [FAIL] ${t("ask.exited")}\n`));
            }
        } else {
            console.log(theme.warning(`\n  [WARN] ${t("ask.fixLimitReached")}\n`));
        }

        process.exit(1);
    }
}
