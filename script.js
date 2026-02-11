// ════════════════════════════════════════════════════════════
//  CONFIGURATION
// ════════════════════════════════════════════════════════════

const CONFIG = {
  CLIENT_ID: "Ov23lisQedgSSSSPkluY",
  REDIRECT_URI: window.location.origin + window.location.pathname,
  OWNER: "Syrthax",
  REPO: "portfolio-contact-relay",
  // Fine-grained PAT with ONLY Contents:write permission on this repo.
  // This token can ONLY trigger repository_dispatch — it cannot read code,
  // manage issues, or access any other repo. Safe to embed in public frontend.
  RELAY_TOKEN: "REPLACE_WITH_RELAY_PAT"
};

// ════════════════════════════════════════════════════════════
//  ARCHITECTURE NOTE
// ════════════════════════════════════════════════════════════
//
//  Static site (GitHub Pages) — no backend available.
//
//  Flow:
//  1. User fills form → payload saved to localStorage
//  2. Redirect to GitHub OAuth (scope: read:user only)
//  3. GitHub redirects back with ?code=
//  4. Frontend sends code + payload via repository_dispatch
//     using a fine-grained RELAY_TOKEN (PAT)
//  5. GitHub Actions workflow receives the dispatch:
//     a. Exchanges code → access_token (server-side, with client_secret)
//     b. Fetches GitHub username from token
//     c. Creates issue with sender info + message
//
//  Token exchange happens ONLY in the workflow (server-side).
//  No CORS issues. No client_secret in frontend.
//
// ════════════════════════════════════════════════════════════

// ── DOM References ──
const form = document.getElementById('contactForm');
const submitBtn = form.querySelector('button[type="submit"]');
const nameInput = document.getElementById('name');
const messageInput = document.getElementById('message');

// ════════════════════════════════════════════════════════════
//  TOAST NOTIFICATION SYSTEM
// ════════════════════════════════════════════════════════════

function showToast(type, message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger entrance animation on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('visible'));
  });

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    toast.classList.remove('visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 4000);

  console.log(`[Toast] ${type}: ${message}`);
}

// ════════════════════════════════════════════════════════════
//  WARNING MODAL
// ════════════════════════════════════════════════════════════

function showWarningModal() {
  return new Promise((resolve) => {
    // Skip if user already accepted previously
    if (localStorage.getItem('modal_accepted') === 'true') {
      resolve(true);
      return;
    }

    const overlay = document.getElementById('warningModal');
    const acceptBtn = document.getElementById('modalAccept');
    const cancelBtn = document.getElementById('modalCancel');

    overlay.classList.add('visible');

    function cleanup() {
      overlay.classList.remove('visible');
      acceptBtn.removeEventListener('click', onAccept);
      cancelBtn.removeEventListener('click', onCancel);
    }

    function onAccept() {
      localStorage.setItem('modal_accepted', 'true');
      cleanup();
      resolve(true);
    }

    function onCancel() {
      cleanup();
      resolve(false);
    }

    acceptBtn.addEventListener('click', onAccept);
    cancelBtn.addEventListener('click', onCancel);
  });
}

// ════════════════════════════════════════════════════════════
//  FORM STATE HELPERS
// ════════════════════════════════════════════════════════════

function setFormLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.textContent = loading ? 'Sending…' : 'Continue with GitHub';
  nameInput.disabled = loading;
  messageInput.disabled = loading;
}

// ════════════════════════════════════════════════════════════
//  SEND REPOSITORY DISPATCH
// ════════════════════════════════════════════════════════════
//
//  Sends the OAuth code + form payload to the repo via
//  repository_dispatch. The GitHub Actions workflow handles
//  code-to-token exchange server-side using secrets.

