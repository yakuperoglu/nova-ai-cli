/**
 * Update Command
 *
 * Self-updates the Nova CLI by pulling the latest code from the Git repository,
 * installing dependencies, and rebuilding the TypeScript source.
 *
 * Options:
 *   -f / --force     Force full reinstall + build even if already up to date
 *   --dry-run        Show what would happen without making any changes
 */

import { exec } from "node:child_process";
import { theme } from "../utils/theme.js";
import { t } from "../utils/i18n.js";
import ora from "ora";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");

const SAFE_BRANCHES = ["main", "master"];

interface ExecResult { stdout: string; stderr: string; }

/**
 * Runs a command with cwd set to rootDir so there is no dependency on `cd`
 * chaining. Each call is independent; a failure rejects cleanly.
 */
function runInRoot(command: string, timeoutMs = 30_000): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
        exec(
            command,
            {
                cwd: rootDir,
                timeout: timeoutMs,
                maxBuffer: 1024 * 1024 * 10,
                shell: process.platform === "win32" ? "powershell.exe" : "/bin/bash",
            },
            (error, stdout, stderr) => {
                if (error) {
                    reject(
                        new Error(
                            error.killed
                                ? `Command timed out after ${timeoutMs / 1000}s: ${command}`
                                : `Command failed (exit ${error.code ?? "?"}): ${stderr || error.message}`
                        )
                    );
                    return;
                }
                resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
            }
        );
    });
}

async function getCurrentBranch(): Promise<string | null> {
    try {
        const result = await runInRoot("git rev-parse --abbrev-ref HEAD", 10000);
        return result.stdout.trim();
    } catch {
        return null;
    }
}

async function getRemoteUrl(): Promise<string | null> {
    try {
        const result = await runInRoot("git remote get-url origin", 10000);
        return result.stdout.trim();
    } catch {
        return null;
    }
}

/** Returns true when there are uncommitted changes or untracked files. */
async function hasUncommittedChanges(): Promise<boolean> {
    try {
        const result = await runInRoot("git status --porcelain", 10000);
        return result.stdout.trim().length > 0;
    } catch {
        return false;
    }
}

/**
 * Checks whether the local branch is behind the remote using
 * `git rev-list --count HEAD..@{u}` — locale-independent.
 * Returns the number of commits the local branch is behind (0 = up to date).
 */
async function getCommitsBehind(): Promise<number | null> {
    try {
        await runInRoot("git fetch --quiet", 15000);
        const result = await runInRoot("git rev-list --count HEAD..@{u}", 10000);
        const n = parseInt(result.stdout.trim(), 10);
        return isNaN(n) ? null : n;
    } catch {
        return null;
    }
}

export async function updateCommand(force: boolean = false, dryRun: boolean = false): Promise<void> {
    console.log();
    console.log(theme.brand(`  ${t("update.title")}`));
    console.log(theme.dim(`  ${t("update.targetDir", { dir: rootDir })}`));

    if (dryRun) {
        console.log(theme.dim(`  [DRY-RUN] No changes will be made.\n`));
    } else {
        console.log();
    }

    // ── Pre-flight: must be a git repo ────────────────────────────────────────
    if (!fs.existsSync(path.join(rootDir, ".git"))) {
        console.log(theme.error(`  [FAIL] ${t("update.notGitRepo")}`));
        console.log(theme.dim(`  ${t("update.notGitHint")}`));
        console.log();
        process.exit(1);
    }

    // ── Pre-flight: branch safety check ──────────────────────────────────────
    const branch = await getCurrentBranch();
    if (branch && !SAFE_BRANCHES.includes(branch)) {
        console.log(
            theme.error(
                `  [WARN] You are on branch "${branch}", not on main/master.`
            )
        );
        console.log(
            theme.dim(
                `  Running "git pull" here may bring unexpected changes.`
            )
        );
        console.log(
            theme.dim(
                `  Switch to "main" first: git checkout main`
            )
        );
        console.log();
        // Non-fatal — warn and continue so CI / forks still work.
    }

    // ── Pre-flight: show remote URL so user can verify ───────────────────────
    const remoteUrl = await getRemoteUrl();
    if (remoteUrl) {
        console.log(theme.dim(`  Remote: ${remoteUrl}`));
        console.log();
    }

    // ── Pre-flight: dirty worktree check ─────────────────────────────────────
    const dirty = await hasUncommittedChanges();
    if (dirty) {
        if (dryRun) {
            console.log(theme.warning(`  [WARN] ${t("update.dirtyWorktree")}`));
            console.log(theme.dim(`  ${t("update.dirtyWorktreeHint")}`));
            console.log();
        } else {
            console.log(theme.error(`  [FAIL] ${t("update.dirtyWorktree")}`));
            console.log(theme.dim(`  ${t("update.dirtyWorktreeHint")}`));
            console.log();
            process.exit(1);
        }
    }

    if (dryRun) {
        console.log(theme.dim("  Steps that would be executed:"));
        console.log(theme.dim(`    1. git fetch + git merge --ff-only  (in ${rootDir})`));
        console.log(theme.dim(`    2. npm install`));
        console.log(theme.dim(`    3. npm run build`));
        console.log();
        return;
    }

    const spinner = ora({
        text: theme.dim(t("update.checkingGitHub")),
        color: "cyan",
    }).start();

    try {
        // ─── 1. Check if up to date (locale-independent) ─────────────────────
        spinner.text = theme.dim(t("update.checkingGitHub"));
        const commitsBehind = await getCommitsBehind();
        const alreadyUpToDate = commitsBehind === 0;

        if (alreadyUpToDate && !force) {
            spinner.stop();
            console.log(theme.success(`  [OK] ${t("update.alreadyUpToDate")}`));
            console.log();
            return;
        }

        // ─── 2. Git merge --ff-only ───────────────────────────────────────────
        spinner.text = theme.dim(t("update.downloading"));

        try {
            await runInRoot("git merge --ff-only", 30000);
        } catch (mergeErr) {
            spinner.stop();
            console.log(theme.error(`\n  [FAIL] ${t("update.ffOnlyFailed")}`));
            console.log(theme.dim(`  ${t("update.ffOnlyHint")}`));
            console.log();
            process.exit(1);
        }

        if (alreadyUpToDate && force) {
            spinner.succeed(theme.success(t("update.alreadyForce")));
        } else {
            spinner.succeed(theme.success(t("update.downloadSuccess")));
        }

        // ─── 2. NPM Install ──────────────────────────────────────────────────
        const depSpinner = ora({
            text: theme.dim(t("update.installing")),
            color: "cyan",
        }).start();

        await runInRoot("npm install", 60000);
        depSpinner.succeed(theme.success(t("update.installSuccess")));

        // ─── 3. TSC Build ────────────────────────────────────────────────────
        const buildSpinner = ora({
            text: theme.dim(t("update.building")),
            color: "cyan",
        }).start();

        await runInRoot("npm run build", 60000);
        buildSpinner.succeed(theme.success(t("update.buildSuccess")));

        // ─── Done ─────────────────────────────────────────────────────────────
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
        console.log(theme.dim(`  cd "${rootDir}" && git pull && npm install && npm run build`));
        console.log();

        process.exit(1);
    }
}
