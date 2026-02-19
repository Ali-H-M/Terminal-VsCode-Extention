"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileManager = void 0;
const STORAGE_KEY = 'terminalLauncher.profiles';
class ProfileManager {
    constructor(globalState) {
        this.globalState = globalState;
    }
    getAllProfiles() {
        return this.globalState.get(STORAGE_KEY, []);
    }
    getProfile(id) {
        return this.getAllProfiles().find(p => p.id === id);
    }
    async saveProfile(profile) {
        const profiles = this.getAllProfiles();
        const index = profiles.findIndex(p => p.id === profile.id);
        if (index >= 0) {
            profiles[index] = profile;
        }
        else {
            profiles.push(profile);
        }
        await this.globalState.update(STORAGE_KEY, profiles);
    }
    async deleteProfile(id) {
        const profiles = this.getAllProfiles().filter(p => p.id !== id);
        await this.globalState.update(STORAGE_KEY, profiles);
    }
}
exports.ProfileManager = ProfileManager;
//# sourceMappingURL=profileManager.js.map