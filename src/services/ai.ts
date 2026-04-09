/**
 * AI Service — Gemini, OpenAI, and Anthropic support
 *
 * Network safety:
 *  - OpenAI and Anthropic fetch calls are subject to a 25 s AbortController timeout.
 *  - Timeout / network error / 5xx conditions produce normalized user-friendly messages.
 *  - Gemini uses its SDK which includes its own retry/timeout mechanism.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import os from "node:os";
import { getApiKey, getModel, getProvider, getOpenAIBaseURL, type AIProvider } from "./config.js";
import { sanitizeAIResponse } from "../utils/security.js";
import { getHistory, type HistoryMessage } from "./history.js";
import { getMemories } from "./memory.js";
import { t, getLanguage } from "../utils/i18n.js";

export interface AIResponse {
    type: "chat" | "command";
    message: string;
    command: string;
}

export interface AttachedFile {
    name: string;
    content: string;
}

const isWindows = os.platform() === "win32";
const shellName = isWindows ? "PowerShell" : "bash/zsh";

function getResponseLanguageInstruction(): string {
    const lang = getLanguage();
    if (lang === "tr") {
        return "Always respond in Turkish (Türkçe), regardless of the language of the user's prompt.";
    }
    return "Always respond in English, regardless of the language of the user's prompt.";
}

function getSystemPrompt(): string {
    const memories = getMemories();
    let memorySection = "";

    if (memories.length > 0) {
        memorySection = `\nUser Persistent Rules:\n${memories.map(m => `- ${m}`).join("\n")}\nStrictly follow these rules when generating solutions.`;
    }

    return `You are "Nova", a friendly, highly skilled AI terminal assistant.

YOUR MISSION:
You assist the user with their operating system and terminal. You can either chat conversationally OR provide a single shell command to execute.

LANGUAGE:
${getResponseLanguageInstruction()}

RESPONSE FORMAT (JSON ONLY):
You MUST respond with a valid JSON object matching this schema:
{
  "type": "chat" | "command",
  "message": "Your conversational response or command explanation",
  "command": "The raw shell command (only if type is 'command', otherwise empty string)"
}

RULES FOR "message":
1. Keep it concise, helpful, and friendly.
2. If type is "command", briefly explain what the command will do.
3. If type is "chat" (e.g., they say "hello" or ask a general question), just reply conversationally.

RULES FOR "command" (if type is "command"):
1. Output ONLY the raw executable shell command.
2. NO markdown formatting, NO code fences, NO placeholders.
3. If ambiguous, choose the safest interpretation.
4. NEVER output destructive commands (rm -rf /, format C:, mkfs, dd). Always prefer safe alternatives.

CRITICAL OS RULES:
- The user is running on ${os.platform()} (${os.release()})
- Their shell is exactly: ${shellName}
${isWindows ? `
 WINDOWS POWERSHELL STRICT RULES:
- You MUST write 100% valid PowerShell syntax.
- DO NOT use bash idioms like '&&' or '||'. PowerShell 5.1 DOES NOT support '&&'.
- To chain multiple commands in PowerShell, use ';' instead of '&&'. (Example: cd foo ; ls)
- If conditional execution is strictly needed, use 'if ($?) { ... }' or 'if ($LASTEXITCODE -eq 0) { ... }'
` : `
- Chain multiple commands with && or semicolons.
`}
${memorySection}

ENVIRONMENT:
- Architecture: ${os.arch()}
- Home Directory: ${os.homedir()}`;
}

/** Creates an AbortController with a timeout. Returns signal and a clear() to cancel the timer. */
function makeTimeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return {
        signal: controller.signal,
        clear: () => clearTimeout(timer),
    };
}

/** Normalizes fetch error objects into user-friendly messages. */
function normalizeFetchError(err: unknown, providerName: string): Error {
    if (err instanceof Error) {
        if (err.name === "AbortError") {
            return new Error(t("ai.timeout", { provider: providerName }));
        }
        if (err.name === "TypeError" && err.message.toLowerCase().includes("fetch")) {
            return new Error(t("ai.networkError", { provider: providerName }));
        }
    }
    return err instanceof Error ? err : new Error(String(err));
}

function missingKeyMessage(provider: AIProvider): string {
    const providerURLs: Record<AIProvider, string> = {
        gemini: "https://aistudio.google.com/apikey",
        openai: "https://platform.openai.com/api-keys",
        anthropic: "https://console.anthropic.com/",
    };
    return [
        t("ai.noKey"),
        "",
        `  ${t("ai.authHint")}`,
        `    \x1b[36mnova auth\x1b[0m`,
        `    \x1b[36mnova auth set --provider ${provider} <key>\x1b[0m`,
        "",
        `  ${t("ai.getKeyFrom", { url: providerURLs[provider] })}`,
    ].join("\n");
}

function historyToChatRoles(
    history: HistoryMessage[]
): Array<{ role: "user" | "assistant"; content: string }> {
    return history.map(h => ({
        role: h.role === "model" ? "assistant" : "user",
        content: h.parts.map(p => p.text).join("\n"),
    }));
}

function parseAIResponseJson(text: string): AIResponse {
    const parsed = JSON.parse(text) as AIResponse;

    if (!parsed.type || !["chat", "command"].includes(parsed.type)) parsed.type = "chat";
    if (!parsed.message) parsed.message = "...";
    if (parsed.type === "command" && parsed.command) {
        parsed.command = sanitizeAIResponse(parsed.command);
    } else {
        parsed.command = "";
    }

    return parsed;
}

