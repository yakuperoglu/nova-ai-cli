/**
 * Security Module — Command Validation & Safety Checks
 *
 * Provides a blocklist of dangerous commands, a warning system
 * for risky patterns, and input sanitization for AI responses.
 */

// ─── Types ─────────────────────────────────────────────────
export type RiskLevel = "blocked" | "warning" | "safe";

export interface ValidationResult {
    level: RiskLevel;
    safe: boolean;
    reason?: string;
}

// ─── Blocked Patterns (NEVER execute) ──────────────────────
// These regex patterns match commands that could cause
// irreversible system damage.
const BLOCKED_PATTERNS: { pattern: RegExp; reason: string }[] = [
    // ─ Filesystem destruction
    { pattern: /rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?[\/~]\s*$/i, reason: "Recursive deletion of root or home directory" },
    { pattern: /rm\s+-[a-zA-Z]*r[a-zA-Z]*\s+-[a-zA-Z]*f[a-zA-Z]*\s+\/\s*$/i, reason: "Force recursive deletion of root" },
    { pattern: /rm\s+-rf\s+\/(?!\S)/i, reason: "rm -rf / — destroys entire filesystem" },
    { pattern: /--no-preserve-root/i, reason: "Bypasses root deletion protection" },
    { pattern: /mkfs\./i, reason: "mkfs — formats a disk partition" },
    { pattern: /dd\s+if=.*of=\/dev\/[sh]d/i, reason: "dd — overwrites a disk device" },
    { pattern: />\s*\/dev\/[sh]d[a-z]/i, reason: "Redirecting output to a raw disk device" },

    // ─ Fork bombs & system crashes
    { pattern: /:\(\)\s*\{\s*:\|:\s*&\s*\}\s*;?\s*:/i, reason: "Fork bomb — crashes the system" },
    { pattern: /\bfork\s*bomb\b/i, reason: "Potential fork bomb" },

    // ─ System shutdown/reboot
    { pattern: /\bshutdown\b/i, reason: "System shutdown command" },
    { pattern: /\breboot\b/i, reason: "System reboot command" },
    { pattern: /\binit\s+[06]\b/i, reason: "System halt/reboot via init" },
    { pattern: /\bsystemctl\s+(poweroff|halt|reboot)\b/i, reason: "System power control" },

    // ─ Windows-specific destruction
    { pattern: /\bformat\s+[A-Z]:\s*/i, reason: "format — formats a Windows drive" },
    { pattern: /del\s+\/[sfq].*[A-Z]:\\/i, reason: "Force delete on Windows system drive" },
    { pattern: /rd\s+\/s\s+\/q\s+[A-Z]:\\/i, reason: "Recursive delete on Windows system drive" },
    { pattern: /Remove-Item\s+.*-Recurse.*-Force.*[A-Z]:\\/i, reason: "PowerShell recursive force delete on system drive" },

    // ─ Credential theft / exfiltration
    { pattern: /curl\s+.*\|\s*(bash|sh|zsh)/i, reason: "Piping remote content to shell — potential malware" },
    { pattern: /wget\s+.*\|\s*(bash|sh|zsh)/i, reason: "Piping remote content to shell — potential malware" },
    { pattern: /\beval\s*\(.*curl/i, reason: "Remote code execution attempt" },
];

// ─── Warning Patterns (show caution, allow with confirm) ───
const WARNING_PATTERNS: { pattern: RegExp; reason: string }[] = [
    { pattern: /\bsudo\b/i, reason: "Running with elevated privileges (sudo)" },
    { pattern: /--force\b/i, reason: "Using --force flag — skips safety checks" },
    { pattern: /\brm\s+-[a-zA-Z]*r/i, reason: "Recursive file deletion" },
    { pattern: /\bchmod\s+777\b/i, reason: "chmod 777 — makes files world-writable" },
    { pattern: /\bchown\b/i, reason: "Changing file ownership" },
    { pattern: /\bchmod\b.*\/etc/i, reason: "Changing permissions on system config files" },
    { pattern: />\s*\/etc\//i, reason: "Writing to system configuration directory" },
    { pattern: /\bkill\s+-9\b/i, reason: "Force-killing a process" },
    { pattern: /\bkillall\b/i, reason: "Killing all processes by name" },
    { pattern: /\bpkill\b/i, reason: "Killing processes by pattern" },
    { pattern: /\|\s*(bash|sh|zsh|powershell|cmd)/i, reason: "Piping output to shell — review carefully" },
    { pattern: /\bcrontab\b/i, reason: "Modifying scheduled tasks" },
    { pattern: /\biptables\b/i, reason: "Modifying firewall rules" },
    { pattern: /\bpasswd\b/i, reason: "Changing passwords" },
    { pattern: /\buseradd\b|\buserdel\b/i, reason: "User account modification" },
    { pattern: /\bscp\b|\brsync\b/i, reason: "Remote file transfer" },
    { pattern: /Set-ExecutionPolicy/i, reason: "Changing PowerShell execution policy" },
    { pattern: /\bREG\s+(ADD|DELETE)\b/i, reason: "Windows registry modification" },
];

// ─── Public API ────────────────────────────────────────────

/**
 * Validates a command against security blocklist and warning patterns.
 *
 * @param command - The shell command string to validate
 * @returns ValidationResult with risk level and reason
 */
export function validateCommand(command: string): ValidationResult {
    // Check blocked patterns first
    for (const { pattern, reason } of BLOCKED_PATTERNS) {
        if (pattern.test(command)) {
            return { level: "blocked", safe: false, reason };
        }
    }

    // Check warning patterns
    for (const { pattern, reason } of WARNING_PATTERNS) {
        if (pattern.test(command)) {
            return { level: "warning", safe: true, reason };
        }
    }

    return { level: "safe", safe: true };
}

/**
 * Sanitizes AI response text to remove injection attempts
 * and control characters.
 *
 * @param response - Raw AI response text
 * @returns Sanitized command string
 * @throws Error if response looks suspicious
 */
export function sanitizeAIResponse(response: string): string {
    // Remove null bytes and control characters (except newline/tab)
    let cleaned = response.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    // Remove markdown code fences
    cleaned = cleaned
        .replace(/^```[\w]*\n?/gm, "")
        .replace(/\n?```$/gm, "")
        .trim();

    // Reject suspiciously long responses (likely not a single command)
    if (cleaned.length > 500) {
        throw new Error(
            "AI response is suspiciously long (>500 chars). Refusing to execute.\n" +
            "  Please try a more specific request."
        );
    }

    // Reject if response contains multiple distinct commands on separate lines
    // (legitimate multi-command responses use && or ;)
    const lines = cleaned.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length > 3) {
        throw new Error(
            "AI generated multiple separate commands. This could be a safety risk.\n" +
            "  Please try a more specific request."
        );
    }

    return cleaned;
}

/**
 * Returns a risk level emoji for display purposes.
 */
export function getRiskIcon(level: RiskLevel): string {
    switch (level) {
        case "blocked":
            return "";
        case "warning":
            return "[WARN]";
        case "safe":
            return "";
    }
}
