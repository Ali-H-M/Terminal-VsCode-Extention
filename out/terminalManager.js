"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function () { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function (o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function (o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function (o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs/promises"));
class TerminalManager {
    constructor() {
        this.isLaunching = false;
        // Track terminals opened per profile so we can close them on relaunch
        this.profileTerminals = new Map();
    }
    async launchProfile(profile) {
        if (this.isLaunching) {
            vscode.window.showWarningMessage('A profile is already launching. Please wait.');
            return;
        }
        // Close previously launched terminals for this profile if option is enabled
        if (profile.closeOnRelaunch) {
            const previous = this.profileTerminals.get(profile.id) ?? [];
            for (const t of previous) {
                try {
                    t.dispose();
                }
                catch { /* already closed */ }
            }
            this.profileTerminals.set(profile.id, []);
        }
        this.isLaunching = true;
        const launched = [];
        try {
            for (const group of profile.groups) {
                if (group.disabled) {
                    continue;
                }
                const terminals = await this.launchGroup(group);
                launched.push(...terminals);
            }
            this.profileTerminals.set(profile.id, launched);
            vscode.window.showInformationMessage(`Launched profile: ${profile.name}`);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Failed to launch profile: ${msg}`);
        }
        finally {
            this.isLaunching = false;
        }
    }
    async launchGroup(group) {
        let previousTerminal;
        const result = [];
        for (let i = 0; i < group.terminals.length; i++) {
            const config = group.terminals[i];
            const shouldSplit = group.splitCount > 1 && i > 0 && previousTerminal !== undefined;
            let terminal;
            if (shouldSplit) {
                terminal = await this.createSplitTerminal(previousTerminal, config);
            }
            else {
                terminal = this.createTerminal(config);
                terminal.show();
                await this.delay(300);
            }
            await this.sendCommands(terminal, config.commands);
            previousTerminal = terminal;
            result.push(terminal);
        }
        return result;
    }
    resolveCwd(raw) {
        const trimmed = raw?.trim();
        if (!trimmed) {
            return undefined;
        }
        const nodePath = require('path');
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        if (workspaceRoot && !nodePath.isAbsolute(trimmed)) {
            return nodePath.join(workspaceRoot, trimmed);
        }
        return trimmed;
    }
    createTerminal(config) {
        const options = {
            name: config.name || 'Terminal',
            iconPath: config.icon ? new vscode.ThemeIcon(config.icon) : undefined,
            color: config.color ? new vscode.ThemeColor(config.color) : undefined,
            cwd: this.resolveCwd(config.cwd),
        };
        return vscode.window.createTerminal(options);
    }
    async createSplitTerminal(previousTerminal, config) {
        // Focus the previous terminal so the split happens next to it
        previousTerminal.show();
        await this.delay(300);
        // Use the internal 'new' command with splitActiveTerminal location
        // This creates a split AND applies icon/color in one step
        await vscode.commands.executeCommand('workbench.action.terminal.new', {
            config: {
                name: config.name || 'Terminal',
                icon: config.icon ? { id: config.icon } : undefined,
                color: config.color || undefined,
                cwd: this.resolveCwd(config.cwd),
            },
            location: { splitActiveTerminal: true },
        });
        await this.delay(400);
        const terminal = vscode.window.activeTerminal;
        if (!terminal) {
            throw new Error('Failed to create split terminal');
        }
        return terminal;
    }
    async sendCommands(terminal, commands) {
        for (const cmd of commands) {
            if (cmd.trim()) {
                terminal.sendText(cmd);
                await this.delay(100);
            }
        }
    }
    /** Check if all cwd paths in a profile exist on disk. Returns structured issues. */
    async checkProfileHealth(profile) {
        const issues = [];
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        const nodePath = require('path');
        for (let gi = 0; gi < profile.groups.length; gi++) {
            if (profile.groups[gi].disabled) {
                continue;
            }
            for (const term of profile.groups[gi].terminals) {
                const raw = term.cwd?.trim();
                if (!raw) {
                    continue;
                }
                const resolved = (workspaceRoot && !nodePath.isAbsolute(raw))
                    ? nodePath.join(workspaceRoot, raw)
                    : raw;
                try {
                    await fs.access(resolved);
                }
                catch {
                    issues.push({ group: gi + 1, terminal: term.name || 'Terminal', path: raw });
                }
            }
        }
        return issues;
    }
    /** Check a single cwd path — used by the editor inline check */
    async checkSinglePath(rawPath) {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        const nodePath = require('path');
        const resolved = (workspaceRoot && !nodePath.isAbsolute(rawPath))
            ? nodePath.join(workspaceRoot, rawPath)
            : rawPath;
        try {
            await fs.access(resolved);
            return true;
        }
        catch {
            return false;
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.TerminalManager = TerminalManager;
//# sourceMappingURL=terminalManager.js.map