/**
 * Update Command
 *
 * Self-updates the Nova CLI by pulling the latest code from the Git repository,
 * installing dependencies, and rebuilding the TypeScript source.
 */

import { executeCommand } from "../utils/executor.js";
import { theme } from "../utils/theme.js";
import { t } from "../utils/i18n.js";
import ora from "ora";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");

export async function updateCommand(force: boolean = false): Promise<void> {
    console.log();
    console.log(theme.brand(`  ${t("update.title")}`));
    console.log(theme.dim(`  ${t("update.targetDir", { dir: rootDir })}\n`));

    if (!fs.existsSync(path.join(rootDir, ".git"))) {
        console.log(theme.error(`  [FAIL] ${t("update.notGitRepo")}`));
        console.log(theme.dim(`  ${t("update.notGitHint")}`));
        console.log();
        process.exit(1);
    }

    const spinner = ora({
        text: theme.dim(t("update.checkingGitHub")),
        color: "cyan",
    }).start();

    try {
        // ─── 1. Git Pull ─────────────────────────────────────
        spinner.text = theme.dim(t("update.downloading"));
        const cmdSep = process.platform === "win32" ? ";" : "&&";

        const pullResult = await executeCommand(`cd "${rootDir}" ${cmdSep} git pull`, 30000);
        const alreadyUpToDate = pullResult.stdout.includes("Already up to date.");

        if (alreadyUpToDate && !force) {
            spinner.stop();
            console.log(theme.success(`  [OK] ${t("update.alreadyUpToDate")}`));
            console.log();
            return;
        }

        if (alreadyUpToDate && force) {
            spinner.succeed(theme.success(t("update.alreadyForce")));
        } else {
            spinner.succeed(theme.success(t("update.downloadSuccess")));
        }

        // ─── 2. NPM Install ──────────────────────────────────
        const depSpinner = ora({
            text: theme.dim(t("update.installing")),
            color: "cyan",
        }).start();

        await executeCommand(`cd "${rootDir}" ${cmdSep} npm install`, 60000);
        depSpinner.succeed(theme.success(t("update.installSuccess")));

        // ─── 3. TSC Build ────────────────────────────────────
        const buildSpinner = ora({
            text: theme.dim(t("update.building")),
            color: "cyan",
        }).start();

        await executeCommand(`cd "${rootDir}" ${cmdSep} npm run build`, 60000);
        buildSpinner.succeed(theme.success(t("update.buildSuccess")));

        // ─── Done ─────────────────────────────────────────────
        console.log();
        console.log(theme.success(`  [OK] ${t("update.success")}`));
        console.log(theme.dim(`  ${t("update.successHint")}`));
        console.log();
    } catch (error) {
        spinner.stop();
        console.log(theme.error(`\n  [FAIL] ${t("update.error")}\n`));

        if (error instanceof Error) {
            console.log(theme.dim(`  ${t("update.detail", { detail: error.message })}`));
        }

        console.log(theme.dim(`\n  ${t("update.manual")}`));
        console.log(theme.dim(`  cd "${rootDir}"`));
        console.log(theme.dim("  git pull"));
        console.log(theme.dim("  npm install"));
        console.log(theme.dim("  npm run build"));
        console.log();

        process.exit(1);
    }
}
