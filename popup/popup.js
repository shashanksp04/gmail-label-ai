document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const aiStatusEl = document.getElementById('aiStatus');
  const authBtn = document.getElementById('authBtn');
  const scanBtn = document.getElementById('scanBtn');
  const mappingsSection = document.getElementById('mappingsSection');
  const mappingsList = document.getElementById('mappingsList');
  const clearMappingsBtn = document.getElementById('clearMappingsBtn');

  // Check Chrome built-in AI availability (popup runs in document context)
  async function checkAIStatus() {
    try {
      if (typeof LanguageModel === 'undefined') {
        aiStatusEl.textContent = 'AI: Not available (Chrome 138+ required)';
        return;
      }
      const availability = await LanguageModel.availability?.({ expectedOutputs: [{ type: 'text', languages: ['en'] }] });
      if (['readily', 'available'].includes(availability)) {
        aiStatusEl.textContent = 'AI: Ready';
      } else if (['after-download', 'downloadable'].includes(availability)) {
        aiStatusEl.textContent = 'AI: Available after model download';
      } else if (availability === 'downloading') {
        aiStatusEl.textContent = 'AI: Downloading model...';
      } else if (availability === 'no-model' || availability === 'unavailable') {
        aiStatusEl.textContent = 'AI: Not available';
      } else {
        aiStatusEl.textContent = 'AI: ' + (availability || 'Unknown');
      }
    } catch (e) {
      aiStatusEl.textContent = 'AI: Unavailable';
    }
  }

  async function updateStatus() {
    const { status } = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    statusEl.className = `status ${status}`;
    if (status === 'authenticated') {
      statusEl.textContent = 'Connected to Gmail';
      authBtn.style.display = 'none';
      scanBtn.style.display = 'block';
      mappingsSection.style.display = 'block';
      await loadMappings();
    } else if (status === 'needs_auth') {
      statusEl.textContent = 'Sign in to get started';
      authBtn.style.display = 'block';
      scanBtn.style.display = 'none';
      mappingsSection.style.display = 'none';
    } else {
      statusEl.textContent = 'Sign in to get started';
      statusEl.className = 'status needs_auth';
      authBtn.style.display = 'block';
      scanBtn.style.display = 'none';
      mappingsSection.style.display = 'none';
    }
  }

  async function loadMappings() {
    try {
      const { mappings } = await chrome.runtime.sendMessage({ type: 'GET_MAPPINGS' });
      if (!mappings?.length) {
        mappingsList.innerHTML = '<div class="empty-mappings">No sender mappings yet</div>';
        return;
      }
      mappingsList.innerHTML = mappings
        .map(
          (m) => `
        <div class="mapping-item" data-domain="${m.domain}">
          <span><span class="label-name">${escapeHtml(m.labelName)}</span> ← ${escapeHtml(m.domain)}</span>
          <button class="secondary" data-domain="${m.domain}">Remove</button>
        </div>
      `
        )
        .join('');
      mappingsList.querySelectorAll('button[data-domain]').forEach((btn) => {
        btn.addEventListener('click', () => removeMapping(btn.dataset.domain));
      });
    } catch (err) {
      mappingsList.innerHTML = '<div class="empty-mappings">Failed to load</div>';
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function removeMapping(domain) {
    try {
      await chrome.runtime.sendMessage({ type: 'REMOVE_MAPPING', domain });
      await loadMappings();
    } catch (err) {
      console.error('Remove mapping failed:', err);
    }
  }

  authBtn.addEventListener('click', async () => {
    authBtn.disabled = true;
    authBtn.textContent = 'Signing in...';
    try {
      const res = await chrome.runtime.sendMessage({ type: 'AUTH_REQUEST' });
      if (res?.ok) {
        await updateStatus();
      } else {
        statusEl.textContent = 'Sign-in failed. Try again.';
        statusEl.className = 'status needs_auth';
      }
    } catch (err) {
      statusEl.textContent = 'Error: ' + (err.message || 'Unknown');
    }
    authBtn.disabled = false;
    authBtn.textContent = 'Sign in to Gmail';
  });

  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    scanBtn.textContent = 'Scanning...';
    try {
      await chrome.runtime.sendMessage({ type: 'SCAN_NOW' });
      scanBtn.textContent = 'Done!';
      setTimeout(() => {
        scanBtn.textContent = 'Scan Now';
        scanBtn.disabled = false;
      }, 1500);
    } catch (err) {
      scanBtn.textContent = 'Scan Now';
      scanBtn.disabled = false;
    }
  });

  clearMappingsBtn.addEventListener('click', async () => {
    if (!confirm('Clear all sender mappings? This cannot be undone.')) return;
    try {
      await chrome.runtime.sendMessage({ type: 'CLEAR_MAPPINGS' });
      await loadMappings();
    } catch (err) {
      console.error('Clear mappings failed:', err);
    }
  });

  await checkAIStatus();
  await updateStatus();
});
