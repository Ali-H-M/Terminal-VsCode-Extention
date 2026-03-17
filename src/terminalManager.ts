import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import { Profile, TerminalGroup, TerminalConfig } from './types';

export class TerminalManager {
  private isLaunching = false;
  // Track terminals opened per profile so we can close them on relaunch
  private profileTerminals: Map<string, vscode.Terminal[]> = new Map();

  async launchProfile(profile: Profile): Promise<void> {
    if (this.isLaunching) {
      vscode.window.showWarningMessage('A profile is already launching. Please wait.');
      return;
    }

    // Close previously launched terminals for this profile if option is enabled
    if (profile.closeOnRelaunch) {
      const previous = this.profileTerminals.get(profile.id) ?? [];
      for (const t of previous) {
        try { t.dispose(); } catch { /* already closed */ }
      }
      this.profileTerminals.set(profile.id, []);
    }

    this.isLaunching = true;
    const launched: vscode.Terminal[] = [];
    try {
      for (const group of profile.groups) {
        if (group.disabled) { continue; }
        const terminals = await this.launchGroup(group);
        launched.push(...terminals);
      }
      this.profileTerminals.set(profile.id, launched);
      vscode.window.showInformationMessage(`Launched profile: ${profile.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`Failed to launch profile: ${msg}`);
    } finally {
      this.isLaunching = false;
    }
  }

  private async launchGroup(group: TerminalGroup): Promise<vscode.Terminal[]> {
    let previousTerminal: vscode.Terminal | undefined;
    const result: vscode.Terminal[] = [];

    for (let i = 0; i < group.terminals.length; i++) {
      const config = group.terminals[i];
      const shouldSplit = group.splitCount > 1 && i > 0 && previousTerminal !== undefined;

      let terminal: vscode.Terminal;

      if (shouldSplit) {
        terminal = await this.createSplitTerminal(previousTerminal!, config);
      } else {
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

  private createTerminal(config: TerminalConfig): vscode.Terminal {
    const options: vscode.TerminalOptions = {
      name: config.name || 'Terminal',
      iconPath: config.icon ? new vscode.ThemeIcon(config.icon) : undefined,
      color: config.color ? new vscode.ThemeColor(config.color) : undefined,
      cwd: config.cwd?.trim() || undefined,
    };
    return vscode.window.createTerminal(options);
  }

  private async createSplitTerminal(
    previousTerminal: vscode.Terminal,
    config: TerminalConfig
  ): Promise<vscode.Terminal> {
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
        cwd: config.cwd?.trim() || undefined,
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

  private async sendCommands(terminal: vscode.Terminal, commands: string[]): Promise<void> {
    for (const cmd of commands) {
      if (cmd.trim()) {
        terminal.sendText(cmd);
        await this.delay(100);
      }
    }
  }

  /** Check if all cwd paths in a profile exist on disk. Returns structured issues. */
  async checkProfileHealth(profile: Profile): Promise<Array<{ group: number; terminal: string; path: string }>> {
    const issues: Array<{ group: number; terminal: string; path: string }> = [];
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
    const nodePath = require('path') as typeof import('path');

    for (let gi = 0; gi < profile.groups.length; gi++) {
      if (profile.groups[gi].disabled) { continue; }
      for (const term of profile.groups[gi].terminals) {
        const raw = term.cwd?.trim();
        if (!raw) { continue; }
        const resolved = (workspaceRoot && !nodePath.isAbsolute(raw))
          ? nodePath.join(workspaceRoot, raw)
          : raw;
        try {
          await fs.access(resolved);
        } catch {
          issues.push({ group: gi + 1, terminal: term.name || 'Terminal', path: raw });
        }
      }
    }
    return issues;
  }

  /** Check a single cwd path — used by the editor inline check */
  async checkSinglePath(rawPath: string): Promise<boolean> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
    const nodePath = require('path') as typeof import('path');
    const resolved = (workspaceRoot && !nodePath.isAbsolute(rawPath))
      ? nodePath.join(workspaceRoot, rawPath)
      : rawPath;
    try {
      await fs.access(resolved);
      return true;
    } catch {
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
