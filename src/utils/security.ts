/**
 * Security Module — Command Validation & Safety Checks
 *
 * Provides a blocklist of dangerous commands, a warning system
 * for risky patterns, and input sanitization for AI responses.
 *
 * Katmanlar:
 *  1. HIGH-RISK FAMILIES  — komut ailesine göre hard deny (encoded, eval, obfuscation vb.)
 *  2. BLOCKED PATTERNS    — regex tabanlı yıkıcı komutlar
 *  3. WARNING PATTERNS    — onay gerektiren riskli ama meşru komutlar
 */

// ─── Types ─────────────────────────────────────────────────
export type RiskLevel = "blocked" | "warning" | "safe";

export interface ValidationResult {
    level: RiskLevel;
    safe: boolean;
    reason?: string;
}

// ─── 1. High-Risk Command Families ──────────────────────────
// Execution/obfuscation vektörleri — regex bypass riskini kapatır.
// Bu aile belirgin şekilde kötüye kullanım amacı taşır; meşru kullanım
// senaryosu çok nadir olduğundan tamamen engellenir.
const HIGH_RISK_FAMILIES: { pattern: RegExp; reason: string }[] = [
    // ─ PowerShell obfuscation / encoded execution
    {
        pattern: /powershell(?:\.exe)?\s+.*-[Ee]n(?:c(?:oded)?)?(?:[Cc]ommand)?\s+/i,
        reason: "PowerShell EncodedCommand — obfuscated execution vector",
    },
    {
        pattern: /powershell(?:\.exe)?\s+.*-[Cc]ommand\s+["']?\s*[Ii]nvoke-[Ee]xpression/i,
        reason: "PowerShell Invoke-Expression via -Command — code injection risk",
    },
    {
        pattern: /\bIEX\s*\(/i,
        reason: "IEX (Invoke-Expression alias) — remote code execution shorthand",
    },
    {
        pattern: /\bInvoke-Expression\b/i,
        reason: "Invoke-Expression — executes arbitrary string as code",
    },
    {
        pattern: /\bInvoke-WebRequest\b.*\bIEX\b/i,
        reason: "Download-and-execute via Invoke-WebRequest + IEX",
    },
    {
        pattern: /\[System\.Convert\]::FromBase64String/i,
        reason: "Base64 decode + execution — obfuscation technique",
    },
    {
        pattern: /\[System\.Text\.Encoding\].*::[Gg]et[Ss]tring.*[Cc]onvert.*[Bb]ase64/i,
        reason: "Base64 string decode chain — obfuscation technique",
    },

    // ─ CMD obfuscated execution
    {
        pattern: /cmd(?:\.exe)?\s+\/[Cc]\s+.*\^/i,
        reason: "CMD /C with caret obfuscation — command injection attempt",
    },
    {
        pattern: /cmd(?:\.exe)?\s+\/[Cc]\s+.*<\s*\(/i,
        reason: "CMD /C with process substitution — obfuscated execution",
    },

    // ─ Bash/shell eval + remote fetch chain
    {
        pattern: /\beval\s+["'`]?\s*\$?\(?\s*(curl|wget|fetch)\b/i,
        reason: "eval + remote fetch — download-and-execute attack pattern",
    },
    {
        pattern: /\beval\s*["'`$({]/i,
        reason: "eval with dynamic input — arbitrary code execution risk",
    },
    {
        pattern: /\$\(\s*(curl|wget)\s+/i,
        reason: "Command substitution with remote fetch — code injection risk",
    },
    {
        pattern: /`\s*(curl|wget)\s+/i,
        reason: "Backtick command substitution with remote fetch",
    },

    // ─ Python/Node/Ruby/Perl inline execution from remote
    {
        pattern: /python[23]?\s+-c\s+["'].*(?:urllib|requests|socket|subprocess)/i,
        reason: "Python one-liner with network/subprocess — potential backdoor",
    },
    {
        pattern: /node\s+-e\s+["'].*(?:require\s*\(\s*['"](?:child_process|net|http)|exec\s*\()/i,
        reason: "Node.js one-liner with child_process/net — potential backdoor",
    },
    {
        pattern: /perl\s+-e\s+["'].*(?:socket|exec|system)/i,
        reason: "Perl one-liner with network/exec — potential backdoor",
    },
    {
        pattern: /ruby\s+-e\s+["'].*(?:require\s+['"](?:net|open-uri|socket)|exec|system)/i,
        reason: "Ruby one-liner with network/exec — potential backdoor",
    },

    // ─ Netcat / reverse shell patterns
    {
        pattern: /\bnc\b.*-[elp].*\d{2,5}/i,
        reason: "netcat listener/connection — potential reverse shell",
    },
    {
        pattern: /\bncat\b.*-[elp]/i,
        reason: "ncat listener — potential reverse shell",
    },
    {
        pattern: /\/dev\/tcp\//i,
        reason: "Bash /dev/tcp redirect — reverse shell technique",
    },
    {
        pattern: /\/dev\/udp\//i,
        reason: "Bash /dev/udp redirect — reverse shell technique",
    },

    // ─ Credential / secret exfiltration
    {
        pattern: /(?:curl|wget|Invoke-WebRequest)\s+.*\s+-[dXH].*(?:Authorization|password|token|secret|api.?key)/i,
        reason: "HTTP request with credential headers — possible exfiltration",
    },

    // ─ Windows: disable security tools / logging
    {
        pattern: /Set-MpPreference\s+.*-Disable/i,
        reason: "Disabling Windows Defender via Set-MpPreference",
    },
    {
        pattern: /netsh\s+(?:advfirewall\s+)?firewall\s+set\s+.*(?:off|disable)/i,
        reason: "Disabling Windows Firewall",
    },
    {
        pattern: /bcdedit\s+\/set\s+.*(?:off|disable)/i,
        reason: "Modifying boot configuration — potential security bypass",
    },
    {
        pattern: /wevtutil\s+cl\b/i,
        reason: "Clearing Windows Event Logs — evidence destruction",
    },
    {
        pattern: /auditpol\s+\/(?:remove|set\s+.*:No Auditing)/i,
        reason: "Disabling Windows audit policy — evidence destruction",
    },

    // ─ Crontab/scheduled task based persistence
    {
        pattern: /\bcrontab\s+-[rl]\s*;.*(?:curl|wget|bash|sh)/i,
        reason: "Cron + remote execution — potential persistence mechanism",
    },
];

// ─── 2. Blocked Patterns (NEVER execute) ──────────────────────
// Doğrudan yıkıcı sonuç doğuran komutlar.
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

// ─── 3. Warning Patterns (show caution, allow with confirm) ───
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
    { pattern: /(?:curl|wget)\s+.*https?:\/\/(?!(?:github|gitlab|npmjs|pypi|rubygems|registry)\.)/i, reason: "Outbound HTTP request to an external host — review carefully" },
];

// ─── 4. Shell Separator Tokenizer ──────────────────────────
// Splits chained commands on ;  &&  ||  |  so that each segment
// is validated independently.  Quoted sections are preserved so
// arguments like --message "a && b" are not split incorrectly.

function splitSegments(command: string): string[] {
    const segments: string[] = [];
    let current = "";
    let inSingle = false;
    let inDouble = false;

    for (let i = 0; i < command.length; i++) {
        const ch = command[i];
        const next = command[i + 1];

        if (ch === "'" && !inDouble) { inSingle = !inSingle; current += ch; continue; }
        if (ch === '"' && !inSingle) { inDouble = !inDouble; current += ch; continue; }

        if (!inSingle && !inDouble) {
            // &&  ||  — two-char operators
            if ((ch === "&" && next === "&") || (ch === "|" && next === "|")) {
                segments.push(current.trim());
                current = "";
                i++; // skip second char
                continue;
            }
            // |  ;  — single-char separators (| not part of ||)
            if (ch === ";" || ch === "|") {
                segments.push(current.trim());
                current = "";
                continue;
            }
        }
        current += ch;
    }
    if (current.trim()) segments.push(current.trim());
    return segments.filter((s) => s.length > 0);
}

// ─── Public API ────────────────────────────────────────────

/**
 * Validates a command against three-tier security model:
 *  1. High-risk family deny (obfuscation, eval, reverse shells…)
 *  2. Blocked patterns (irreversible destructive commands)
 *  3. Warning patterns (risky but potentially legitimate)
 *
 * Each `;` / `&&` / `||` / `|` separated segment is evaluated
 * independently so chained dangerous sub-commands cannot hide.
 *
 * @param command - The shell command string to validate
 * @returns ValidationResult with the highest risk level found
 */
export function validateCommand(command: string): ValidationResult {
    const segments = splitSegments(command);
    // Always include the full command as one of the segments so
    // cross-segment patterns (e.g. curl … | bash) still match.
    const targets = segments.length > 1 ? [command.trim(), ...segments] : [command.trim()];

    let highestWarning: ValidationResult | null = null;

    for (const seg of targets) {
        // Tier 1: high-risk families — always blocked
        for (const { pattern, reason } of HIGH_RISK_FAMILIES) {
            if (pattern.test(seg)) {
                return { level: "blocked", safe: false, reason };
            }
        }

        // Tier 2: destructive commands — always blocked
        for (const { pattern, reason } of BLOCKED_PATTERNS) {
            if (pattern.test(seg)) {
                return { level: "blocked", safe: false, reason };
            }
        }

        // Tier 3: risky commands — warn and ask confirmation
        for (const { pattern, reason } of WARNING_PATTERNS) {
            if (pattern.test(seg)) {
                highestWarning = { level: "warning", safe: true, reason };
                break;
            }
        }
    }

    return highestWarning ?? { level: "safe", safe: true };
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
 * Returns a risk level icon for display purposes.
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
