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

  if (window.__crmchatWidgetLoaded) return;
  window.__crmchatWidgetLoaded = true;

  // Floating launcher button
  var btn = document.createElement("button");
  btn.setAttribute("aria-label", "Open chat");
  btn.innerHTML = "💬";
  btn.style.cssText =
    "position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:9999px;border:0;" +
    "background:" + color + ";color:#fff;font-size:24px;cursor:pointer;z-index:2147483000;" +
    "box-shadow:0 8px 24px rgba(0,0,0,.25);transition:transform .15s;";
  btn.onmouseenter = function () { btn.style.transform = "scale(1.06)"; };
  btn.onmouseleave = function () { btn.style.transform = "scale(1)"; };

  // Chat panel iframe
  var frame = document.createElement("iframe");
  frame.src = origin + "/widget";
  frame.title = "Chat";
  frame.style.cssText =
    "position:fixed;bottom:88px;right:20px;width:380px;max-width:calc(100vw - 32px);height:560px;" +
    "max-height:calc(100vh - 120px);border:0;border-radius:16px;z-index:2147483000;display:none;" +
    "box-shadow:0 12px 48px rgba(0,0,0,.3);background:#fff;";

  var open = false;
  function toggle() {
    open = !open;
    frame.style.display = open ? "block" : "none";
    btn.innerHTML = open ? "✕" : "💬";
  }
  btn.onclick = toggle;

  document.body.appendChild(frame);
  document.body.appendChild(btn);
})();
