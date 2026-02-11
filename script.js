// ════════════════════════════════════════════════════════════
//  CONFIGURATION
// ════════════════════════════════════════════════════════════

const WORKER_URL = "YOUR_WORKER_URL";

// ════════════════════════════════════════════════════════════
//  DOM
// ════════════════════════════════════════════════════════════

const form = document.getElementById("contactForm");
const submitBtn = document.getElementById("submitBtn");
const nameInput = document.getElementById("name");
const messageInput = document.getElementById("message");

// ════════════════════════════════════════════════════════════
//  TOASTS
// ════════════════════════════════════════════════════════════

function showToast(type, text) {
  var container = document.getElementById("toastContainer");
  var toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.textContent = text;
  container.appendChild(toast);

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      toast.classList.add("visible");
    });
  });

  setTimeout(function () {
    toast.classList.remove("visible");
    toast.addEventListener("transitionend", function () { toast.remove(); }, { once: true });
  }, 4000);
}

// ════════════════════════════════════════════════════════════
//  WARNING MODAL
// ════════════════════════════════════════════════════════════

function showWarningModal() {
  return new Promise(function (resolve) {
    if (localStorage.getItem("modal_accepted") === "true") {
      resolve(true);
      return;
    }

    var overlay = document.getElementById("warningModal");
    var acceptBtn = document.getElementById("modalAccept");
    var cancelBtn = document.getElementById("modalCancel");

    overlay.classList.add("visible");

    function cleanup() {
      overlay.classList.remove("visible");
      acceptBtn.removeEventListener("click", onAccept);
      cancelBtn.removeEventListener("click", onCancel);
    }

    function onAccept() {
      localStorage.setItem("modal_accepted", "true");
      cleanup();
      resolve(true);
    }

    function onCancel() {
      cleanup();
      resolve(false);
    }

    acceptBtn.addEventListener("click", onAccept);
    cancelBtn.addEventListener("click", onCancel);
  });
}

// ════════════════════════════════════════════════════════════
//  FORM STATE
// ════════════════════════════════════════════════════════════

function setLoading(on) {
  submitBtn.disabled = on;
  nameInput.disabled = on;
  messageInput.disabled = on;
  submitBtn.textContent = on ? "Sending\u2026" : "Send Message";
}

// ════════════════════════════════════════════════════════════
//  SUBMIT
// ════════════════════════════════════════════════════════════

async function handleSubmit(e) {
  e.preventDefault();
  if (submitBtn.disabled) return;

  var name = nameInput.value.trim();
  var message = messageInput.value.trim();

  if (!message) {
    showToast("error", "Please enter a message.");
    return;
  }

  // Get Turnstile token
  var token = document.querySelector('[name="cf-turnstile-response"]');
  var turnstileToken = token ? token.value : "";

  if (!turnstileToken) {
    showToast("error", "Please complete the verification.");
    return;
  }

  // Show warning modal on first use
  var accepted = await showWarningModal();
  if (!accepted) return;

  setLoading(true);

  try {
    var res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        message: message,
        token: turnstileToken
      })
    });

    var data = await res.json();

    if (data.success) {
      showToast("success", "Message sent successfully.");
      form.reset();
      // Reset Turnstile widget
      if (window.turnstile) turnstile.reset();
      submitBtn.textContent = "Sent \u2713";
      setTimeout(function () {
        submitBtn.textContent = "Send Message";
        submitBtn.disabled = false;
      }, 3000);
    } else {
      showToast("error", data.error || "Something went wrong.");
      setLoading(false);
    }
  } catch (err) {
    showToast("error", "Something went wrong.");
    setLoading(false);
  }
}

form.addEventListener("submit", handleSubmit);

// ════════════════════════════════════════════════════════════
//  THEME
// ════════════════════════════════════════════════════════════

var root = document.documentElement;
var themeBtn = document.getElementById("themeToggle");
var themeIcon = document.getElementById("themeIcon");

var SUN =
  '<circle cx="12" cy="12" r="5"/>' +
  '<line x1="12" y1="1" x2="12" y2="3"/>' +
  '<line x1="12" y1="21" x2="12" y2="23"/>' +
  '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>' +
  '<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>' +
  '<line x1="1" y1="12" x2="3" y2="12"/>' +
  '<line x1="21" y1="12" x2="23" y2="12"/>' +
  '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>' +
  '<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';

var MOON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

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
  .addEventListener("change", function (e) {
    if (!localStorage.getItem("theme")) applyTheme(e.matches ? "dark" : "light");
  });

themeBtn.addEventListener("click", function () {
  var next = (root.getAttribute("data-theme") || systemTheme()) === "dark"
    ? "light"
    : "dark";
  localStorage.setItem("theme", next);
  applyTheme(next);
});

// ════════════════════════════════════════════════════════════
//  DOCK AUTO-HIDE
// ════════════════════════════════════════════════════════════

var dock = document.getElementById("dock");
var lastY = window.scrollY;
var ticking = false;

window.addEventListener(
  "scroll",
  function () {
    if (!ticking) {
      requestAnimationFrame(function () {
        var y = window.scrollY;
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
