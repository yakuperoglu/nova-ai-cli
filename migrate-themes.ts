import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, "src");

function replaceInFile(filePath: string) {
    if (!filePath.endsWith(".ts")) return;

    // Don't auto-replace the theme definition file itself
    if (filePath.endsWith("theme.ts")) return;

    let content = fs.readFileSync(filePath, "utf-8");

    // Add import if chalk was used and theme is not imported yet
    if (content.includes("chalk") || content.includes("import chalk")) {
        if (!content.includes('import { theme }')) {
            // Find last import
            const lines = content.split('\n');
            let lastImportIndex = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith("import ")) {
                    lastImportIndex = i;
                }
            }

            if (lastImportIndex !== -1) {
                // To avoid circular dependency logic just inject simply
                const relativeLevel = filePath.includes("commands") ? "../" : "./";
                lines.splice(lastImportIndex + 1, 0, `import { theme } from "${relativeLevel}utils/theme.js";`);
                content = lines.join('\n');
            }
        }
    }

    // Remove chalk import
    content = content.replace(/import chalk.*\n/g, "");

    // Replacements
    content = content.replace(/chalk\.green\.bold/g, "theme.success");
    content = content.replace(/chalk\.green/g, "theme.success");

    content = content.replace(/chalk\.red\.bold/g, "theme.error");
    content = content.replace(/chalk\.red/g, "theme.error");

    content = content.replace(/chalk\.yellow\.bold/g, "theme.warning");
    content = content.replace(/chalk\.yellow/g, "theme.warning");

    content = content.replace(/chalk\.blue\.bold/g, "theme.brand");
    content = content.replace(/chalk\.blue/g, "theme.brand");

    content = content.replace(/chalk\.cyan\.bold/g, "theme.brand");
    content = content.replace(/chalk\.cyanBright/g, "theme.brand");
    content = content.replace(/chalk\.cyan/g, "theme.brand");

    content = content.replace(/chalk\.dim/g, "theme.dim");
    content = content.replace(/chalk\.gray/g, "theme.dim");
    content = content.replace(/chalk\.white/g, ""); // white is usually default terminal color, stripping wrapper

    // Clean up empty wrappers if we stripped chalk.white
    content = content.replace(/\(\((.*?)\)\)/g, "($1)");

    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`Updated: ${filePath}`);
}

function walkDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else {
            replaceInFile(fullPath);
        }
    }
}

walkDir(SRC_DIR);
console.log("Migration to theme engine complete!");
