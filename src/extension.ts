import * as vscode from 'vscode';
import { ProfileManager } from './profileManager';
import { TerminalManager } from './terminalManager';
import { SettingsWebview } from './settingsWebview';

export function activate(context: vscode.ExtensionContext) {
  const profileManager = new ProfileManager(context.globalState);
  const terminalManager = new TerminalManager();

  // Open the settings webview
  context.subscriptions.push(
    vscode.commands.registerCommand('terminalLauncher.openSettings', () => {
      SettingsWebview.createOrShow(context, profileManager, terminalManager);
    })
  );

  // Quick pick to select and launch a profile
  context.subscriptions.push(
    vscode.commands.registerCommand('terminalLauncher.quickLaunch', async () => {
      const profiles = profileManager.getAllProfiles();
      if (profiles.length === 0) {
        const action = await vscode.window.showInformationMessage(
          'No profiles configured yet. Open settings to create one?',
          'Open Settings'
        );
        if (action === 'Open Settings') {
          await vscode.commands.executeCommand('terminalLauncher.openSettings');
        }
        return;
      }

      const picked = await vscode.window.showQuickPick(
        profiles.map(p => ({
          label: p.name,
          description: `${p.groups.length} group(s), ${p.groups.reduce((s, g) => s + g.terminals.length, 0)} terminal(s)`,
          id: p.id,
        })),
        { placeHolder: 'Select a profile to launch' }
      );

      if (picked) {
        const profile = profileManager.getProfile(picked.id);
        if (profile) {
          await terminalManager.launchProfile(profile);
        }
      }
    })
  );

  // Launch a profile by ID (used internally and from webview)
  context.subscriptions.push(
    vscode.commands.registerCommand('terminalLauncher.launchProfile', async (profileId?: string) => {
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
    })
  );
}

export function deactivate() {}
