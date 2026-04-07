/**
 * Provider Command — aktif AI sağlayıcısını seçme / görüntüleme
 */

import { setProvider, getProvider, DEFAULT_MODELS, type AIProvider } from "../services/config.js";
import { theme } from "../utils/theme.js";

const PROVIDERS: AIProvider[] = ["gemini", "openai", "anthropic"];

function isProvider(s: string): s is AIProvider {
    return PROVIDERS.includes(s as AIProvider);
}

export function providerSetCommand(name: string): void {
    const clean = name.trim().toLowerCase();
    if (!isProvider(clean)) {
        console.log(
            theme.error(
                `[FAIL] Geçersiz sağlayıcı. Şunlardan biri: ${PROVIDERS.join(", ")}`
            )
        );
        return;
    }

    setProvider(clean);

    console.log();
    console.log(
        theme.success("  [OK] Aktif sağlayıcı: ") + theme.brand(clean)
    );
    console.log(
        theme.dim(
            `  Önerilen model: ${DEFAULT_MODELS[clean]} — 'nova model status' ile kontrol edin.`
        )
    );
    console.log(theme.dim(`  API anahtarı: 'nova auth' veya 'nova auth set --provider ${clean} <anahtar>'`));
    console.log();
}

export function providerStatusCommand(): void {
    const p = getProvider();
    console.log();
    console.log(theme.brand("  Aktif sağlayıcı: ") + theme.brand(p));
    console.log(theme.dim(`  Varsayılan model (bu sağlayıcı için): ${DEFAULT_MODELS[p]}`));
    console.log(theme.dim("  Değiştirmek için: nova provider set <gemini|openai|anthropic>"));
    console.log();
}
