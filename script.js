// ════════════════════════════════════════════════════════════
//  TOAST SYSTEM
// ════════════════════════════════════════════════════════════

function toast(type, text) {
  var t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = text;
  document.getElementById("toasts").appendChild(t);
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      t.classList.add("show");
    });
  });
  setTimeout(function () {
    t.classList.remove("show");
    t.addEventListener("transitionend", function () { t.remove(); }, { once: true });
  }, 4000);
}

// ════════════════════════════════════════════════════════════
//  TURNSTILE CALLBACK
// ════════════════════════════════════════════════════════════

var verified = false;

function onTurnstileSuccess() {
  verified = true;
  var btn = document.getElementById("submitBtn");
  btn.disabled = false;
  btn.classList.add("enabled");
  toast("ok", "Verification successful. You can now send your message.");
}

// Expose globally for Turnstile
window.onTurnstileSuccess = onTurnstileSuccess;

// ════════════════════════════════════════════════════════════
//  FORM SUBMIT
// ════════════════════════════════════════════════════════════

var form = document.getElementById("form");
var btn = document.getElementById("submitBtn");
var nameIn = document.getElementById("name");
var msgIn = document.getElementById("message");

form.addEventListener("submit", function (e) {
  e.preventDefault();

  if (!verified) {
    toast("err", "Please verify you\u2019re human first.");
    return;
  }

  var name = nameIn.value.trim();
  var message = msgIn.value.trim();

  if (!name || !message) {
    toast("err", "Please fill in all required fields.");
    return;
  }

  // Obfuscated email construction
  var u = "Sarthak";
  var d = "sarthakg.tech";
  var addr = u + "@" + d;

  var subject = encodeURIComponent("Portfolio Contact");
  var body = encodeURIComponent("Name: " + name + "\n\nMessage:\n" + message);

  window.location.href = "mailto:" + addr + "?subject=" + subject + "&body=" + body;
});

// Catch clicks on the disabled button
btn.addEventListener("click", function () {
  if (!verified) {
    toast("err", "Please verify you\u2019re human first.");
  }
});

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

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
  if (!localStorage.getItem("theme")) applyTheme(e.matches ? "dark" : "light");
});

themeBtn.addEventListener("click", function () {
  var next = (root.getAttribute("data-theme") || systemTheme()) === "dark" ? "light" : "dark";
  localStorage.setItem("theme", next);
  applyTheme(next);
});

// ════════════════════════════════════════════════════════════
//  DOCK AUTO-HIDE
// ════════════════════════════════════════════════════════════

var dock = document.getElementById("dock");
var lastY = window.scrollY;
var ticking = false;

window.addEventListener("scroll", function () {
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
}, { passive: true });
