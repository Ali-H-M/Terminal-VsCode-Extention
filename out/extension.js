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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs/promises"));
const profileManager_1 = require("./profileManager");
const terminalManager_1 = require("./terminalManager");
const settingsWebview_1 = require("./settingsWebview");
function activate(context) {
    const profileManager = new profileManager_1.ProfileManager(context.globalState);
    const terminalManager = new terminalManager_1.TerminalManager();
    // Status bar button
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    statusBarItem.text = '$(terminal) Launch Terminal';
    statusBarItem.tooltip = 'Terminal Launcher: Quick Launch';
    statusBarItem.command = 'terminalLauncher.quickLaunch';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Open the settings webview
    context.subscriptions.push(vscode.commands.registerCommand('terminalLauncher.openSettings', () => {
        settingsWebview_1.SettingsWebview.createOrShow(context, profileManager, terminalManager);
    }));
    // Quick pick to select and launch a profile
    context.subscriptions.push(vscode.commands.registerCommand('terminalLauncher.quickLaunch', async () => {
        const profiles = profileManager.getAllProfiles();
        if (profiles.length === 0) {
            const action = await vscode.window.showInformationMessage('No profiles configured yet. Open settings to create one?', 'Open Settings');
            if (action === 'Open Settings') {
                await vscode.commands.executeCommand('terminalLauncher.openSettings');
            }
            return;
        }
        const picked = await vscode.window.showQuickPick(profiles.map(p => ({
            label: p.name,
            description: `${p.groups.length} group(s), ${p.groups.reduce((s, g) => s + g.terminals.length, 0)} terminal(s)`,
            id: p.id,
        })), { placeHolder: 'Select a profile to launch' });
        if (picked) {
            const profile = profileManager.getProfile(picked.id);
            if (profile) {
                await terminalManager.launchProfile(profile);
            }
        }
    }));
    // Launch a profile by ID (used internally and from webview)
    context.subscriptions.push(vscode.commands.registerCommand('terminalLauncher.launchProfile', async (profileId) => {
        if (!profileId) {
            await vscode.commands.executeCommand('terminalLauncher.quickLaunch');
            return;
        }
        const profile = profileManager.getProfile(profileId);
        if (!profile) {
            vscode.window.showErrorMessage(`Profile not found: ${profileId}`);
            return;
        }
        await terminalManager.launchProfile(profile);
    }));
    // Export profiles to a JSON file
    context.subscriptions.push(vscode.commands.registerCommand('terminalLauncher.exportProfiles', async () => {
        const profiles = profileManager.getAllProfiles();
        if (profiles.length === 0) {
            vscode.window.showWarningMessage('No profiles to export.');
            return;
        }
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('terminal-profiles.json'),
            filters: { 'JSON': ['json'] },
            title: 'Export Terminal Profiles',
        });
        if (!uri) {
            return;
        }
        await fs.writeFile(uri.fsPath, JSON.stringify(profiles, null, 2), 'utf8');
        vscode.window.showInformationMessage(`Exported ${profiles.length} profile(s) to ${uri.fsPath}`);
    }));
    // Import profiles from a JSON file
    context.subscriptions.push(vscode.commands.registerCommand('terminalLauncher.importProfiles', async () => {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { 'JSON': ['json'] },
            title: 'Import Terminal Profiles',
        });
        if (!uris || uris.length === 0) {
            return;
        }
        let imported;
        try {
            const raw = await fs.readFile(uris[0].fsPath, 'utf8');
            imported = JSON.parse(raw);
            if (!Array.isArray(imported)) {
                throw new Error('File must contain a JSON array of profiles.');
            }
        }
        catch (err) {
            vscode.window.showErrorMessage(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
            return;
        }
        const existing = profileManager.getAllProfiles();
        const choice = existing.length > 0
            ? await vscode.window.showQuickPick(['Merge with existing profiles', 'Replace all existing profiles'], {
                placeHolder: 'How should imported profiles be handled?',
            })
            : 'Merge with existing profiles';
        if (!choice) {
            return;
        }
        if (choice === 'Replace all existing profiles') {
            for (const p of existing) {
                await profileManager.deleteProfile(p.id);
            }
        }
        let count = 0;
        for (const p of imported) {
            if (p && typeof p.name === 'string' && Array.isArray(p.groups)) {
                // Assign a fresh ID to avoid collisions on merge
                if (choice === 'Merge with existing profiles') {
                    p.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
                }
                await profileManager.saveProfile(p);
                count++;
            }
        }
        vscode.window.showInformationMessage(`Imported ${count} profile(s).`);
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map