// @ts-nocheck
(function () {
  const vscode = acquireVsCodeApi();

  let profiles = [];
  let editingProfile = null; // null = list view, object = editing
  let pendingDeleteId = null; // track delete confirmation

  // Icons available for terminals (with emoji previews)
  const ICON_OPTIONS = [
    { value: '', label: 'Default', emoji: '' },
    // Developer essentials
    { value: 'terminal', label: 'Terminal', emoji: '\uD83D\uDCBB' },
    { value: 'code', label: 'Code', emoji: '\uD83D\uDCDD' },
    { value: 'file-code', label: 'File Code', emoji: '\uD83D\uDCC4' },
    { value: 'symbol-namespace', label: 'Namespace', emoji: '\uD83D\uDCE6' },
    { value: 'package', label: 'Package', emoji: '\uD83D\uDCE6' },
    // Infrastructure
    { value: 'server', label: 'Server', emoji: '\uD83D\uDDA5\uFE0F' },
    { value: 'database', label: 'Database', emoji: '\uD83D\uDDC4\uFE0F' },
    { value: 'cloud', label: 'Cloud', emoji: '\u2601\uFE0F' },
    { value: 'globe', label: 'Globe', emoji: '\uD83C\uDF10' },
    { value: 'vm', label: 'Container', emoji: '\uD83D\uDCE5' },
    // Testing & debugging
    { value: 'bug', label: 'Bug', emoji: '\uD83D\uDC1B' },
    { value: 'beaker', label: 'Test', emoji: '\uD83E\uDDEA' },
    { value: 'debug-console', label: 'Debug', emoji: '\uD83D\uDD0D' },
    { value: 'debug-alt', label: 'Debug Alt', emoji: '\uD83D\uDEE0\uFE0F' },
    { value: 'checklist', label: 'Checklist', emoji: '\u2705' },
    // Actions
    { value: 'play', label: 'Run', emoji: '\u25B6\uFE0F' },
    { value: 'rocket', label: 'Deploy', emoji: '\uD83D\uDE80' },
    { value: 'flame', label: 'Flame', emoji: '\uD83D\uDD25' },
    { value: 'zap', label: 'Zap', emoji: '\u26A1' },
    { value: 'sync', label: 'Sync', emoji: '\uD83D\uDD04' },
    // Tools
    { value: 'gear', label: 'Gear', emoji: '\u2699\uFE0F' },
    { value: 'tools', label: 'Tools', emoji: '\uD83D\uDD27' },
    { value: 'wrench', label: 'Wrench', emoji: '\uD83D\uDD29' },
    { value: 'key', label: 'Key', emoji: '\uD83D\uDD11' },
    { value: 'lock', label: 'Lock', emoji: '\uD83D\uDD12' },
    { value: 'shield', label: 'Shield', emoji: '\uD83D\uDEE1\uFE0F' },
    // Misc
    { value: 'star', label: 'Star', emoji: '\u2B50' },
    { value: 'heart', label: 'Heart', emoji: '\u2764\uFE0F' },
    { value: 'eye', label: 'Watch', emoji: '\uD83D\uDC41\uFE0F' },
    { value: 'bookmark', label: 'Bookmark', emoji: '\uD83D\uDD16' },
    { value: 'tag', label: 'Tag', emoji: '\uD83C\uDFF7\uFE0F' },
    { value: 'coffee', label: 'Coffee', emoji: '\u2615' },
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
          splitCount: 1,
          terminals: [{ name: '', commands: [''], icon: '', color: '' }],
        },
      ],
    };
  }

  function renderEditor() {
    const app = document.getElementById('app');
    const p = editingProfile;

    let groupsHtml = p.groups.map((group, gi) => {
      function renderTerminalCard(term, ti, label, showRemove) {
        return `
          <div class="terminal-card">
            <div class="terminal-card-header">
              <strong>${escapeHtml(label)}</strong>
              ${showRemove ? `<button class="small secondary" data-remove-split="${gi}-${ti}" title="Remove this panel">\u00D7</button>` : ''}
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
                    `<option value="${o.value}" ${term.icon === o.value ? 'selected' : ''}>${o.emoji ? o.emoji + ' ' : ''}${o.label}</option>`
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

      const count = group.splitCount || 1;
      const panelLabels = ['Left', 'Center Left', 'Center Right', 'Right'];
      let terminalsHtml;

      if (count === 1) {
        const term = group.terminals[0] || { name: '', commands: [''], icon: '', color: '' };
        terminalsHtml = renderTerminalCard(term, 0, 'Terminal', false);
      } else {
        // Build N panes side-by-side
        let panes = '';
        for (let ti = 0; ti < count; ti++) {
          const term = group.terminals[ti] || { name: '', commands: [''], icon: '', color: '' };
          let label;
          if (count === 2) {
            label = ti === 0 ? 'Left Panel' : 'Right Panel';
          } else if (count === 3) {
            label = ['Left', 'Center', 'Right'][ti] + ' Panel';
          } else {
            label = panelLabels[ti] + ' Panel';
          }
          if (ti > 0) panes += '<div class="split-divider"></div>';
          panes += `<div class="split-pane">${renderTerminalCard(term, ti, label, count > 1)}</div>`;
        }
        terminalsHtml = `<div class="split-container split-${count}">${panes}</div>`;
      }

      const splitOptions = [1, 2, 3, 4].map(n =>
        `<option value="${n}" ${count === n ? 'selected' : ''}>${n === 1 ? 'No split (single terminal)' : n + ' panels side-by-side'}</option>`
      ).join('');

      return `
        <div class="group-section">
          <div class="group-header">
            <h3>Group ${gi + 1}</h3>
            ${p.groups.length > 1
              ? `<button class="small secondary" data-remove-group="${gi}">Remove Group</button>`
              : ''}
          </div>
          <div class="form-group split-select-row">
            <label>Terminal Layout</label>
            <select data-field="group-split" data-gi="${gi}">${splitOptions}</select>
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

    // Remove split pane buttons
    document.querySelectorAll('[data-remove-split]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const [gi, ti] = e.currentTarget.getAttribute('data-remove-split').split('-').map(Number);
        const group = editingProfile.groups[gi];
        group.terminals.splice(ti, 1);
        group.splitCount = Math.max(1, group.splitCount - 1);
        renderEditor();
      });
    });

    // Group split count dropdown
    document.querySelectorAll('[data-field="group-split"]').forEach(el => {
      const gi = parseInt(el.getAttribute('data-gi'));
      el.addEventListener('change', (e) => {
        const group = editingProfile.groups[gi];
        const newCount = parseInt(e.target.value);
        group.splitCount = newCount;
        // Adjust terminals array to match new count
        while (group.terminals.length < newCount) {
          group.terminals.push({ name: '', commands: [''], icon: '', color: '' });
        }
        group.terminals = group.terminals.slice(0, newCount);
        renderEditor();
      });
    });

    // Add group
    document.getElementById('btn-add-group')?.addEventListener('click', () => {
      editingProfile.groups.push({
        splitCount: 1,
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
