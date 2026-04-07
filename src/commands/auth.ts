/**
 * Auth Command
 *
 * Allows the user to save their API key globally via:
 *   nova auth <api-key>       (argument — visible in shell history)
 *   nova auth                 (interactive — masked input, recommended)
 *
 * The key is stored in ~/.nova/config.json with restricted permissions.
 * Sağlayıcı başına anahtar: nova auth set --provider openai <key>
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

const PROVIDERS: AIProvider[] = ["gemini", "openai", "anthropic"];

function parseProvider(s: string | undefined): AIProvider | undefined {
    if (!s) return undefined;
    const p = s.trim().toLowerCase() as AIProvider;
    return PROVIDERS.includes(p) ? p : undefined;
}

function providerHint(p: AIProvider): string {
    if (p === "gemini") return "https://aistudio.google.com/apikey";
    if (p === "openai") return "https://platform.openai.com/api-keys";
    return "https://console.anthropic.com/";
}

function maskKey(key: string): string {
    if (key.length <= 10) return "•".repeat(8);
    return key.slice(0, 6) + "•".repeat(12) + key.slice(-4);
}

export interface AuthCommandOptions {
    /** Commander'dan gelen --provider */
    provider?: string;
}

export async function authCommand(apiKey?: string, opts?: AuthCommandOptions): Promise<void> {
    let key = apiKey?.trim();
    const explicitProvider = parseProvider(opts?.provider);

    if (opts?.provider && !explicitProvider) {
        console.log(
            theme.error(
                `\n  [FAIL] Geçersiz sağlayıcı. Geçerli değerler: ${PROVIDERS.join(", ")}\n`
            )
        );
        process.exit(1);
    }

    // ─── Interactive Mode (no argument) ────────────────────
    if (!key) {
        console.log();
        if (explicitProvider) {
            console.log(theme.brand(`  API anahtarı girin (hedef sağlayıcı: ${explicitProvider})`));
            console.log(theme.dim(`  Anahtar al: ${providerHint(explicitProvider)}`));
        } else {
            console.log(theme.brand("  API anahtarını girin"));
            console.log(
                theme.dim(
                    "  --provider vermezseniz sağlayıcı anahtar biçiminden tahmin edilir: " +
                        "sk-ant… → Anthropic, sk-… → OpenAI, diğerleri → Gemini"
                )
            );
            console.log(
                theme.dim(
                    "  Zorunlu seçim için: nova auth set --provider <gemini|openai|anthropic> <anahtar>"
                )
            );
        }
        console.log();

        try {
            key = await password({
                message: "API Key:",
                mask: "•",
            });
        } catch {
            console.log(theme.dim("\n  [FAIL] Aborted.\n"));
            return;
        }

        if (!key || !key.trim()) {
            console.log(theme.error("\n  [FAIL] No API key provided.\n"));
            process.exit(1);
        }

        key = key.trim();
    } else {
        console.log();
        console.log(theme.warning("  [WARN] Your API key may be saved in shell history."));
        console.log(theme.dim("  Tip: Use 'nova auth' (interactive) for safer input."));
    }

    // ─── Save Key ────────────────────────────────────────────
    const resolvedProvider = explicitProvider ?? inferProviderFromApiKey(key);
    const previousProvider = getProvider();

    try {
        if (!explicitProvider) {
            setProvider(resolvedProvider);
        }
        setApiKey(key, resolvedProvider);

        console.log();
        console.log(theme.success("  [OK] API key saved successfully!"));
        console.log(theme.dim(`  → Sağlayıcı: ${resolvedProvider}`));
        if (!explicitProvider) {
            console.log(
                theme.dim(
                    "  → Tahmin anahtar biçimine dayanıyor; yanlışsa: nova auth set --provider <ad> <anahtar>"
                )
            );
        }
        console.log(theme.dim(`  → Stored in: ${getConfigPath()}`));
        console.log(theme.dim("  → Permissions: owner-only (600)"));
        console.log();
        if (explicitProvider && explicitProvider !== previousProvider) {
            console.log(
                theme.dim(
                    `  → Anahtar '${explicitProvider}' için kayıtlı; aktif sağlayıcı: '${previousProvider}'. Geçiş: nova provider set ${explicitProvider}`
                )
            );
            console.log();
        }
        console.log(theme.brand("  You're all set! Try:"));
        console.log('    nova ask "list all files in this folder"');
        console.log();
    } catch (error) {
        console.log(theme.error("\n  [FAIL] Failed to save API key.\n"));

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

    console.log(theme.brand(`  Aktif sağlayıcı: ${active}`));

    if (key) {
        console.log(theme.success("  [OK] Bu sağlayıcı için API anahtarı tanımlı"));
        console.log(theme.dim(`  → Key: ${maskKey(key)}`));
    } else {
        console.log(theme.warning("  [WARN] Aktif sağlayıcı için anahtar yok"));
        console.log(theme.dim("  Çalıştırın: nova auth   veya   nova auth set --provider " + active + " <anahtar>"));
    }

    const extras = config.providerApiKeys
        ? (PROVIDERS.filter(p => p !== active && config.providerApiKeys?.[p]) as AIProvider[])
        : [];
    if (extras.length > 0) {
        console.log(theme.dim(`  Kayıtlı diğer sağlayıcı anahtarları: ${extras.join(", ")}`));
    }

    console.log(theme.dim(`  → Config: ${getConfigPath()}`));
    console.log();
}
