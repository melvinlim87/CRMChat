(function () {
  // Resolve where this script was served from (our app origin).
  var cs =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script");
      for (var i = 0; i < s.length; i++) if ((s[i].src || "").indexOf("widget.js") > -1) return s[i];
      return null;
    })();
  if (!cs) return;
  var origin = new URL(cs.src).origin;
  var color = cs.getAttribute("data-color") || "#cda14a";
  var widgetKey = cs.getAttribute("data-widget") || "public";
  var theme = cs.getAttribute("data-theme") || "light";
  // Inline mode: render the chat inside a container on the page instead of a
  // floating bubble. data-inline = a CSS selector for the target element.
  var inlineSelector = cs.getAttribute("data-inline");
  // Height for inline mode: a number (px), a CSS value ("600px", "80vh"), or
  // "100%"/"fill" to fill the parent (the parent must have its own height).
  var height = cs.getAttribute("data-height") || "600px";
  if (/^\d+$/.test(height)) height += "px";
  if (height === "fill") height = "100%";

  var src = origin + "/widget?w=" + encodeURIComponent(widgetKey) + "&theme=" + encodeURIComponent(theme);

  // --- Inline embed: fills a container (e.g. your "AI Assistant" panel) -------
  if (inlineSelector) {
    var mount = document.querySelector(inlineSelector);
    if (!mount) {
      console.warn("[widget] inline target not found:", inlineSelector);
      return;
    }
    // If filling the parent, make sure the mount actually stretches.
    if (height === "100%") {
      mount.style.height = mount.style.height || "100%";
      mount.style.minHeight = mount.style.minHeight || "480px";
    }
    var inlineFrame = document.createElement("iframe");
    inlineFrame.src = src;
    inlineFrame.title = "AI Assistant";
    inlineFrame.style.cssText =
      "width:100%;height:" + height + ";min-height:480px;border:0;border-radius:16px;background:transparent;display:block;";
    mount.appendChild(inlineFrame);
    return;
  }

  // --- Floating launcher bubble ----------------------------------------------
  if (window.__crmchatWidgetLoaded) return;
  window.__crmchatWidgetLoaded = true;

  var btn = document.createElement("button");
  btn.setAttribute("aria-label", "Open chat");
  btn.innerHTML = "💬";
  btn.style.cssText =
    "position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:9999px;border:0;" +
    "background:" + color + ";color:#fff;font-size:24px;cursor:pointer;z-index:2147483000;" +
    "box-shadow:0 8px 24px rgba(0,0,0,.25);transition:transform .15s;";
  btn.onmouseenter = function () { btn.style.transform = "scale(1.06)"; };
  btn.onmouseleave = function () { btn.style.transform = "scale(1)"; };

  var frame = document.createElement("iframe");
  frame.src = src;
  frame.title = "Chat";
  frame.style.cssText =
    "position:fixed;bottom:88px;right:20px;width:380px;max-width:calc(100vw - 32px);height:560px;" +
    "max-height:calc(100vh - 120px);border:0;border-radius:16px;z-index:2147483000;display:none;" +
    "box-shadow:0 12px 48px rgba(0,0,0,.3);background:#fff;";

  // Unread dot on the bubble (shown until first open).
  var dot = document.createElement("span");
  dot.style.cssText =
    "position:fixed;bottom:62px;right:22px;width:12px;height:12px;border-radius:9999px;background:#ef4444;" +
    "border:2px solid #fff;z-index:2147483001;display:none;";

  // Proactive greeting bubble.
  var greetText = cs.getAttribute("data-greeting") || "👋 Need help? Chat with us!";
  var greetDelay = parseInt(cs.getAttribute("data-greeting-delay") || "6000", 10);
  var greet = document.createElement("div");
  greet.style.cssText =
    "position:fixed;bottom:84px;right:20px;max-width:240px;background:#fff;color:#0f172a;padding:10px 30px 10px 12px;" +
    "border-radius:14px;font:14px/1.35 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.18);" +
    "z-index:2147483000;display:none;cursor:pointer;";
  greet.textContent = greetText;
  var greetClose = document.createElement("span");
  greetClose.textContent = "✕";
  greetClose.style.cssText = "position:absolute;top:6px;right:8px;color:#94a3b8;font-size:12px;cursor:pointer;";
  greet.appendChild(greetClose);

  var open = false;
  var greeted = false;
  function toggle() {
    open = !open;
    frame.style.display = open ? "block" : "none";
    btn.innerHTML = open ? "✕" : "💬";
    dot.style.display = "none";
    greet.style.display = "none";
  }
  btn.onclick = toggle;
  greet.onclick = function (e) { if (e.target !== greetClose) toggle(); };
  greetClose.onclick = function (e) { e.stopPropagation(); greet.style.display = "none"; };

  // After a delay, nudge the visitor (once) if they haven't opened the chat.
  if (greetDelay >= 0) {
    setTimeout(function () {
      if (!open && !greeted) {
        greeted = true;
        dot.style.display = "block";
        greet.style.display = "block";
      }
    }, greetDelay);
  }

  document.body.appendChild(frame);
  document.body.appendChild(greet);
  document.body.appendChild(btn);
  document.body.appendChild(dot);
})();
