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
exports.SettingsWebview = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class SettingsWebview {
    static createOrShow(context, profileManager, terminalManager) {
        const column = vscode.ViewColumn.One;
        if (SettingsWebview.currentPanel) {
            SettingsWebview.currentPanel.panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel('terminalLauncherSettings', 'Terminal Launcher Settings', column, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(context.extensionPath, 'webview')),
            ],
        });
        SettingsWebview.currentPanel = new SettingsWebview(panel, context, profileManager, terminalManager);
    }
    constructor(panel, context, profileManager, terminalManager) {
        this.context = context;
        this.profileManager = profileManager;
        this.terminalManager = terminalManager;
        this.disposables = [];
        this.panel = panel;
        this.panel.webview.html = this.getHtmlContent();
        this.panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'getProfiles':
                    this.panel.webview.postMessage({
                        command: 'profilesLoaded',
                        profiles: this.profileManager.getAllProfiles(),
                    });
                    break;
                case 'saveProfile':
                    await this.profileManager.saveProfile(message.profile);
                    this.panel.webview.postMessage({
                        command: 'profileSaved',
                        profile: message.profile,
                    });
                    break;
                case 'deleteProfile':
                    await this.profileManager.deleteProfile(message.profileId);
                    this.panel.webview.postMessage({
                        command: 'profilesLoaded',
                        profiles: this.profileManager.getAllProfiles(),
                    });
                    break;
                case 'reorderProfiles':
                    await this.profileManager.reorderProfiles(message.ids);
                    break;
                case 'launchProfile': {
                    const profile = this.profileManager.getProfile(message.profileId);
                    if (profile) {
                        await this.terminalManager.launchProfile(profile);
                    }
                    break;
                }
                case 'checkHealth': {
                    const profile = this.profileManager.getProfile(message.profileId);
                    if (profile) {
                        const issues = await this.terminalManager.checkProfileHealth(profile);
                        this.panel.webview.postMessage({
                            command: 'healthResult',
                            profileId: message.profileId,
                            issues,
                        });
                    }
                    break;
                }
                case 'checkCwdPath': {
                    const exists = await this.terminalManager.checkSinglePath(message.path);
                    this.panel.webview.postMessage({
                        command: 'cwdCheckResult',
                        gi: message.gi,
                        ti: message.ti,
                        exists,
                        path: message.path,
                    });
                    break;
                }
                case 'exportProfiles':
                    await vscode.commands.executeCommand('terminalLauncher.exportProfiles');
                    break;
                case 'importProfiles':
                    await vscode.commands.executeCommand('terminalLauncher.importProfiles');
                    // Refresh profile list after import
                    this.panel.webview.postMessage({
                        command: 'profilesLoaded',
                        profiles: this.profileManager.getAllProfiles(),
                    });
                    break;
            }
        }, null, this.disposables);
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }
    dispose() {
        SettingsWebview.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const d = this.disposables.pop();
            if (d) {
                d.dispose();
            }
        }
    }
    getHtmlContent() {
        const webview = this.panel.webview;
        const nonce = getNonce();
        const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'webview', 'settings-v4.css')));
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'webview', 'settings.js')));
        const codiconsUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'webview', 'codicon.css')));
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${codiconsUri}" rel="stylesheet">
  <link href="${styleUri}" rel="stylesheet">
  <title>Terminal Launcher Settings</title>
</head>
<body>
  <div id="app">
    <h1>Terminal Launcher</h1>
    <p>Loading...</p>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
exports.SettingsWebview = SettingsWebview;
function getNonce() {
    let text = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}
//# sourceMappingURL=settingsWebview.js.map