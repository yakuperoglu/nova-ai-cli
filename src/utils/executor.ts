/**
 * Command Executor
 *
 * Safely executes shell commands using Node.js child_process.
 * Includes timeout protection and structured output.
 */

import { exec } from "node:child_process";

export interface ExecutionResult {
    stdout: string;
    stderr: string;
}

/** Default timeout: 30 seconds */
const TIMEOUT_MS = 30_000;

/**
 * Executes a shell command and returns the output.
 *
 * @param command - The shell command to execute
 * @param timeoutMs - Maximum execution time in milliseconds (default: 30s)
 * @returns Promise resolving to stdout and stderr
 * @throws Error if the command fails or times out
 */
export function executeCommand(
    command: string,
    timeoutMs: number = TIMEOUT_MS
): Promise<ExecutionResult> {
    return new Promise((resolve, reject) => {
        let finalCommand = command;
        if (process.platform === "win32") {
            // Force PowerShell to treat all errors as terminating errors and exit with code 1
            finalCommand = `$ErrorActionPreference = 'Stop'; ${command}`;
        }

        const child = exec(
            finalCommand,
            {
                timeout: timeoutMs,
                maxBuffer: 1024 * 1024 * 10, // 10 MB
                shell: process.platform === "win32" ? "powershell.exe" : "/bin/bash",
            },
            (error, stdout, stderr) => {
                if (error) {
                    // Timeout case
                    if (error.killed) {
                        reject(
                            new Error(
                                `Command timed out after ${timeoutMs / 1000} seconds.`
                            )
                        );
                        return;
                    }

                    reject(
                        new Error(
                            `Command failed (exit code ${error.code ?? "unknown"}):\n${stderr || error.message}`
                        )
                    );
                    return;
                }

                resolve({
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                });
            }
        );

        // Forward real-time output to terminal
        child.stdout?.pipe(process.stdout);
        child.stderr?.pipe(process.stderr);
    });
}
