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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs/promises"));
const profileManager_1 = require("./profileManager");
const terminalManager_1 = require("./terminalManager");
const settingsWebview_1 = require("./settingsWebview");
const termprofileWatcher_1 = require("./termprofileWatcher");
function activate(context) {
    const profileManager = new profileManager_1.ProfileManager(context.globalState);
    const terminalManager = new terminalManager_1.TerminalManager();
    // Start watching for .termprofile in the workspace
    const termprofileWatcher = new termprofileWatcher_1.TermprofileWatcher(profileManager);
    // Status bar button
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    statusBarItem.text = '$(terminal) Launch Terminal';
    statusBarItem.tooltip = 'Terminal Launcher: Quick Launch';
    statusBarItem.command = 'terminalLauncher.quickLaunch';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Auto-launch profiles marked for auto-launch on workspace open
    const autoLaunchProfiles = profileManager.getAllProfiles().filter(p => p.autoLaunch);
    for (const profile of autoLaunchProfiles) {
        terminalManager.launchProfile(profile);
    }
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
        const sorted = [...profiles].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
        const picked = await vscode.window.showQuickPick(sorted.map(p => {
            const terminalNames = p.groups.flatMap(g => g.terminals.map(t => t.name)).filter(Boolean);
            return {
                label: (p.pinned ? '$(pinned) ' : '') + p.name,
                description: `${p.groups.length} group(s) · ${p.groups.reduce((s, g) => s + g.terminals.length, 0)} terminal(s)`,
                detail: terminalNames.length > 0 ? terminalNames.join('  ·  ') : undefined,
                id: p.id,
            };
        }), {
            placeHolder: 'Search and launch a profile',
            matchOnDescription: true,
            matchOnDetail: true,
        });
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
                if (choice === 'Merge with existing profiles') {
                    p.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
                }
                await profileManager.saveProfile(p);
                count++;
            }
        }
        vscode.window.showInformationMessage(`Imported ${count} profile(s).`);
    }));
    // Import profiles from .termprofile file in workspace root
    context.subscriptions.push(vscode.commands.registerCommand('terminalLauncher.importFromTermprofile', async () => {
        const files = await vscode.workspace.findFiles('.termprofile', null, 1);
        if (files.length === 0) {
            vscode.window.showWarningMessage('No .termprofile file found in the workspace root.');
            return;
        }
        const existing = profileManager.getAllProfiles();
        const strategyChoice = existing.length > 0
            ? await vscode.window.showQuickPick(['Merge with existing profiles', 'Replace all existing profiles'], { placeHolder: 'How to handle existing profiles?' })
            : 'Merge with existing profiles';
        if (!strategyChoice) {
            return;
        }
        const strategy = strategyChoice === 'Replace all existing profiles' ? 'replace' : 'merge';
        const count = await termprofileWatcher.importFromFile(files[0], strategy);
        if (count > 0) {
            vscode.window.showInformationMessage(`Imported ${count} profile(s) from .termprofile.`);
            // Refresh the webview if it's open
            settingsWebview_1.SettingsWebview.refresh(profileManager);
        }
    }));
    // Create a .termprofile file from selected profiles
    context.subscriptions.push(vscode.commands.registerCommand('terminalLauncher.createTermprofile', async () => {
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (!folder) {
            vscode.window.showWarningMessage('No workspace folder is open.');
            return;
        }
        const profiles = profileManager.getAllProfiles();
        if (profiles.length === 0) {
            vscode.window.showWarningMessage('No profiles to export.');
            return;
        }
        // Let user pick which profiles to include
        const picks = await vscode.window.showQuickPick(profiles.map(p => ({
            label: p.name,
            description: `${p.groups.length} group(s) · ${p.groups.reduce((s, g) => s + g.terminals.length, 0)} terminal(s)`,
            picked: true, // default: all selected
            id: p.id,
        })), {
            placeHolder: 'Select profiles to include in .termprofile (space to toggle)',
            canPickMany: true,
        });
        if (!picks || picks.length === 0) {
            return;
        }
        const selected = profiles.filter(p => picks.some(pick => pick.id === p.id));
        // Strip machine-local IDs before writing to the shared file
        const exportable = selected.map(({ id: _id, ...rest }) => rest);
        const fileContent = JSON.stringify({ version: 1, profiles: exportable }, null, 2);
        const uri = vscode.Uri.joinPath(folder.uri, '.termprofile');
        await vscode.workspace.fs.writeFile(uri, Buffer.from(fileContent, 'utf8'));
        const open = await vscode.window.showInformationMessage(`.termprofile created with ${selected.length} profile(s). Add it to version control so your team can use it.`, 'Open File');
        if (open === 'Open File') {
            await vscode.window.showTextDocument(uri);
        }
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map