async function translateWithGemini(finalPromptText: string): Promise<AIResponse> {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error(missingKeyMessage("gemini"));
    }

    const client = new GoogleGenerativeAI(apiKey);
    const activeModel = getModel();
    const model = client.getGenerativeModel({
        model: activeModel,
        systemInstruction: getSystemPrompt(),
        generationConfig: {
            responseMimeType: "application/json",
        },
    });

    const history = getHistory();

    let result;
    try {
        result = await model.generateContent({
            contents: [
                ...history,
                { role: "user", parts: [{ text: finalPromptText }] },
            ],
        });
    } catch (err: unknown) {
        if (err instanceof Error) {
            const msg = err.message;
            if (msg.includes("429") || msg.includes("quota")) {
                throw new Error(t("ai.quota", { url: "https://ai.google.dev/pricing" }));
            } else if (
                msg.includes("401") ||
                msg.includes("403") ||
                msg.includes("API_KEY_INVALID")
            ) {
                throw new Error(t("ai.invalidKey"));
            }
        }
        throw err;
    }

    const text = result.response.text().trim();
    if (!text) throw new Error(t("ai.emptyResponse"));

    try {
        return parseAIResponseJson(text);
    } catch {
        throw new Error(t("ai.parseError", { raw: text.slice(0, 200) }));
    }
}

async function translateWithOpenAI(finalPromptText: string): Promise<AIResponse> {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error(missingKeyMessage("openai"));
    }

    const systemPrompt = getSystemPrompt();
    const history = getHistory();
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
        ...historyToChatRoles(history).map(m => ({
            role: m.role,
            content: m.content,
        })),
        { role: "user", content: finalPromptText },
    ];

    const baseURL = getOpenAIBaseURL();
    const { signal, clear } = makeTimeoutSignal(25_000);
    let res: Response;
    try {
        res = await fetch(`${baseURL}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: getModel(),
                messages,
                response_format: { type: "json_object" },
            }),
            signal,
        });
    } catch (err) {
        clear();
        throw normalizeFetchError(err, "OpenAI");
    }
    clear();

    const raw = await res.text();
    if (!res.ok) {
        if (res.status === 401 || res.status === 403) throw new Error(t("ai.openaiInvalid"));
        if (res.status === 429) throw new Error(t("ai.openaiQuota"));
        if (res.status >= 500)
            throw new Error(t("ai.serverError", { provider: "OpenAI", code: String(res.status) }));
        throw new Error(`OpenAI error (${res.status}): ${raw.slice(0, 500)}`);
    }

    let data: { choices?: Array<{ message?: { content?: string } }> };
    try {
        data = JSON.parse(raw) as typeof data;
    } catch {
        throw new Error(t("ai.openaiNotJson", { raw: raw.slice(0, 200) }));
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error(t("ai.openaiEmpty"));

    try {
        return parseAIResponseJson(text);
    } catch {
        throw new Error(t("ai.parseError", { raw: text.slice(0, 200) }));
    }
}

async function translateWithAnthropic(finalPromptText: string): Promise<AIResponse> {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error(missingKeyMessage("anthropic"));
    }

    const systemPrompt = getSystemPrompt();
    const history = getHistory();
    const messages = [
        ...historyToChatRoles(history).map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        })),
        { role: "user" as const, content: finalPromptText },
    ];

    const { signal: antSignal, clear: antClear } = makeTimeoutSignal(25_000);
    let res: Response;
    try {
        res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: getModel(),
                max_tokens: 8192,
                system: systemPrompt,
                messages,
            }),
            signal: antSignal,
        });
    } catch (err) {
        antClear();
        throw normalizeFetchError(err, "Anthropic");
    }
    antClear();

    const raw = await res.text();
    if (!res.ok) {
        if (res.status === 401 || res.status === 403) throw new Error(t("ai.anthropicInvalid"));
        if (res.status === 429) throw new Error(t("ai.anthropicQuota"));
        if (res.status >= 500)
            throw new Error(
                t("ai.serverError", { provider: "Anthropic", code: String(res.status) })
            );
        throw new Error(`Anthropic error (${res.status}): ${raw.slice(0, 500)}`);
    }

    let data: { content?: Array<{ type: string; text?: string }> };
    try {
        data = JSON.parse(raw) as typeof data;
    } catch {
        throw new Error(t("ai.anthropicNotJson", { raw: raw.slice(0, 200) }));
    }

    const textBlock = data.content?.find(c => c.type === "text");
    const text = textBlock?.text?.trim();
    if (!text) throw new Error(t("ai.anthropicEmpty"));

    try {
        return parseAIResponseJson(text);
    } catch {
        throw new Error(t("ai.parseError", { raw: text.slice(0, 200) }));
    }
}

export async function translateToCommand(
    userPrompt: string,
    attachedFiles: AttachedFile[] = []
): Promise<AIResponse> {
    let finalPromptText = userPrompt;

    if (attachedFiles.length > 0) {
        finalPromptText += "\n\n--- ATTACHED FILE CONTEXTS ---\n";
        for (const file of attachedFiles) {
            finalPromptText += `\nFile: ${file.name}\n\`\`\`\n${file.content}\n\`\`\`\n`;
        }
        finalPromptText += "\nConsider the above file contents when processing the request.\n";
    }

    const provider = getProvider();

    switch (provider) {
        case "openai":
            return translateWithOpenAI(finalPromptText);
        case "anthropic":
            return translateWithAnthropic(finalPromptText);
        case "gemini":
        default:
            return translateWithGemini(finalPromptText);
    }
}
