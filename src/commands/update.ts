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
    console.log(theme.brand("  🔄 Nova CLI Otomatik Güncelleme"));
    console.log(theme.dim(`  Hedef dizin: ${rootDir}\n`));

    // Ensure it's a git repository
    if (!fs.existsSync(path.join(rootDir, ".git"))) {
        console.log(theme.error("  [FAIL] Nova CLI bir Git reposu üzerinden çalışmıyor."));
        console.log(theme.dim("  Sadece 'git clone' ile yüklenmiş versiyonlar kendini güncelleyebilir."));
        console.log();
        process.exit(1);
    }

    const spinner = ora({
        text: theme.dim("GitHub üzerinden güncellemeler kontrol ediliyor..."),
        color: "cyan",
    }).start();

    try {
        // ─── 1. Git Pull ───────────────────────────────────────────
        spinner.text = theme.dim("Kaynak kodlar indiriliyor (git pull)...");
        // Windows uses ; for sequential commands
        const cmdSeparator = process.platform === "win32" ? ";" : "&&";

        const pullResult = await executeCommand(`cd "${rootDir}" ${cmdSeparator} git pull`, 30000); // 30s timeout

        const isAlreadyUpToDate = pullResult.stdout.includes("Already up to date.");

        if (isAlreadyUpToDate && !force) {
            spinner.stop();
            console.log(theme.success("  [OK] Nova şu anda en güncel sürümde!"));
            console.log();
            return;
        }

        if (isAlreadyUpToDate && force) {
            spinner.succeed(theme.success("Zaten güncel, ancak force (-f) sebebiyle yeniden derleniyor."));
        } else {
            spinner.succeed(theme.success("Yeni kaynak kodlar başarıyla indirildi."));
        }

        // ─── 2. NPM Install ────────────────────────────────────────
        const depSpinner = ora({
            text: theme.dim("Bağımlılıklar güncelleniyor (npm install)..."),
            color: "cyan",
        }).start();

        await executeCommand(`cd "${rootDir}" ${cmdSeparator} npm install`, 60000); // 60s timeout
        depSpinner.succeed(theme.success("Paket bağımlılıkları güncellendi."));

        // ─── 3. TSC Build ──────────────────────────────────────────
        const buildSpinner = ora({
            text: theme.dim("Nova CLI yeniden derleniyor (npm run build)..."),
            color: "cyan",
        }).start();

        await executeCommand(`cd "${rootDir}" ${cmdSeparator} npm run build`, 60000); // 60s timeout
        buildSpinner.succeed(theme.success("Derleme tamamlandı."));

        // ─── Finish ───────────────────────────────────────────────
        console.log();
        console.log(theme.success("  [OK] Nova CLI başarıyla güncellendi!"));
        console.log(theme.dim("  Yeni özellikleri kullanmaya başlayabilirsiniz."));
        console.log();

    } catch (error) {
        spinner.stop();
        console.log(theme.error("\n  [FAIL] Güncelleme sırasında bir hata oluştu.\n"));

        if (error instanceof Error) {
            console.log(theme.dim(`  Detay: ${error.message}`));
        }

        console.log(theme.dim("\n  Manuel olarak şu komutları girmeyi deneyin:"));
        console.log(theme.dim(`  cd "${rootDir}"`));
        console.log(theme.dim("  git pull"));
        console.log(theme.dim("  npm install"));
        console.log(theme.dim("  npm run build"));
        console.log();

        process.exit(1);
    }
}
