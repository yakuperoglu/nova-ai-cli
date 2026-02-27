/**
 * Auth Command
 *
 * Allows the user to save their API key globally via:
 *   nova auth <api-key>       (argument — visible in shell history)
 *   nova auth                 (interactive — masked input, recommended)
 *
 * The key is stored in ~/.nova/config.json with restricted permissions.
 */

import { password } from "@inquirer/prompts";
import { setApiKey, getApiKey, getConfigPath } from "../services/config.js";
import { theme } from "../utils/theme.js";

export async function authCommand(apiKey?: string): Promise<void> {
    let key = apiKey?.trim();

    // ─── Interactive Mode (no argument) ────────────────────
    if (!key) {
        console.log();
        console.log(theme.brand("  🔑 Enter your Gemini API key"));
        console.log(theme.dim("  Get a key from: https://aistudio.google.com/apikey"));
        console.log();

        try {
            key = await password({
                message: "API Key:",
                mask: "•",
            });
        } catch {
            console.log(theme.dim("\n  ✖ Aborted.\n"));
            return;
        }

        if (!key || !key.trim()) {
            console.log(theme.error("\n  ✖ No API key provided.\n"));
            process.exit(1);
        }

        key = key.trim();
    } else {
        // Warn about shell history when key is passed as argument
        console.log();
        console.log(theme.warning("  ⚠ Your API key may be saved in shell history."));
        console.log(theme.dim("  Tip: Use 'nova auth' (interactive) for safer input."));
    }

    // ─── Save Key ────────────────────────────────────────────
    try {
        setApiKey(key);

        console.log();
        console.log(theme.success("  ✔ API key saved successfully!"));
        console.log(theme.dim(`  → Stored in: ${getConfigPath()}`));
        console.log(theme.dim("  → Permissions: owner-only (600)"));
        console.log();
        console.log(theme.brand("  You're all set! Try:"));
        console.log(
            "    nova ask \"list all files in this folder\""
        );
        console.log();
    } catch (error) {
        console.log(theme.error("\n  ✖ Failed to save API key.\n"));

        if (error instanceof Error) {
            console.log(theme.error(`  → ${error.message}`));
        }

        process.exit(1);
    }
}

export async function authStatusCommand(): Promise<void> {
    const key = getApiKey();

    console.log();

    if (key) {
        const masked = key.slice(0, 6) + "•".repeat(12) + key.slice(-4);
        console.log(theme.success("  ✔ API key is configured"));
        console.log(theme.dim(`  → Key: ${masked}`));
    } else {
        console.log(theme.warning("  ⚠ No API key configured"));
        console.log(theme.dim("  Run: nova auth"));
    }

    console.log(theme.dim(`  → Config: ${getConfigPath()}`));
    console.log();
}
