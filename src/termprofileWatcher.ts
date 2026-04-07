import * as vscode from 'vscode';
import { Profile, TermprofileFile } from './types';
import { ProfileManager } from './profileManager';

export class TermprofileWatcher {
  constructor(private profileManager: ProfileManager) {}

  async importFromFile(uri: vscode.Uri, strategy: 'merge' | 'replace'): Promise<number> {
    const { profiles: incoming, error } = await this.validateFile(uri);
    if (error) {
      vscode.window.showErrorMessage(`Failed to import .termprofile: ${error}`);
      return 0;
    }

    if (strategy === 'replace') {
      for (const p of this.profileManager.getAllProfiles()) {
        await this.profileManager.deleteProfile(p.id);
      }
    }

    let count = 0;
    for (const incoming_p of incoming) {
      const freshId = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
      const profile: Profile = { ...incoming_p, id: freshId };

      if (strategy === 'merge') {
        const existing = this.profileManager.getAllProfiles();
        const clash = existing.find(p => p.name === profile.name);
        if (clash) {
          profile.name = `${profile.name} (from .termprofile)`;
        }
      }

      await this.profileManager.saveProfile(profile);
      count++;
    }

    return count;
  }

  async validateFile(uri: vscode.Uri): Promise<{ profiles: Omit<Profile, 'id'>[]; error?: string }> {
    let raw: string;
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      raw = Buffer.from(bytes).toString('utf8');
    } catch (e) {
      return { profiles: [], error: `Cannot read file: ${e}` };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return { profiles: [], error: `Invalid JSON: ${e}` };
    }

    const file = parsed as Partial<TermprofileFile>;

    if (file.version !== 1) {
      const proceed = await vscode.window.showWarningMessage(
        '.termprofile version is missing or unrecognized. Try importing anyway?',
        'Import Anyway',
        'Cancel'
      );
      if (proceed !== 'Import Anyway') {
        return { profiles: [], error: 'Import cancelled.' };
      }
    }

    if (!Array.isArray(file.profiles)) {
      return { profiles: [], error: 'File must have a "profiles" array.' };
    }

    const valid = (file.profiles as unknown[]).filter(
      (p): p is Omit<Profile, 'id'> => {
        const pr = p as any;
        return typeof pr?.name === 'string' &&
          Array.isArray(pr?.groups) &&
          pr.groups.every((g: any) =>
            g && Array.isArray(g.terminals) &&
            g.terminals.every((t: any) => t && Array.isArray(t.commands))
          );
      }
    );

    return { profiles: valid };
  }
}
