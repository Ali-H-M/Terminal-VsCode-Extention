import * as vscode from 'vscode';
import * as path from 'path';
import { ProfileManager } from './profileManager';
import { TerminalManager } from './terminalManager';
import { WebviewMessage } from './types';

export class SettingsWebview {
  public static currentPanel: SettingsWebview | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(
    context: vscode.ExtensionContext,
    profileManager: ProfileManager,
    terminalManager: TerminalManager
  ) {
    const column = vscode.ViewColumn.One;

    if (SettingsWebview.currentPanel) {
      SettingsWebview.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'terminalLauncherSettings',
      'Terminal Launcher Settings',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'webview')),
        ],
      }
    );

    SettingsWebview.currentPanel = new SettingsWebview(
      panel,
      context,
      profileManager,
      terminalManager
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private context: vscode.ExtensionContext,
    private profileManager: ProfileManager,
    private terminalManager: TerminalManager
  ) {
    this.panel = panel;
    this.panel.webview.html = this.getHtmlContent();

    this.panel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
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

          case 'launchProfile': {
            const profile = this.profileManager.getProfile(message.profileId);
            if (profile) {
              await this.terminalManager.launchProfile(profile);
            }
            break;
          }
        }
      },
      null,
      this.disposables
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  private dispose() {
    SettingsWebview.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) {
        d.dispose();
      }
    }
  }

  private getHtmlContent(): string {
    const webview = this.panel.webview;
    const nonce = getNonce();

    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, 'webview', 'settings.css')
      )
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, 'webview', 'settings.js')
      )
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
