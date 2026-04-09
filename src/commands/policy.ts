/**
 * Policy Command — Project-scoped allow / deny rules
 *
 * Subcommands:
 *   nova policy              → show current policy (same as nova policy show)
 *   nova policy init         → create .nova-policy.json with starter rules
 *   nova policy show         → list all rules in the active policy file
 *   nova policy add <type> <pattern> [--reason <text>]
 *                            → add an allow or deny rule
 *   nova policy remove <index>
 *                            → remove a rule by its 1-based index
 */

import { theme } from "../utils/theme.js";
import { t } from "../utils/i18n.js";
import {
    findPolicyFile,
    getPolicyFilePath,
    readPolicy,
    writePolicy,
    initPolicy,
    PolicyRuleType,
} from "../services/policy.js";

// ─── show ────────────────────────────────────────────────────

export function policyShowCommand(): void {
    console.log();
    console.log(theme.brand(`  ${t("policy.title")}`));

    const filePath = findPolicyFile();

    if (!filePath) {
        console.log(theme.dim(`  ${t("policy.noFile")}`));
        console.log(theme.dim(`  ${t("policy.noFileHint")}`));
        console.log();
        return;
    }

    console.log(theme.dim(`  ${t("policy.filePath", { path: filePath })}`));
    console.log();

    const policy = readPolicy(filePath);

    if (policy === null) {
        console.log(theme.error(`  [FAIL] ${t("policy.parseError", { path: filePath })}`));
        console.log(theme.dim(`  ${t("policy.parseErrorHint")}`));
        console.log();
        return;
    }

    if (policy.rules.length === 0) {
        console.log(theme.dim(`  ${t("policy.noRules")}`));
        console.log(theme.dim(`  ${t("policy.noRulesHint")}`));
        console.log();
        return;
    }

    console.log(theme.dim(`  ${t("policy.rulesTitle", { count: String(policy.rules.length) })}`));
    console.log();

    policy.rules.forEach((rule, i) => {
        const typeLabel =
            rule.type === "deny"
                ? theme.error(`[${t("policy.denyLabel")}]`)
                : theme.success(`[${t("policy.allowLabel")}]`);
        const index = theme.dim(`${String(i + 1).padStart(2)}.`);
        const pattern = theme.brand(rule.pattern);
        const reason = rule.reason
            ? theme.dim(`  — ${t("policy.reason", { reason: rule.reason })}`)
            : "";
        console.log(`  ${index} ${typeLabel} ${pattern}${reason}`);
    });

    console.log();
}

// ─── init ────────────────────────────────────────────────────

export function policyInitCommand(): void {
    console.log();

    const existing = findPolicyFile(process.cwd());
    if (existing) {
        console.log(theme.warning(`  ${t("policy.initExists", { path: existing })}`));
        console.log();
        policyShowCommand();
        return;
    }

    const created = initPolicy(process.cwd());
    console.log(theme.success(`  ${t("policy.initSuccess", { path: created })}`));
    console.log();
    policyShowCommand();
}

// ─── add ─────────────────────────────────────────────────────

export function policyAddCommand(
    type: string,
    pattern: string,
    opts: { reason?: string } = {}
): void {
    console.log();

    const cleanType = type.trim().toLowerCase();
    if (cleanType !== "allow" && cleanType !== "deny") {
        console.log(theme.error(`  [FAIL] ${t("policy.invalidType")}`));
        console.log(theme.dim(`  Example: nova policy add deny "rm -rf node_modules"`));
        console.log();
        return;
    }

    const cleanPattern = pattern.trim();
    if (!cleanPattern) {
        console.log(theme.error(`  [FAIL] ${t("policy.patternEmpty")}`));
        console.log();
        return;
    }

    // Find or create policy file in cwd
    const filePath = findPolicyFile() ?? getPolicyFilePath();
    const existingPolicy = readPolicy(filePath);

    if (existingPolicy === null) {
        console.log(theme.error(`  [FAIL] ${t("policy.parseError", { path: filePath })}`));
        console.log(theme.dim(`  ${t("policy.parseErrorHint")}`));
        console.log();
        return;
    }

    const policy = existingPolicy;
    policy.rules.push({
        type: cleanType as PolicyRuleType,
        pattern: cleanPattern,
        ...(opts.reason ? { reason: opts.reason.trim() } : {}),
    });

    try {
        writePolicy(policy, filePath);
        console.log(
            theme.success(
                `  ${t("policy.addSuccess", { type: cleanType.toUpperCase(), pattern: cleanPattern })}`
            )
        );
        if (opts.reason) {
            console.log(theme.dim(`  ${t("policy.reason", { reason: opts.reason })}`));
        }
        console.log(theme.dim(`  ${t("policy.filePath", { path: filePath })}`));
    } catch {
        console.log(theme.error(`  [FAIL] ${t("policy.addError")}`));
    }

    console.log();
}

// ─── remove ──────────────────────────────────────────────────

export function policyRemoveCommand(index: string): void {
    console.log();

    const n = parseInt(index, 10);
    if (isNaN(n) || n < 1) {
        console.log(theme.error(`  [FAIL] ${t("policy.removeNotFound", { index })}`));
        console.log();
        return;
    }

    const filePath = findPolicyFile();
    if (!filePath) {
        console.log(theme.dim(`  ${t("policy.noFile")}`));
        console.log(theme.dim(`  ${t("policy.noFileHint")}`));
        console.log();
        return;
    }

    const parsedPolicy = readPolicy(filePath);

    if (parsedPolicy === null) {
        console.log(theme.error(`  [FAIL] ${t("policy.parseError", { path: filePath })}`));
        console.log(theme.dim(`  ${t("policy.parseErrorHint")}`));
        console.log();
        return;
    }

    const policy = parsedPolicy;
    const ruleIndex = n - 1;

    if (ruleIndex >= policy.rules.length) {
        console.log(
            theme.error(`  [FAIL] ${t("policy.removeNotFound", { index: String(n) })}`)
        );
        console.log();
        return;
    }

    const removed = policy.rules.splice(ruleIndex, 1)[0]!;

    try {
        writePolicy(policy, filePath);
        console.log(
            theme.success(
                `  ${t("policy.removeSuccess", { pattern: removed.pattern })}`
            )
        );
    } catch {
        console.log(theme.error(`  [FAIL] ${t("policy.removeError")}`));
    }

    console.log();
}
