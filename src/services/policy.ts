/**
 * Policy Service — Project-scoped Allow / Deny Rules
 *
 * Policy file: .nova-policy.json in the current working directory.
 *
 * Rule types:
 *   deny  — block matching commands (cannot be overridden by security allow)
 *   allow — suppress warning for matching commands (hard-blocked patterns
 *           in security.ts are NEVER overridden; only "warning" → "safe")
 *
 * Pattern syntax (case-insensitive):
 *   Plain string   → substring match  ("rm -rf" matches "sudo rm -rf /tmp/old")
 *   Glob           → * matches any chars, ? matches one char
 *   Regex          → wrap in forward slashes  (/^sudo\s+rm/)
 */

import fs from "node:fs";
import path from "node:path";

// ─── Types ────────────────────────────────────────────────────

export type PolicyRuleType = "allow" | "deny";

export interface PolicyRule {
    type: PolicyRuleType;
    pattern: string;
    reason?: string;
}

export interface PolicyFile {
    version: number;
    rules: PolicyRule[];
}

export interface PolicyMatch {
    matched: true;
    rule: PolicyRule;
    index: number;
}

export interface PolicyNoMatch {
    matched: false;
}

export type PolicyResult = PolicyMatch | PolicyNoMatch;

// ─── Constants ───────────────────────────────────────────────

const POLICY_FILENAME = ".nova-policy.json";

const DEFAULT_POLICY: PolicyFile = {
    version: 1,
    rules: [],
};

// ─── Path resolution ─────────────────────────────────────────

/**
 * Returns the path to the policy file in the current working directory.
 * The search climbs up to find a .nova-policy.json the same way tools
 * like ESLint discover their config.
 */
export function findPolicyFile(startDir: string = process.cwd()): string | null {
    let dir = startDir;
    const root = path.parse(dir).root;

    while (true) {
        const candidate = path.join(dir, POLICY_FILENAME);
        if (fs.existsSync(candidate)) return candidate;
        const parent = path.dirname(dir);
        if (parent === dir || dir === root) break;
        dir = parent;
    }
    return null;
}

export function getPolicyFilePath(dir: string = process.cwd()): string {
    return path.join(dir, POLICY_FILENAME);
}

// ─── Read / Write ─────────────────────────────────────────────

/**
 * Reads and parses the policy file.
 * Returns null when the file exists but is corrupt/unreadable so callers
 * can treat it as a hard error rather than silently ignoring deny rules.
 */
export function readPolicy(filePath?: string): PolicyFile | null {
    const resolved = filePath ?? findPolicyFile();
    if (!resolved || !fs.existsSync(resolved)) {
        return { ...DEFAULT_POLICY, rules: [] };
    }

    try {
        const raw = fs.readFileSync(resolved, "utf-8");
        const parsed = JSON.parse(raw) as Partial<PolicyFile>;
        return {
            version: parsed.version ?? 1,
            rules: Array.isArray(parsed.rules) ? parsed.rules : [],
        };
    } catch {
        return null;
    }
}

export function writePolicy(policy: PolicyFile, filePath?: string): void {
    const resolved = filePath ?? getPolicyFilePath();
    fs.writeFileSync(resolved, JSON.stringify(policy, null, 2) + "\n", "utf-8");
}

export function initPolicy(dir: string = process.cwd()): string {
    const filePath = getPolicyFilePath(dir);
    if (fs.existsSync(filePath)) return filePath;

    const starter: PolicyFile = {
        version: 1,
        rules: [
            {
                type: "deny",
                pattern: "rm -rf node_modules",
                reason: "Use npm ci or npm clean-install instead",
            },
            {
                type: "allow",
                pattern: "sudo npm install -g",
                reason: "Global package installs are permitted in this project",
            },
        ],
    };
    writePolicy(starter, filePath);
    return filePath;
}

// ─── Pattern Matching ─────────────────────────────────────────

/**
 * Compiles a policy pattern into a RegExp.
 *   /regex/flags  → used directly as regex
 *   glob string   → * becomes .*, ? becomes .
 */
function compilePattern(pattern: string): RegExp {
    const regexMatch = pattern.match(/^\/(.+)\/([gimsuy]*)$/);
    if (regexMatch) {
        return new RegExp(regexMatch[1]!, regexMatch[2] || "i");
    }

    // Glob → regex (escape special chars except * and ?)
    const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".");

    return new RegExp(escaped, "i");
}

/**
 * Tests a command against a list of policy rules.
 * Returns the first matching rule (rules are evaluated in order).
 * Both the full command and each separator-split segment are tested.
 */
export function matchPolicy(command: string, rules: PolicyRule[]): PolicyResult {
    if (rules.length === 0) return { matched: false };

    const segments = splitCommandSegments(command);
    const targets = segments.length > 1 ? [command, ...segments] : [command];

    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i]!;
        const re = compilePattern(rule.pattern);

        for (const seg of targets) {
            if (re.test(seg)) {
                return { matched: true, rule, index: i };
            }
        }
    }

    return { matched: false };
}

/**
 * Matches only rules of a specific type.
 */
export function matchPolicyType(
    command: string,
    rules: PolicyRule[],
    type: PolicyRuleType
): PolicyResult {
    return matchPolicy(command, rules.filter((r) => r.type === type));
}

// ─── Helpers ─────────────────────────────────────────────────

function splitCommandSegments(command: string): string[] {
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
            if ((ch === "&" && next === "&") || (ch === "|" && next === "|")) {
                segments.push(current.trim());
                current = "";
                i++;
                continue;
            }
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
