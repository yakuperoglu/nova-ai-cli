/**
 * Provider Command — select or view the active AI provider
 * and manage the OpenAI-compatible base URL.
 */

import {
    setProvider,
    getProvider,
    getOpenAIBaseURL,
    setOpenAIBaseURL,
    DEFAULT_MODELS,
    OPENAI_COMPATIBLE_PRESETS,
    type AIProvider,
} from "../services/config.js";
import { theme } from "../utils/theme.js";
import { t } from "../utils/i18n.js";

const PROVIDERS: AIProvider[] = ["gemini", "openai", "anthropic"];

function isProvider(s: string): s is AIProvider {
    return PROVIDERS.includes(s as AIProvider);
}

export interface ProviderSetOptions {
    baseUrl?: string;
    preset?: string;
}

export function providerSetCommand(name: string, opts: ProviderSetOptions = {}): void {
    const clean = name.trim().toLowerCase();
    if (!isProvider(clean)) {
        console.log(
            theme.error(
                `[FAIL] ${t("provider.invalid", { providers: PROVIDERS.join(", ") })}`
            )
        );
        console.log(
            theme.dim(
                `  ${t("provider.presetsHint", { presets: Object.keys(OPENAI_COMPATIBLE_PRESETS).join(", ") })}`
            )
        );
        return;
    }

    setProvider(clean);

    if (clean === "openai") {
        if (opts.preset) {
            const presetKey = opts.preset.trim().toLowerCase();
            const preset = OPENAI_COMPATIBLE_PRESETS[presetKey];
            if (!preset) {
                console.log(
                    theme.error(
                        `[FAIL] ${t("provider.invalidPreset", {
                            preset: presetKey,
                            presets: Object.keys(OPENAI_COMPATIBLE_PRESETS).join(", "),
                        })}`
                    )
                );
                return;
            }
            setOpenAIBaseURL(preset.baseURL);

            console.log();
            console.log(theme.success(`  [OK] ${t("provider.setSuccess", { provider: clean })}`));
            console.log(theme.dim(`  ${t("provider.preset", { preset: presetKey })}`));
            console.log(theme.dim(`  ${t("provider.baseURL", { url: preset.baseURL })}`));
            console.log(theme.dim(`  ${t("provider.recommendedModel", { model: preset.defaultModel })}`));
            console.log(theme.dim(`  ${t("provider.modelCmd", { model: preset.defaultModel })}`));
            console.log(theme.dim(`  ${t("provider.authHint", { provider: clean })}`));
            console.log();
            return;
        }

        if (opts.baseUrl) {
            setOpenAIBaseURL(opts.baseUrl);
        } else {
            setOpenAIBaseURL(undefined);
        }
    }

    console.log();
    console.log(theme.success(`  [OK] ${t("provider.setSuccess", { provider: clean })}`));
    console.log(theme.dim(`  ${t("provider.recommendedModel", { model: DEFAULT_MODELS[clean] })}`));
    if (clean === "openai") {
        const activeBase = getOpenAIBaseURL();
        console.log(theme.dim(`  ${t("provider.baseURL", { url: activeBase })}`));
        console.log(
            theme.dim(
                `  ${t("provider.presetCmd", { presets: Object.keys(OPENAI_COMPATIBLE_PRESETS).join("|") })}`
            )
        );
    }
    console.log(theme.dim(`  ${t("provider.authHint", { provider: clean })}`));
    console.log();
}

export function providerStatusCommand(): void {
    const p = getProvider();
    const baseURL = p === "openai" ? getOpenAIBaseURL() : null;

    console.log();
    console.log(theme.brand(`  ${t("provider.activeProvider", { provider: p })}`));
    console.log(theme.dim(`  ${t("provider.defaultModel", { model: DEFAULT_MODELS[p] })}`));
    if (baseURL) {
        console.log(theme.dim(`  ${t("provider.openaiBaseURL", { url: baseURL })}`));
    }
    console.log(theme.dim(`  ${t("provider.changeCmd")}`));
    if (p === "openai") {
        console.log(
            theme.dim(
                `  ${t("provider.presetCmd", { presets: Object.keys(OPENAI_COMPATIBLE_PRESETS).join("|") })}`
            )
        );
        console.log(theme.dim(`  ${t("provider.customURLCmd")}`));
    }
    console.log();
}

export function providerListPresetsCommand(): void {
    console.log();
    console.log(theme.brand(`  ${t("provider.presetsTitle")}`));
    console.log(theme.dim(`  ${t("provider.presetsUsage")}`));
    console.log();
    for (const [key, val] of Object.entries(OPENAI_COMPATIBLE_PRESETS)) {
        console.log(
            `  ${theme.brand(key.padEnd(12))} ${theme.dim(val.baseURL)}  model: ${val.defaultModel}`
        );
    }
    console.log();
}
