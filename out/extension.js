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
const profileManager_1 = require("./profileManager");
const terminalManager_1 = require("./terminalManager");
const settingsWebview_1 = require("./settingsWebview");
function activate(context) {
    const profileManager = new profileManager_1.ProfileManager(context.globalState);
    const terminalManager = new terminalManager_1.TerminalManager();
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
}
function deactivate() { }
//# sourceMappingURL=extension.js.map