import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import { ProfileManager } from './profileManager';
import { TerminalManager } from './terminalManager';
import { SettingsWebview } from './settingsWebview';
import { TermprofileWatcher } from './termprofileWatcher';
import * as telemetry from './telemetry';

export function activate(context: vscode.ExtensionContext) {
  const profileManager = new ProfileManager(context.globalState);
  const terminalManager = new TerminalManager();

  // Start watching for .termprofile in the workspace
  const termprofileWatcher = new TermprofileWatcher(profileManager);

  // Status bar button
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  statusBarItem.text = '$(terminal) Launch Terminal';
  statusBarItem.tooltip = 'Terminal Launcher: Quick Launch';
  statusBarItem.command = 'terminalLauncher.quickLaunch';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  telemetry.init(context);
  context.subscriptions.push({ dispose: telemetry.dispose });

  // Auto-launch profiles marked for auto-launch on workspace open
  const autoLaunchProfiles = profileManager.getAllProfiles().filter(p => p.autoLaunch);
  for (const profile of autoLaunchProfiles) {
    terminalManager.launchProfile(profile);
    telemetry.sendEvent('profile.autoLaunch');
  }

  // Open the settings webview
  context.subscriptions.push(
    vscode.commands.registerCommand('terminalLauncher.openSettings', () => {
      telemetry.sendEvent('command.openSettings');
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

      const sorted = [...profiles].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      const picked = await vscode.window.showQuickPick(
        sorted.map(p => {
          const terminalNames = p.groups.flatMap(g => g.terminals.map(t => t.name)).filter(Boolean);
          return {
            label: (p.pinned ? '$(pinned) ' : '') + p.name,
            description: `${p.groups.length} group(s) · ${p.groups.reduce((s, g) => s + g.terminals.length, 0)} terminal(s)`,
            detail: terminalNames.length > 0 ? terminalNames.join('  ·  ') : undefined,
            id: p.id,
          };
        }),
        {
          placeHolder: 'Search and launch a profile',
          matchOnDescription: true,
          matchOnDetail: true,
        }
      );

      if (picked) {
        const profile = profileManager.getProfile(picked.id);
        if (profile) {
          telemetry.sendEvent('profile.launch', { source: 'quickLaunch' });
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
      telemetry.sendEvent('profile.launch', { source: 'direct' });
      await terminalManager.launchProfile(profile);
    })
  );

  // Export profiles to a JSON file
  context.subscriptions.push(
    vscode.commands.registerCommand('terminalLauncher.exportProfiles', async () => {
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
      if (!uri) { return; }
      await fs.writeFile(uri.fsPath, JSON.stringify(profiles, null, 2), 'utf8');
      telemetry.sendEvent('profiles.export', { count: profiles.length });
      vscode.window.showInformationMessage(`Exported ${profiles.length} profile(s) to ${uri.fsPath}`);
    })
  );

  // Import profiles from a JSON file
  context.subscriptions.push(
    vscode.commands.registerCommand('terminalLauncher.importProfiles', async () => {
      const uris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { 'JSON': ['json'] },
        title: 'Import Terminal Profiles',
      });
      if (!uris || uris.length === 0) { return; }
      let imported: any[];
      try {
        const raw = await fs.readFile(uris[0].fsPath, 'utf8');
        imported = JSON.parse(raw);
        if (!Array.isArray(imported)) { throw new Error('File must contain a JSON array of profiles.'); }
      } catch (err) {
        telemetry.sendEvent('error', { command: 'importProfiles', message: err instanceof Error ? err.message : String(err) });
        vscode.window.showErrorMessage(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }

      const existing = profileManager.getAllProfiles();
      const choice = existing.length > 0
        ? await vscode.window.showQuickPick(['Merge with existing profiles', 'Replace all existing profiles'], {
            placeHolder: 'How should imported profiles be handled?',
          })
        : 'Merge with existing profiles';

      if (!choice) { return; }

      if (choice === 'Replace all existing profiles') {
        for (const p of existing) { await profileManager.deleteProfile(p.id); }
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
      telemetry.sendEvent('profiles.import', { count, strategy: choice });
      vscode.window.showInformationMessage(`Imported ${count} profile(s).`);
    })
  );

  // Import profiles from .termprofile file in workspace root
  context.subscriptions.push(
    vscode.commands.registerCommand('terminalLauncher.importFromTermprofile', async () => {
      const files = await vscode.workspace.findFiles('.termprofile', null, 1);
      if (files.length === 0) {
        vscode.window.showWarningMessage('No .termprofile file found in the workspace root.');
        return;
      }

      const existing = profileManager.getAllProfiles();
      const strategyChoice = existing.length > 0
        ? await vscode.window.showQuickPick(
            ['Merge with existing profiles', 'Replace all existing profiles'],
            { placeHolder: 'How to handle existing profiles?' }
          )
        : 'Merge with existing profiles';

      if (!strategyChoice) { return; }

      const strategy = strategyChoice === 'Replace all existing profiles' ? 'replace' : 'merge';
      const count = await termprofileWatcher.importFromFile(files[0], strategy);
      if (count > 0) {
        telemetry.sendEvent('termprofile.import', { count, strategy });
        vscode.window.showInformationMessage(`Imported ${count} profile(s) from .termprofile.`);
        // Refresh the webview if it's open
        SettingsWebview.refresh(profileManager);
      }
    })
  );

  // Create a .termprofile file from selected profiles
  context.subscriptions.push(
    vscode.commands.registerCommand('terminalLauncher.createTermprofile', async () => {
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
      const picks = await vscode.window.showQuickPick(
        profiles.map(p => ({
          label: p.name,
          description: `${p.groups.length} group(s) · ${p.groups.reduce((s, g) => s + g.terminals.length, 0)} terminal(s)`,
          picked: true, // default: all selected
          id: p.id,
        })),
        {
          placeHolder: 'Select profiles to include in .termprofile (space to toggle)',
          canPickMany: true,
        }
      );

      if (!picks || picks.length === 0) { return; }

      const selected = profiles.filter(p => picks.some(pick => pick.id === p.id));

      // Strip machine-local IDs before writing to the shared file
      const exportable = selected.map(({ id: _id, ...rest }) => rest);
      const fileContent = JSON.stringify({ version: 1, profiles: exportable }, null, 2);
      const uri = vscode.Uri.joinPath(folder.uri, '.termprofile');

      await vscode.workspace.fs.writeFile(uri, Buffer.from(fileContent, 'utf8'));
      telemetry.sendEvent('termprofile.create', { count: selected.length });

      const open = await vscode.window.showInformationMessage(
        `.termprofile created with ${selected.length} profile(s). Add it to version control so your team can use it.`,
        'Open File'
      );
      if (open === 'Open File') {
        await vscode.window.showTextDocument(uri);
      }
    })
  );
}

export function deactivate() {}