async function sendDispatch(code, payload) {
  console.log('[Dispatch] Sending repository_dispatch…');

  const url = `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/dispatches`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.RELAY_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      event_type: 'contact_message',
      client_payload: {
        code: code,
        name: payload.name || '',
        message: payload.message
      }
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error('[Dispatch] Failed:', errBody);
    throw new Error(`Repository dispatch failed (HTTP ${response.status})`);
  }

  console.log('[Dispatch] Triggered successfully (HTTP 204)');
}

// ════════════════════════════════════════════════════════════
//  HANDLE OAUTH CALLBACK
// ════════════════════════════════════════════════════════════

async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  if (!code) return;

  console.log('[Callback] OAuth code detected, processing…');

  // Clean URL immediately
  history.replaceState(null, '', window.location.pathname);

  // Retrieve stored payload
  const raw = localStorage.getItem('contact_payload');
  if (!raw) {
    showToast('error', 'Session expired. Please submit the form again.');
    return;
  }

  const payload = JSON.parse(raw);
  setFormLoading(true);

  try {
    // Send code + payload to GitHub Actions via repository_dispatch
    await sendDispatch(code, payload);

    // Success — clean up
    localStorage.removeItem('contact_payload');
    showToast('success', 'Message sent! You'll receive a confirmation issue shortly.');
    submitBtn.textContent = 'Sent ✓';
    console.log('[Callback] Complete — dispatch sent');

  } catch (err) {
    console.error('[Callback] Error:', err.message);
    showToast('error', 'Failed to send message. Please try again.');
    setFormLoading(false);
  }
}

// ════════════════════════════════════════════════════════════
//  FORM SUBMIT HANDLER
// ════════════════════════════════════════════════════════════

async function handleSubmit(e) {
  e.preventDefault();

  // Prevent double submission
  if (submitBtn.disabled) return;

  const name = nameInput.value.trim();
  const message = messageInput.value.trim();

  if (!message) {
    showToast('error', 'Please enter a message.');
    return;
  }

  // Show warning modal on first use
  const accepted = await showWarningModal();
  if (!accepted) {
    console.log('[Form] User declined the warning');
    return;
  }

  // Store payload for after OAuth redirect
  localStorage.setItem('contact_payload', JSON.stringify({ name, message }));
  console.log('[Form] Payload stored, redirecting to GitHub OAuth…');

  // Redirect to GitHub OAuth — only need read:user scope now
  window.location.href =
    'https://github.com/login/oauth/authorize' +
    '?client_id=' + encodeURIComponent(CONFIG.CLIENT_ID) +
    '&scope=read:user' +
    '&redirect_uri=' + encodeURIComponent(CONFIG.REDIRECT_URI);
}

// ════════════════════════════════════════════════════════════
//  INITIALIZE
// ════════════════════════════════════════════════════════════

async function init() {
  console.log('[Init] Contact relay loaded');
  form.addEventListener('submit', handleSubmit);
  await handleOAuthCallback();
}

init();

// ════════════════════════════════════════════════════════════
//  THEME TOGGLE (unchanged)
// ════════════════════════════════════════════════════════════

const root = document.documentElement;
const themeBtn = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

const sunSVG = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
const moonSVG = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  themeIcon.innerHTML = theme === 'dark' ? moonSVG : sunSVG;
}

const saved = localStorage.getItem('theme');
applyTheme(saved || getSystemTheme());

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
  if (!localStorage.getItem('theme')) applyTheme(e.matches ? 'dark' : 'light');
});

themeBtn.addEventListener('click', function () {
  const current = root.getAttribute('data-theme') || getSystemTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
});

// ════════════════════════════════════════════════════════════
//  DOCK AUTO-HIDE (unchanged)
// ════════════════════════════════════════════════════════════

const dock = document.getElementById('dock');
let lastScrollY = window.scrollY;
let ticking = false;

window.addEventListener('scroll', function () {
  if (!ticking) {
    window.requestAnimationFrame(function () {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY;

      if (delta > 12) {
        dock.classList.add('hidden');
      } else if (delta < -4) {
        dock.classList.remove('hidden');
      }

      lastScrollY = currentY;
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });