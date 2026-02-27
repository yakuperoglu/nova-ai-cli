/**
 * Theme Engine
 *
 * Provides semantic color bindings for the CLI console output.
 * Users can switch between different aesthetic palettes using 'nova theme set <name>'.
 */

import chalk, { ChalkInstance } from "chalk";
import { getTheme } from "../services/config.js";

type ThemeDefinition = {
    success: ChalkInstance;
    error: ChalkInstance;
    warning: ChalkInstance;
    info: ChalkInstance;
    brand: ChalkInstance;
    dim: ChalkInstance;
};

// ─── Theme Palettes ────────────────────────────────────────

const THEMES: Record<string, ThemeDefinition> = {
    "default": {
        success: chalk.green,
        error: chalk.red,
        warning: chalk.yellow,
        info: chalk.blue,
        brand: chalk.cyan,
        dim: chalk.dim
    },
    "dracula": {
        success: chalk.hex("#50fa7b"),
        error: chalk.hex("#ff5555"),
        warning: chalk.hex("#f1fa8c"),
        info: chalk.hex("#8be9fd"),
        brand: chalk.hex("#bd93f9"),
        dim: chalk.hex("#6272a4")
    },
    "ocean": {
        success: chalk.hex("#a3be8c"),
        error: chalk.hex("#bf616a"),
        warning: chalk.hex("#ebcb8b"),
        info: chalk.hex("#88c0d0"),
        brand: chalk.hex("#5e81ac"),
        dim: chalk.hex("#4c566a")
    },
    "monokai": {
        success: chalk.hex("#a6e22e"),
        error: chalk.hex("#f92672"),
        warning: chalk.hex("#e6db74"),
        info: chalk.hex("#66d9ef"),
        brand: chalk.hex("#fd971f"),
        dim: chalk.hex("#75715e")
    },
    "hacker": {
        success: chalk.hex("#0f0"),
        error: chalk.hex("#f00"),
        warning: chalk.hex("#ff0"),
        info: chalk.hex("#0ff"),
        brand: chalk.hex("#0f0").bold, // true matrix green for branding
        dim: chalk.hex("#003300")
    }
};

/**
 * Returns a list of all installed theme IDs.
 */
export function getAvailableThemes(): string[] {
    return Object.keys(THEMES);
}

/**
 * Validates whether a given theme string exists in the palette map.
 */
export function isValidTheme(themeName: string): boolean {
    return themeName in THEMES;
}

// ─── Semantic Exporters ────────────────────────────────────

/** Get the currently active theme dictionary from Config */
function getActiveTheme(): ThemeDefinition {
    const selected = getTheme();
    if (selected && THEMES[selected]) {
        return THEMES[selected] as ThemeDefinition;
    }
    return THEMES["default"] as ThemeDefinition;
}

export const theme = {
    success: (text: string) => getActiveTheme().success(text),
    error: (text: string) => getActiveTheme().error(text),
    warning: (text: string) => getActiveTheme().warning(text),
    info: (text: string) => getActiveTheme().info(text),
    brand: (text: string) => getActiveTheme().brand(text),
    dim: (text: string) => getActiveTheme().dim(text),
};
