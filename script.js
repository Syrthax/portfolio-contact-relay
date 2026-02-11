// ════════════════════════════════════════════════════════════
//  CONFIGURATION
// ════════════════════════════════════════════════════════════

const CONFIG = {
  CLIENT_ID: "Ov23lisQedgSSSSPkluY",
  REDIRECT_URI: window.location.origin + window.location.pathname,
  OWNER: "Syrthax",
  REPO: "portfolio-contact-relay",
  WORKFLOW: "relay.yml"
};

// ════════════════════════════════════════════════════════════
//  ARCHITECTURE
// ════════════════════════════════════════════════════════════
//
//  Static site — no backend, no PAT in frontend.
//
//  1. User fills form → payload saved to localStorage
//  2. Redirect to GitHub OAuth (scope: read:user)
//  3. GitHub redirects back with ?code=
//  4. Frontend triggers workflow_dispatch with:
//       - oauth_code
//       - name
//       - message
//  5. GitHub Actions workflow:
//       a. Exchanges code → access_token (server-side)
//       b. Fetches GitHub username
//       c. Creates issue with contact details
//
// ════════════════════════════════════════════════════════════

// ── DOM ──
const form = document.getElementById("contactForm");
const submitBtn = document.getElementById("submitBtn");
const nameInput = document.getElementById("name");
const messageInput = document.getElementById("message");

// ════════════════════════════════════════════════════════════
//  TOASTS
// ════════════════════════════════════════════════════════════

function showToast(type, text) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.textContent = text;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("visible"));
  });

  setTimeout(() => {
    toast.classList.remove("visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 4000);
}

// ════════════════════════════════════════════════════════════
//  FORM STATE
// ════════════════════════════════════════════════════════════

function setLoading(on) {
  submitBtn.disabled = on;
  nameInput.disabled = on;
  messageInput.disabled = on;
  submitBtn.querySelector(".btn-text").textContent = on
    ? "Sending\u2026"
    : "Continue with GitHub";
}

// ════════════════════════════════════════════════════════════
//  WORKFLOW DISPATCH
// ════════════════════════════════════════════════════════════

async function triggerWorkflow(code, payload) {
  const url =
    "https://api.github.com/repos/" +
    CONFIG.OWNER + "/" + CONFIG.REPO +
    "/actions/workflows/" + CONFIG.WORKFLOW + "/dispatches";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ref: "main",
      inputs: {
        name: payload.name || "",
        message: payload.message,
        oauth_code: code
      }
    })
  });

  if (!res.ok) {
    throw new Error("Dispatch failed (HTTP " + res.status + ")");
  }
}

// ════════════════════════════════════════════════════════════
//  OAUTH CALLBACK
// ════════════════════════════════════════════════════════════

async function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) return;

  // Clean URL
  history.replaceState(null, "", window.location.pathname);

  const raw = localStorage.getItem("contact_payload");
  if (!raw) {
    showToast("error", "Session expired. Please submit the form again.");
    return;
  }

  const payload = JSON.parse(raw);
  setLoading(true);

  try {
    await triggerWorkflow(code, payload);
    localStorage.removeItem("contact_payload");
    showToast("success", "Message sent successfully");
    submitBtn.querySelector(".btn-text").textContent = "Sent \u2713";
  } catch (err) {
    showToast("error", "Failed to send message. Please try again.");
    setLoading(false);
  }
}

// ════════════════════════════════════════════════════════════
//  FORM SUBMIT
// ════════════════════════════════════════════════════════════

function handleSubmit(e) {
  e.preventDefault();
  if (submitBtn.disabled) return;

  const name = nameInput.value.trim();
  const message = messageInput.value.trim();

  if (!message) {
    showToast("error", "Please enter a message.");
    return;
  }

  localStorage.setItem("contact_payload", JSON.stringify({ name, message }));

  window.location.href =
    "https://github.com/login/oauth/authorize" +
    "?client_id=" + encodeURIComponent(CONFIG.CLIENT_ID) +
    "&scope=read:user" +
    "&redirect_uri=" + encodeURIComponent(CONFIG.REDIRECT_URI);
}

// ════════════════════════════════════════════════════════════
//  THEME
// ════════════════════════════════════════════════════════════

const root = document.documentElement;
const themeBtn = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

const SUN =
  '<circle cx="12" cy="12" r="5"/>' +
  '<line x1="12" y1="1" x2="12" y2="3"/>' +
  '<line x1="12" y1="21" x2="12" y2="23"/>' +
  '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>' +
  '<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>' +
  '<line x1="1" y1="12" x2="3" y2="12"/>' +
  '<line x1="21" y1="12" x2="23" y2="12"/>' +
  '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>' +
  '<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';

const MOON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(t) {
  root.setAttribute("data-theme", t);
  themeIcon.innerHTML = t === "dark" ? MOON : SUN;
}

applyTheme(localStorage.getItem("theme") || systemTheme());

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) applyTheme(e.matches ? "dark" : "light");
  });

themeBtn.addEventListener("click", () => {
  const next = (root.getAttribute("data-theme") || systemTheme()) === "dark"
    ? "light"
    : "dark";
  localStorage.setItem("theme", next);
  applyTheme(next);
});

// ════════════════════════════════════════════════════════════
//  DOCK AUTO-HIDE
// ════════════════════════════════════════════════════════════

const dock = document.getElementById("dock");
let lastY = window.scrollY;
let ticking = false;

window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y - lastY > 12) dock.classList.add("hidden");
        else if (lastY - y > 4) dock.classList.remove("hidden");
        lastY = y;
        ticking = false;
      });
      ticking = true;
    }
  },
  { passive: true }
);

// ════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════

form.addEventListener("submit", handleSubmit);
handleCallback();
