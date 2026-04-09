/**
 * Auth Command
 *
 * Allows the user to save their API key globally via:
 *   nova auth <api-key>       (argument — visible in shell history)
 *   nova auth                 (interactive — masked input, recommended)
 *
 * The key is stored in ~/.nova/config.json with restricted permissions.
 * Per-provider key: nova auth set --provider openai <key>
 */

import { password } from "@inquirer/prompts";
import {
    setApiKey,
    setProvider,
    getApiKey,
    getConfigPath,
    getProvider,
    getConfig,
    type AIProvider,
} from "../services/config.js";
import { theme } from "../utils/theme.js";
import { inferProviderFromApiKey } from "../utils/inferProviderFromApiKey.js";
import { t } from "../utils/i18n.js";

const PROVIDERS: AIProvider[] = ["gemini", "openai", "anthropic"];

function parseProvider(s: string | undefined): AIProvider | undefined {
    if (!s) return undefined;
    const p = s.trim().toLowerCase() as AIProvider;
    return PROVIDERS.includes(p) ? p : undefined;
}

function providerKeyURL(p: AIProvider): string {
    if (p === "gemini") return "https://aistudio.google.com/apikey";
    if (p === "openai") return "https://platform.openai.com/api-keys";
    return "https://console.anthropic.com/";
}

function maskKey(key: string): string {
    if (key.length <= 10) return "•".repeat(8);
    return key.slice(0, 6) + "•".repeat(12) + key.slice(-4);
}

export interface AuthCommandOptions {
    provider?: string;
}

export async function authCommand(apiKey?: string, opts?: AuthCommandOptions): Promise<void> {
    let key = apiKey?.trim();
    const explicitProvider = parseProvider(opts?.provider);

    if (opts?.provider && !explicitProvider) {
        console.log(
            theme.error(
                `\n  [FAIL] ${t("auth.invalidProvider", { providers: PROVIDERS.join(", ") })}\n`
            )
        );
        process.exit(1);
    }

    // ─── Interactive Mode ────────────────────────────────────
    if (!key) {
        console.log();
        if (explicitProvider) {
            console.log(theme.brand(`  ${t("auth.enterKey")} (${t("auth.providerLabel", { provider: explicitProvider })})`));
            console.log(theme.dim(`  Get your key: ${providerKeyURL(explicitProvider)}`));
        } else {
            console.log(theme.brand(`  ${t("auth.enterKey")}`));
            console.log(theme.dim(`  ${t("auth.keyHint")}`));
            console.log(theme.dim(`  ${t("auth.forceProviderTip")}`));
        }
        console.log();

        try {
            key = await password({ message: "API Key:", mask: "•" });
        } catch {
            console.log(theme.dim(`\n  [FAIL] ${t("common.abort")}\n`));
            return;
        }

        if (!key || !key.trim()) {
            console.log(theme.error(`\n  [FAIL] ${t("auth.noKeyProvided")}\n`));
            process.exit(1);
        }

        key = key.trim();
    } else {
        console.log();
        console.log(theme.warning(`  [WARN] ${t("auth.shellHistoryWarn")}`));
        console.log(theme.dim(`  ${t("auth.shellHistoryTip")}`));
    }

    // ─── Resolve provider ────────────────────────────────────
    const resolvedProvider = explicitProvider ?? inferProviderFromApiKey(key);
    const previousProvider = getProvider();

    // ─── Save ────────────────────────────────────────────────
    try {
        if (!explicitProvider) {
            setProvider(resolvedProvider);
        }
        setApiKey(key, resolvedProvider);

        console.log();
        console.log(theme.success(`  [OK] ${t("auth.saveSuccess")}`));
        console.log(theme.dim(`  → ${t("auth.providerLabel", { provider: resolvedProvider })}`));
        if (!explicitProvider) {
            console.log(theme.dim(`  → ${t("auth.inferredHint")}`));
        }
        console.log(theme.dim(`  → ${t("auth.storedIn", { path: getConfigPath() })}`));
        console.log(theme.dim(`  → ${t("auth.permissions")}`));
        console.log();

        if (explicitProvider && explicitProvider !== previousProvider) {
            console.log(
                theme.dim(`  → ${t("auth.switchHint", { provider: explicitProvider })}`)
            );
            console.log();
        }

        console.log(theme.brand(`  ${t("auth.allSet")}`));
        console.log('    nova ask "list all files in this folder"');
        console.log();
    } catch (error) {
        console.log(theme.error(`\n  [FAIL] ${t("auth.saveFailed")}\n`));
        if (error instanceof Error) {
            console.log(theme.error(`  → ${error.message}`));
        }
        process.exit(1);
    }
}

export async function authStatusCommand(): Promise<void> {
    const config = getConfig();
    const active = getProvider();
    const key = getApiKey();

    console.log();
    console.log(theme.brand(`  ${t("auth.activeProvider", { provider: active })}`));

    if (key) {
        console.log(theme.success(`  [OK] ${t("auth.keyConfigured")}`));
        console.log(theme.dim(`  → ${t("auth.keyMasked", { key: maskKey(key) })}`));
    } else {
        console.log(theme.warning(`  [WARN] ${t("auth.noKeyConfigured", { provider: active })}`));
    }

    const extras = config.providerApiKeys
        ? (PROVIDERS.filter(p => p !== active && config.providerApiKeys?.[p]) as AIProvider[])
        : [];
    if (extras.length > 0) {
        console.log(theme.dim(`  ${t("auth.otherProviders", { providers: extras.join(", ") })}`));
    }

    console.log(theme.dim(`  → ${t("auth.configPath", { path: getConfigPath() })}`));
    console.log();
}
