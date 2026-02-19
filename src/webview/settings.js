// @ts-nocheck
(function () {
  const vscode = acquireVsCodeApi();

  let profiles = [];
  let editingProfile = null; // null = list view, object = editing
  let pendingDeleteId = null; // track delete confirmation

  // Icons available for terminals
  const ICON_OPTIONS = [
    { value: '', label: 'Default' },
    { value: 'terminal', label: 'Terminal' },
    { value: 'flame', label: 'Flame' },
    { value: 'zap', label: 'Zap' },
    { value: 'server', label: 'Server' },
    { value: 'database', label: 'Database' },
    { value: 'globe', label: 'Globe' },
    { value: 'bug', label: 'Bug' },
    { value: 'beaker', label: 'Beaker' },
    { value: 'rocket', label: 'Rocket' },
    { value: 'gear', label: 'Gear' },
    { value: 'tools', label: 'Tools' },
    { value: 'heart', label: 'Heart' },
    { value: 'star', label: 'Star' },
    { value: 'play', label: 'Play' },
    { value: 'debug-console', label: 'Debug Console' },
  ];

  const COLOR_OPTIONS = [
    { value: '', label: 'Default' },
    { value: 'terminal.ansiRed', label: 'Red' },
    { value: 'terminal.ansiGreen', label: 'Green' },
    { value: 'terminal.ansiYellow', label: 'Yellow' },
    { value: 'terminal.ansiBlue', label: 'Blue' },
    { value: 'terminal.ansiMagenta', label: 'Magenta' },
    { value: 'terminal.ansiCyan', label: 'Cyan' },
    { value: 'terminal.ansiWhite', label: 'White' },
  ];

  // Request profiles on load
  window.addEventListener('DOMContentLoaded', () => {
    vscode.postMessage({ command: 'getProfiles' });
  });

  // Handle messages from extension
  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.command) {
      case 'profilesLoaded':
        profiles = message.profiles;
        if (!editingProfile) {
          renderProfileList();
        }
        break;
      case 'profileSaved':
        editingProfile = null;
        vscode.postMessage({ command: 'getProfiles' });
        break;
      case 'error':
        alert(message.message);
        break;
    }
  });

  function renderProfileList() {
    const app = document.getElementById('app');
    if (profiles.length === 0) {
      app.innerHTML = `
        <h1>Terminal Launcher</h1>
        <div class="empty-state">
          <p>No profiles yet. Create one to get started!</p>
          <button id="btn-new-profile">+ New Profile</button>
        </div>
      `;
    } else {
      let cardsHtml = profiles.map(p => {
        const terminalCount = p.groups.reduce((sum, g) => sum + g.terminals.length, 0);
        const groupCount = p.groups.length;
        const isDeleting = pendingDeleteId === p.id;
        return `
          <div class="profile-card ${isDeleting ? 'profile-card-deleting' : ''}">
            <div class="profile-card-info">
              <h3>${escapeHtml(p.name)}</h3>
              <p>${groupCount} group(s), ${terminalCount} terminal(s)</p>
            </div>
            ${isDeleting
              ? `<div class="profile-card-actions">
                   <span class="delete-confirm-text">Delete this profile?</span>
                   <button class="danger" id="btn-confirm-delete">Yes, Delete</button>
                   <button class="secondary" id="btn-cancel-delete">Cancel</button>
                 </div>`
              : `<div class="profile-card-actions">
                   <button data-action="launch" data-id="${p.id}">Launch</button>
                   <button class="secondary" data-action="edit" data-id="${p.id}">Edit</button>
                   <button class="secondary danger" data-action="delete" data-id="${p.id}">Delete</button>
                 </div>`
            }
          </div>
        `;
      }).join('');

      app.innerHTML = `
        <h1>Terminal Launcher</h1>
        <div id="profile-list">${cardsHtml}</div>
        <button id="btn-new-profile">+ New Profile</button>
      `;
    }

    // Bind events
    document.getElementById('btn-new-profile')?.addEventListener('click', () => {
      editingProfile = createEmptyProfile();
      renderEditor();
    });

    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.getAttribute('data-action');
        const id = e.currentTarget.getAttribute('data-id');
        if (action === 'launch') {
          vscode.postMessage({ command: 'launchProfile', profileId: id });
        } else if (action === 'edit') {
          editingProfile = JSON.parse(JSON.stringify(profiles.find(p => p.id === id)));
          renderEditor();
        } else if (action === 'delete') {
          pendingDeleteId = id;
          renderProfileList();
        }
      });
    });

    // Confirm/cancel delete buttons
    document.getElementById('btn-confirm-delete')?.addEventListener('click', () => {
      if (pendingDeleteId) {
        vscode.postMessage({ command: 'deleteProfile', profileId: pendingDeleteId });
        pendingDeleteId = null;
      }
    });
    document.getElementById('btn-cancel-delete')?.addEventListener('click', () => {
      pendingDeleteId = null;
      renderProfileList();
    });
  }

  function createEmptyProfile() {
    return {
      id: generateId(),
      name: '',
      groups: [
        {
          split: false,
          terminals: [{ name: '', commands: [''], icon: '', color: '' }],
        },
      ],
    };
  }

  function renderEditor() {
    const app = document.getElementById('app');
    const p = editingProfile;

    let groupsHtml = p.groups.map((group, gi) => {
      function renderTerminalCard(term, ti, label) {
        return `
          <div class="terminal-card">
            <div class="terminal-card-header">
              <strong>${escapeHtml(label)}</strong>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Name</label>
                <input type="text" data-field="terminal-name" data-gi="${gi}" data-ti="${ti}"
                       value="${escapeHtml(term.name)}" placeholder="e.g. Dev Server" />
              </div>
              <div class="form-group">
                <label>Icon</label>
                <select data-field="terminal-icon" data-gi="${gi}" data-ti="${ti}">
                  ${ICON_OPTIONS.map(o =>
                    `<option value="${o.value}" ${term.icon === o.value ? 'selected' : ''}>${o.label}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Color</label>
                <select data-field="terminal-color" data-gi="${gi}" data-ti="${ti}">
                  ${COLOR_OPTIONS.map(o =>
                    `<option value="${o.value}" ${term.color === o.value ? 'selected' : ''}>${o.label}</option>`
                  ).join('')}
                </select>
              </div>
            </div>
            <div class="form-group" style="margin-top: 8px;">
              <label>Commands (one per line, run in order)</label>
              <textarea data-field="terminal-commands" data-gi="${gi}" data-ti="${ti}"
                        placeholder="npm run dev">${escapeHtml(term.commands.join('\n'))}</textarea>
            </div>
          </div>
        `;
      }

      let terminalsHtml;
      if (group.split) {
        // Split mode: exactly 2 terminals shown side-by-side
        const left = group.terminals[0] || { name: '', commands: [''], icon: '', color: '' };
        const right = group.terminals[1] || { name: '', commands: [''], icon: '', color: '' };
        terminalsHtml = `
          <div class="split-container">
            <div class="split-pane">
              ${renderTerminalCard(left, 0, 'Left Panel')}
            </div>
            <div class="split-divider"></div>
            <div class="split-pane">
              ${renderTerminalCard(right, 1, 'Right Panel')}
            </div>
          </div>
        `;
      } else {
        // Normal mode: single terminal
        const term = group.terminals[0] || { name: '', commands: [''], icon: '', color: '' };
        terminalsHtml = renderTerminalCard(term, 0, 'Terminal');
      }

      return `
        <div class="group-section">
          <div class="group-header">
            <h3>Group ${gi + 1}</h3>
            ${p.groups.length > 1
              ? `<button class="small secondary" data-remove-group="${gi}">Remove Group</button>`
              : ''}
          </div>
          <div class="toggle-row">
            <input type="checkbox" id="split-${gi}" data-field="group-split" data-gi="${gi}"
                   ${group.split ? 'checked' : ''} />
            <label for="split-${gi}">Split terminal (side-by-side)</label>
          </div>
          ${terminalsHtml}
        </div>
      `;
    }).join('');

    app.innerHTML = `
      <h1>${p.name ? 'Edit Profile' : 'New Profile'}</h1>
      <div id="profile-editor">
        <div class="form-group">
          <label>Profile Name</label>
          <input type="text" id="profile-name" value="${escapeHtml(p.name)}" placeholder="e.g. My Dev Setup" />
          <span id="profile-name-error" class="field-error" style="display:none;">Profile name is required</span>
        </div>
        <h2>Terminal Groups</h2>
        ${groupsHtml}
        <button class="secondary" id="btn-add-group">+ Add Terminal Group</button>
        <div class="action-bar">
          <button id="btn-save">Save Profile</button>
          <button class="secondary" id="btn-cancel">Cancel</button>
        </div>
      </div>
    `;

    bindEditorEvents();
  }

  function bindEditorEvents() {

    // Terminal fields
    document.querySelectorAll('[data-field^="terminal-"]').forEach(el => {
      const gi = parseInt(el.getAttribute('data-gi'));
      const ti = parseInt(el.getAttribute('data-ti'));
      const field = el.getAttribute('data-field');
      const event = el.tagName === 'SELECT' ? 'change' : 'input';

      el.addEventListener(event, (e) => {
        const term = editingProfile.groups[gi].terminals[ti];
        if (field === 'terminal-name') {
          term.name = e.target.value;
        } else if (field === 'terminal-icon') {
          term.icon = e.target.value;
        } else if (field === 'terminal-color') {
          term.color = e.target.value;
        } else if (field === 'terminal-commands') {
          term.commands = e.target.value.split('\n');
        }
      });
    });

    // Group split toggles
    document.querySelectorAll('[data-field="group-split"]').forEach(el => {
      const gi = parseInt(el.getAttribute('data-gi'));
      el.addEventListener('change', (e) => {
        const group = editingProfile.groups[gi];
        group.split = e.target.checked;
        if (group.split) {
          // Ensure exactly 2 terminals for split mode
          while (group.terminals.length < 2) {
            group.terminals.push({ name: '', commands: [''], icon: '', color: '' });
          }
          // Trim to 2 if more
          group.terminals = group.terminals.slice(0, 2);
        } else {
          // Collapse to 1 terminal (keep the first)
          group.terminals = group.terminals.slice(0, 1);
        }
        renderEditor();
      });
    });

    // Add group
    document.getElementById('btn-add-group')?.addEventListener('click', () => {
      editingProfile.groups.push({
        split: false,
        terminals: [{ name: '', commands: [''], icon: '', color: '' }],
      });
      renderEditor();
    });

    // Remove group buttons
    document.querySelectorAll('[data-remove-group]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gi = parseInt(e.currentTarget.getAttribute('data-remove-group'));
        editingProfile.groups.splice(gi, 1);
        renderEditor();
      });
    });

    // Clear validation on name input
    document.getElementById('profile-name')?.addEventListener('input', (e) => {
      editingProfile.name = e.target.value;
      const nameInput = e.target;
      const errorEl = document.getElementById('profile-name-error');
      if (nameInput.value.trim()) {
        nameInput.classList.remove('input-error');
        if (errorEl) errorEl.style.display = 'none';
      }
    });

    // Save
    document.getElementById('btn-save')?.addEventListener('click', () => {
      const nameInput = document.getElementById('profile-name');
      const errorEl = document.getElementById('profile-name-error');

      if (!editingProfile.name.trim()) {
        nameInput.classList.add('input-error');
        if (errorEl) errorEl.style.display = 'block';
        nameInput.focus();
        return;
      }

      // Validate at least one group with one terminal
      const hasTerminal = editingProfile.groups.some(g => g.terminals.length > 0);
      if (!hasTerminal) {
        alert('Please add at least one terminal.');
        return;
      }
      vscode.postMessage({ command: 'saveProfile', profile: editingProfile });
    });

    // Cancel
    document.getElementById('btn-cancel')?.addEventListener('click', () => {
      editingProfile = null;
      renderProfileList();
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
})();
