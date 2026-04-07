/**
 * AI Service — Gemini, OpenAI ve Anthropic desteği
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import os from "node:os";
import { getApiKey, getModel, getProvider, type AIProvider } from "./config.js";
import { sanitizeAIResponse } from "../utils/security.js";
import { getHistory, type HistoryMessage } from "./history.js";
import { getMemories } from "./memory.js";

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

function getSystemPrompt(): string {
    const memories = getMemories();
    let memorySection = "";

    if (memories.length > 0) {
        memorySection = `\nKullanıcı Hakkında Kalıcı Bilgiler:\n${memories.map(m => `- ${m}`).join("\n")}\nÇözümlerini üretirken bu kurallara kesinlikle uy.`;
    }

    return `You are "Nova", a friendly, highly skilled AI terminal assistant.

YOUR MISSION:
You assist the user with their operating system and terminal. You can either chat conversationally OR provide a single shell command to execute.

RESPONSE FORMAT (JSON ONLY):
You MUST respond with a valid JSON object matching this schema:
{
  "type": "chat" | "command",
  "message": "Your conversational response or command explanation",
  "command": "The raw shell command (only if type is 'command', otherwise empty string)"
}

RULES FOR "message":
1. Match the language of the user's prompt (e.g., reply in Turkish if they ask in Turkish).
2. Keep it concise, helpful, and friendly.
3. If type is "command", briefly explain what the command will do.
4. If type is "chat" (e.g., they say "hello" or ask a general question), just reply conversationally.

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

function missingKeyMessage(provider: AIProvider): string {
    const lines = [
        "API anahtarı yapılandırılmamış.",
        "",
        "  Kimlik doğrulama:",
        "    \x1b[36mnova auth\x1b[0m",
        "    \x1b[36mnova auth set --provider " + provider + " <anahtar>\x1b[0m",
        "",
    ];
    if (provider === "gemini") {
        lines.push("  Gemini anahtarı: https://aistudio.google.com/apikey");
    } else if (provider === "openai") {
        lines.push("  OpenAI anahtarı: https://platform.openai.com/api-keys");
    } else {
        lines.push("  Anthropic anahtarı: https://console.anthropic.com/");
    }
    return lines.join("\n");
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
    if (!parsed.message) parsed.message = "Anlaşılmayan bir yanıt aldım.";
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
                throw new Error(
                    "API kotası aşıldı. https://ai.google.dev/pricing adresinden limitleri kontrol edin."
                );
            } else if (msg.includes("401") || msg.includes("403") || msg.includes("API_KEY_INVALID")) {
                throw new Error("Geçersiz veya iptal edilmiş API anahtarı. 'nova auth' ile yeni anahtar girin.");
            }
        }
        throw err;
    }

    const text = result.response.text().trim();
    if (!text) {
        throw new Error("AI boş yanıt döndü. İsteğinizi yeniden ifade etmeyi deneyin.");
    }

    try {
        return parseAIResponseJson(text);
    } catch {
        throw new Error(`AI yanıtı çözümlenemedi. Ham çıktı: ${text}`);
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

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
    });

    const raw = await res.text();
    if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
            throw new Error("OpenAI API anahtarı geçersiz. 'nova auth set --provider openai <anahtar>' deneyin.");
        }
        if (res.status === 429) {
            throw new Error("OpenAI kotası veya hız limiti. Hesap limitlerinizi kontrol edin.");
        }
        throw new Error(`OpenAI hatası (${res.status}): ${raw.slice(0, 500)}`);
    }

    let data: { choices?: Array<{ message?: { content?: string } }> };
    try {
        data = JSON.parse(raw) as typeof data;
    } catch {
        throw new Error(`OpenAI yanıtı JSON değil: ${raw.slice(0, 200)}`);
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
        throw new Error("OpenAI boş içerik döndü.");
    }

    try {
        return parseAIResponseJson(text);
    } catch {
        throw new Error(`AI yanıtı çözümlenemedi. Ham çıktı: ${text}`);
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

    const res = await fetch("https://api.anthropic.com/v1/messages", {
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
    });

    const raw = await res.text();
    if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
            throw new Error(
                "Anthropic API anahtarı geçersiz. 'nova auth set --provider anthropic <anahtar>' deneyin."
            );
        }
        if (res.status === 429) {
            throw new Error("Anthropic kotası veya hız limiti.");
        }
        throw new Error(`Anthropic hatası (${res.status}): ${raw.slice(0, 500)}`);
    }

    let data: { content?: Array<{ type: string; text?: string }> };
    try {
        data = JSON.parse(raw) as typeof data;
    } catch {
        throw new Error(`Anthropic yanıtı JSON değil: ${raw.slice(0, 200)}`);
    }

    const textBlock = data.content?.find(c => c.type === "text");
    const text = textBlock?.text?.trim();
    if (!text) {
        throw new Error("Anthropic boş metin döndü.");
    }

    try {
        return parseAIResponseJson(text);
    } catch {
        throw new Error(`AI yanıtı çözümlenemedi. Ham çıktı: ${text}`);
    }
}

export async function translateToCommand(
    userPrompt: string,
    attachedFiles: AttachedFile[] = []
): Promise<AIResponse> {
    let finalPromptText = userPrompt;

    if (attachedFiles.length > 0) {
        finalPromptText += "\n\n--- EKLENEN DOSYA BAĞLAMLARI ---\n";
        for (const file of attachedFiles) {
            finalPromptText += `\nDosya: ${file.name}\n\`\`\`\n${file.content}\n\`\`\`\n`;
        }
        finalPromptText += "\nYukarıdaki dosya içeriklerini göz önünde bulundurarak işlem yap.\n";
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
