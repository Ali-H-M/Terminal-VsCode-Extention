import * as vscode from 'vscode';
import { Profile, TerminalGroup, TerminalConfig } from './types';

export class TerminalManager {
  private isLaunching = false;

  async launchProfile(profile: Profile): Promise<void> {
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`Failed to launch profile: ${msg}`);
    } finally {
      this.isLaunching = false;
    }
  }

  private async launchGroup(group: TerminalGroup): Promise<void> {
    let previousTerminal: vscode.Terminal | undefined;

    for (let i = 0; i < group.terminals.length; i++) {
      const config = group.terminals[i];
      const shouldSplit = group.split && i > 0 && previousTerminal !== undefined;

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
    }
  }

  private createTerminal(config: TerminalConfig): vscode.Terminal {
    const options: vscode.TerminalOptions = {
      name: config.name || 'Terminal',
      iconPath: config.icon ? new vscode.ThemeIcon(config.icon) : undefined,
      color: config.color ? new vscode.ThemeColor(config.color) : undefined,
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

    // Split the active terminal
    await vscode.commands.executeCommand('workbench.action.terminal.split');
    await this.delay(400);

    // The newly split terminal is now the active terminal
    const terminal = vscode.window.activeTerminal;
    if (!terminal) {
      throw new Error('Failed to create split terminal');
    }

    // Rename the split terminal
    if (config.name) {
      await vscode.commands.executeCommand(
        'workbench.action.terminal.renameWithArg',
        { name: config.name }
      );
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
