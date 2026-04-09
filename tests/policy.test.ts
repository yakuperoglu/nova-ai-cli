/**
 * Tests — Policy Service
 *
 * readPolicy, writePolicy, matchPolicy, matchPolicyType ve
 * pattern derleme (plain string / glob / regex) davranışlarını kapsar.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
    readPolicy,
    writePolicy,
    initPolicy,
    findPolicyFile,
    matchPolicy,
    matchPolicyType,
    type PolicyFile,
    type PolicyRule,
} from "../src/services/policy.js";

// ─── Temp directory helpers ───────────────────────────────────

const tmpBase = path.join(os.tmpdir(), `nova-policy-test-${process.pid}`);

function makeTmpDir(): string {
    const dir = path.join(tmpBase, String(Math.random()).slice(2));
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

beforeEach(() => {
    fs.mkdirSync(tmpBase, { recursive: true });
});

afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
});

// ─── readPolicy ───────────────────────────────────────────────

describe("readPolicy", () => {
    it("dosya yoksa boş rules döner", () => {
        const policy = readPolicy("/nonexistent/path/.nova-policy.json");
        expect(policy.rules).toHaveLength(0);
        expect(policy.version).toBe(1);
    });

    it("geçerli JSON dosyasını okur", () => {
        const dir = makeTmpDir();
        const file = path.join(dir, ".nova-policy.json");
        const data: PolicyFile = {
            version: 1,
            rules: [{ type: "deny", pattern: "rm -rf node_modules", reason: "Use npm ci" }],
        };
        fs.writeFileSync(file, JSON.stringify(data));
        const policy = readPolicy(file);
        expect(policy.rules).toHaveLength(1);
        expect(policy.rules[0].type).toBe("deny");
    });

    it("bozuk JSON için null döner (fail-closed)", () => {
        const dir = makeTmpDir();
        const file = path.join(dir, ".nova-policy.json");
        fs.writeFileSync(file, "{ this is not json");
        const policy = readPolicy(file);
        expect(policy).toBeNull();
    });
});

// ─── writePolicy ─────────────────────────────────────────────

describe("writePolicy", () => {
    it("geçerli JOSN dosyası yazar", () => {
        const dir = makeTmpDir();
        const file = path.join(dir, ".nova-policy.json");
        const policy: PolicyFile = { version: 1, rules: [{ type: "allow", pattern: "sudo npm" }] };
        writePolicy(policy, file);
        const raw = fs.readFileSync(file, "utf-8");
        const parsed = JSON.parse(raw) as PolicyFile;
        expect(parsed.rules[0].pattern).toBe("sudo npm");
    });
});

// ─── initPolicy ──────────────────────────────────────────────

describe("initPolicy", () => {
    it("starter rules içeren dosya oluşturur", () => {
        const dir = makeTmpDir();
        const file = initPolicy(dir);
        expect(fs.existsSync(file)).toBe(true);
        const policy = readPolicy(file);
        expect(policy.rules.length).toBeGreaterThan(0);
    });

    it("zaten varsa üzerine yazmaz", () => {
        const dir = makeTmpDir();
        initPolicy(dir);
        const file = path.join(dir, ".nova-policy.json");
        const mtime1 = fs.statSync(file).mtimeMs;
        initPolicy(dir);
        const mtime2 = fs.statSync(file).mtimeMs;
        expect(mtime1).toBe(mtime2);
    });
});

// ─── findPolicyFile ───────────────────────────────────────────

describe("findPolicyFile", () => {
    it("mevcut dizinde dosyayı bulur", () => {
        const dir = makeTmpDir();
        const file = path.join(dir, ".nova-policy.json");
        fs.writeFileSync(file, JSON.stringify({ version: 1, rules: [] }));
        expect(findPolicyFile(dir)).toBe(file);
    });

    it("üst dizinde dosyayı bulur", () => {
        const parent = makeTmpDir();
        const child = path.join(parent, "subdir");
        fs.mkdirSync(child);
        const file = path.join(parent, ".nova-policy.json");
        fs.writeFileSync(file, JSON.stringify({ version: 1, rules: [] }));
        expect(findPolicyFile(child)).toBe(file);
    });

    it("yoksa null döner", () => {
        const dir = makeTmpDir();
        // Use a deep temp dir unlikely to have a policy file above it
        expect(findPolicyFile(dir)).toBeNull();
    });
});

// ─── matchPolicy: plain string ────────────────────────────────

describe("matchPolicy — plain string (substring)", () => {
    const rules: PolicyRule[] = [
        { type: "deny", pattern: "rm -rf node_modules" },
        { type: "allow", pattern: "sudo npm install -g" },
    ];

    it("tam eşleşmede matched: true döner", () => {
        const result = matchPolicy("rm -rf node_modules", rules);
        expect(result.matched).toBe(true);
    });

    it("substring eşleşmesinde matched: true döner", () => {
        const result = matchPolicy("cd /tmp && rm -rf node_modules", rules);
        expect(result.matched).toBe(true);
    });

    it("büyük/küçük harf duyarsız", () => {
        const result = matchPolicy("RM -RF NODE_MODULES", rules);
        expect(result.matched).toBe(true);
    });

    it("eşleşme yoksa matched: false döner", () => {
        const result = matchPolicy("npm install", rules);
        expect(result.matched).toBe(false);
    });

    it("eşleşen rule'u döner", () => {
        const result = matchPolicy("sudo npm install -g typescript", rules);
        if (!result.matched) throw new Error("expected matched");
        expect(result.rule.type).toBe("allow");
    });
});

// ─── matchPolicy: glob ────────────────────────────────────────

describe("matchPolicy — glob pattern", () => {
    const rules: PolicyRule[] = [
        { type: "deny", pattern: "npm run *" },
    ];

    it("glob * herhangi bir şeyle eşleşir", () => {
        expect(matchPolicy("npm run deploy", rules).matched).toBe(true);
        expect(matchPolicy("npm run test:ci", rules).matched).toBe(true);
    });
});

describe("matchPolicy — glob ? pattern", () => {
    const rules: PolicyRule[] = [
        { type: "deny", pattern: "npm run ?uild" },
    ];

    it("glob ? tek karakterle eşleşir", () => {
        expect(matchPolicy("npm run build", rules).matched).toBe(true);
    });

    it("glob ? iki karakterle eşleşmez", () => {
        expect(matchPolicy("npm run rebuildall", rules).matched).toBe(false);
    });
});

// ─── matchPolicy: regex ───────────────────────────────────────

describe("matchPolicy — regex pattern", () => {
    const rules: PolicyRule[] = [
        { type: "deny", pattern: "/^sudo\\s+rm/" },
    ];

    it("regex ile eşleşir", () => {
        expect(matchPolicy("sudo rm -rf /tmp/old", rules).matched).toBe(true);
    });

    it("regex ile eşleşmez", () => {
        expect(matchPolicy("echo sudo rm", rules).matched).toBe(false);
    });
});

// ─── matchPolicy: chained segments ───────────────────────────

describe("matchPolicy — zincirli komutlarda segment tarama", () => {
    const rules: PolicyRule[] = [
        { type: "deny", pattern: "format C:" },
    ];

    it("zincirin ortasındaki segment tespit edilir", () => {
        expect(matchPolicy("echo hi && format C: && echo done", rules).matched).toBe(true);
    });

    it("noktalı virgül ile zincirlenmişte tespit edilir", () => {
        expect(matchPolicy("cd /tmp; format C:", rules).matched).toBe(true);
    });
});

// ─── matchPolicyType ──────────────────────────────────────────

describe("matchPolicyType", () => {
    const rules: PolicyRule[] = [
        { type: "deny",  pattern: "rm -rf node_modules" },
        { type: "allow", pattern: "sudo npm install -g" },
    ];

    it("sadece deny türünü tarar", () => {
        expect(matchPolicyType("sudo npm install -g typescript", rules, "deny").matched).toBe(false);
        expect(matchPolicyType("rm -rf node_modules", rules, "deny").matched).toBe(true);
    });

    it("sadece allow türünü tarar", () => {
        expect(matchPolicyType("sudo npm install -g typescript", rules, "allow").matched).toBe(true);
        expect(matchPolicyType("rm -rf node_modules", rules, "allow").matched).toBe(false);
    });
});

// ─── Rule index ───────────────────────────────────────────────

describe("matchPolicy — eşleşen rule index'i doğru döner", () => {
    const rules: PolicyRule[] = [
        { type: "deny", pattern: "first" },
        { type: "deny", pattern: "second" },
        { type: "deny", pattern: "third" },
    ];

    it("ikinci kuralla eşleşince index 1 döner", () => {
        const result = matchPolicy("second command", rules);
        if (!result.matched) throw new Error("expected matched");
        expect(result.index).toBe(1);
    });
});
