/**
 * AI Service — Gemini Integration
 *
 * Provider : Google Gemini (via @google/generative-ai SDK)
 * Model    : gemini-2.5-flash
 * Endpoint : https://generativelanguage.googleapis.com/v1beta/
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import os from "node:os";
import { getApiKey } from "./config.js";
import { sanitizeAIResponse } from "../utils/security.js";
import { getHistory } from "./history.js";

const MODEL_NAME = "gemini-2.5-flash";

export interface AIResponse {
    type: "chat" | "command";
    message: string;
    command: string;
}

// ─── System Prompt ─────────────────────────────────────────
const isWindows = os.platform() === "win32";
const shellName = isWindows ? "PowerShell" : "bash/zsh";

const SYSTEM_PROMPT = `You are "Nova", a friendly, highly skilled AI terminal assistant.

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
🚨 WINDOWS POWERSHELL STRICT RULES:
- You MUST write 100% valid PowerShell syntax.
- DO NOT use bash idioms like '&&' or '||'. PowerShell 5.1 DOES NOT support '&&'.
- To chain multiple commands in PowerShell, use ';' instead of '&&'. (Example: cd foo ; ls)
- If conditional execution is strictly needed, use 'if ($?) { ... }' or 'if ($LASTEXITCODE -eq 0) { ... }'
` : `
- Chain multiple commands with && or semicolons.
`}

ENVIRONMENT:
- Architecture: ${os.arch()}
- Home Directory: ${os.homedir()}`;

function getClient(): GoogleGenerativeAI {
    const apiKey = getApiKey();

    if (!apiKey) {
        throw new Error(
            "API key is not configured.\n\n" +
            "  Please authenticate first:\n" +
            "    \x1b[36mnova auth <your-api-key>\x1b[0m\n\n" +
            "  Get your free key from:\n" +
            "    https://aistudio.google.com/apikey"
        );
    }

    return new GoogleGenerativeAI(apiKey);
}

export async function translateToCommand(userPrompt: string): Promise<AIResponse> {
    const client = getClient();
    const model = client.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
            responseMimeType: "application/json",
        }
    });

    let result;

    try {
        const history = getHistory();

        result = await model.generateContent({
            contents: [
                ...history,
                { role: "user", parts: [{ text: userPrompt }] }
            ]
        });
    } catch (err: unknown) {
        if (err instanceof Error) {
            const msg = err.message;
            if (msg.includes("429") || msg.includes("quota")) {
                throw new Error("API quota exceeded. Please check your API key limits at https://ai.google.dev/pricing");
            } else if (msg.includes("401") || msg.includes("403") || msg.includes("API_KEY_INVALID")) {
                throw new Error("Invalid or revoked API key. Try running: nova auth <new-key>");
            }
        }
        throw err;
    }

    const text = result.response.text().trim();

    if (!text) {
        throw new Error("AI returned an empty response. Please try rephrasing your request.");
    }

    try {
        const parsed = JSON.parse(text) as AIResponse;

        // Ensure structure is correct
        if (!parsed.type || !["chat", "command"].includes(parsed.type)) parsed.type = "chat";
        if (!parsed.message) parsed.message = "Anlaşılmayan bir yanıt aldım.";
        if (parsed.type === "command" && parsed.command) {
            parsed.command = sanitizeAIResponse(parsed.command);
        } else {
            parsed.command = "";
        }

        return parsed;
    } catch (e) {
        throw new Error(`Failed to parse AI response. Raw output: ${text}`);
    }
}
