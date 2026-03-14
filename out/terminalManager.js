"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
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
class TerminalManager {
    constructor() {
        this.isLaunching = false;
    }
    async launchProfile(profile) {
        if (this.isLaunching) {
            vscode.window.showWarningMessage('A profile is already launching. Please wait.');
            return;
        }
        this.isLaunching = true;
        try {
            for (const group of profile.groups) {
                await this.launchGroup(group);
            }
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
        }
    }
    createTerminal(config) {
        const options = {
            name: config.name || 'Terminal',
            iconPath: config.icon ? new vscode.ThemeIcon(config.icon) : undefined,
            color: config.color ? new vscode.ThemeColor(config.color) : undefined,
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
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.TerminalManager = TerminalManager;
//# sourceMappingURL=terminalManager.js.map