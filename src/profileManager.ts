import * as vscode from 'vscode';
import { Profile } from './types';

const STORAGE_KEY = 'terminalLauncher.profiles';

export class ProfileManager {
  constructor(private globalState: vscode.Memento) {}

  getAllProfiles(): Profile[] {
    return this.globalState.get<Profile[]>(STORAGE_KEY, []);
  }

  getProfile(id: string): Profile | undefined {
    return this.getAllProfiles().find(p => p.id === id);
  }

  async saveProfile(profile: Profile): Promise<void> {
    const profiles = this.getAllProfiles();
    const index = profiles.findIndex(p => p.id === profile.id);
    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }
    await this.globalState.update(STORAGE_KEY, profiles);
  }

  async deleteProfile(id: string): Promise<void> {
    const profiles = this.getAllProfiles().filter(p => p.id !== id);
    await this.globalState.update(STORAGE_KEY, profiles);
  }

  async reorderProfiles(ids: string[]): Promise<void> {
    const profiles = this.getAllProfiles();
    const reordered = ids.map(id => profiles.find(p => p.id === id)).filter((p): p is Profile => !!p);
    await this.globalState.update(STORAGE_KEY, reordered);
  }
}
