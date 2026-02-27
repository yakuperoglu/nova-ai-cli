/**
 * Update Command
 *
 * Self-updates the localized Nova CLI by pulling the latest code from the Git repository,
 * installing dependencies, and rebuilding the TypeScript source.
 */

import { executeCommand } from "../utils/executor.js";
import { theme } from "../utils/theme.js";
import ora from "ora";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Get the root directory of the CLI project
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// __dirname is dist/commands/ -> root is ../../
const rootDir = path.resolve(__dirname, "../../");

export async function updateCommand(force: boolean = false): Promise<void> {
    console.log();
    console.log(theme.brand("  🔄 Nova CLI Auto-Update"));
    console.log(theme.dim(`  Target directory: ${rootDir}\n`));

    // Ensure it's a git repository
    if (!fs.existsSync(path.join(rootDir, ".git"))) {
        console.log(theme.error("  [FAIL] Nova CLI is not running from a Git repository."));
        console.log(theme.dim("  Only versions installed via 'git clone' can be self-updated."));
        console.log();
        process.exit(1);
    }

    const spinner = ora({
        text: theme.dim("Checking for updates on GitHub..."),
        color: "cyan",
    }).start();

    try {
        // ─── 1. Git Pull ───────────────────────────────────────────
        spinner.text = theme.dim("Downloading source code (git pull)...");
        // Windows uses ; for sequential commands
        const cmdSeparator = process.platform === "win32" ? ";" : "&&";

        const pullResult = await executeCommand(`cd "${rootDir}" ${cmdSeparator} git pull`, 30000); // 30s timeout

        const isAlreadyUpToDate = pullResult.stdout.includes("Already up to date.");

        if (isAlreadyUpToDate && !force) {
            spinner.stop();
            console.log(theme.success("  [OK] Nova is already up to date!"));
            console.log();
            return;
        }

        if (isAlreadyUpToDate && force) {
            spinner.succeed(theme.success("Already up to date, but rebuilding due to force (-f)."));
        } else {
            spinner.succeed(theme.success("New source code downloaded successfully."));
        }

        // ─── 2. NPM Install ────────────────────────────────────────
        const depSpinner = ora({
            text: theme.dim("Updating dependencies (npm install)..."),
            color: "cyan",
        }).start();

        await executeCommand(`cd "${rootDir}" ${cmdSeparator} npm install`, 60000); // 60s timeout
        depSpinner.succeed(theme.success("Package dependencies updated."));

        // ─── 3. TSC Build ──────────────────────────────────────────
        const buildSpinner = ora({
            text: theme.dim("Rebuilding Nova CLI (npm run build)..."),
            color: "cyan",
        }).start();

        await executeCommand(`cd "${rootDir}" ${cmdSeparator} npm run build`, 60000); // 60s timeout
        buildSpinner.succeed(theme.success("Build complete."));

        // ─── Finish ───────────────────────────────────────────────
        console.log();
        console.log(theme.success("  [OK] Nova CLI updated successfully!"));
        console.log(theme.dim("  You can start using the new features."));
        console.log();

    } catch (error) {
        spinner.stop();
        console.log(theme.error("\n  [FAIL] An error occurred during update.\n"));

        if (error instanceof Error) {
            console.log(theme.dim(`  Detail: ${error.message}`));
        }

        console.log(theme.dim("\n  Try entering these commands manually:"));
        console.log(theme.dim(`  cd "${rootDir}"`));
        console.log(theme.dim("  git pull"));
        console.log(theme.dim("  npm install"));
        console.log(theme.dim("  npm run build"));
        console.log();

        process.exit(1);
    }
}
