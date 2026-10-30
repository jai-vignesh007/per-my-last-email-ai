// Per My Last Email: translation logic and page behaviour.
(function () {
  "use strict";
  const { DECODE, CORP, LDECODE, LPOST, L_OPENERS, L_TOPICS, L_CLOSERS, L_TAGS, OPENERS, CLOSERS, SAMPLES } = window;

  // ---------- Helpers ----------
  const norm = s => s.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ");
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escHtml = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function build(list) {
    const map = new Map();
    list.forEach(([k, v]) => map.set(norm(k), v));
    const keys = [...map.keys()].sort((a, b) => b.length - a.length);
    const alt = keys.map(k => escRe(k).replace(/'/g, "['’‘]").replace(/ /g, "\\s+")).join("|");
    return { map, re: new RegExp("(?<![\\w'’])(" + alt + ")(?![\\w'’])", "gi") };
  }
  const DICTS = { decode: build(DECODE), corp: build(CORP), ldecode: build(LDECODE), lpost: build(LPOST) };

  const atSentenceStart = before => /(^|[.!?:\n][^A-Za-z0-9]*)$/.test(before);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function translate(text, mode) {
    const { map, re } = DICTS[mode];
    re.lastIndex = 0;
    let html = "", plain = "", last = 0, count = 0, m;
    while ((m = re.exec(text))) {
      const seg = text.slice(last, m.index);
      html += escHtml(seg); plain += seg;
      const orig = m[0];
      let rep = map.get(norm(orig));
      if (rep === undefined) { html += escHtml(orig); plain += orig; last = m.index + orig.length; continue; }
      if (atSentenceStart(text.slice(0, m.index))) rep = cap(rep);
      html += '<span class="swap"><s>' + escHtml(orig) + "</s><mark>" + escHtml(rep) + "</mark></span>";
      plain += rep; count++;
      last = m.index + orig.length;
    }
    const tail = text.slice(last);
    html += escHtml(tail); plain += tail;
    return { html, plain, count };
  }

  const sampleIdx = { decode: 0, corp: 0, ldecode: 0, lpost: 0 };

  function verdictFor(count, mode) {
    if (mode === "ldecode") {
      if (count === 0) return "No humblebrag detected. Is this even LinkedIn?";
      if (count < 3) return count + " phrases decoded. Light humblebrag, minimal cringe.";
      if (count < 6) return count + " phrases decoded. This post has a ring light.";
      return count + " phrases decoded. Top Voice energy. The algorithm is pleased.";
    }
    if (mode === "lpost") {
      if (count === 0) return "Post-ready. Add more feelings for extra reach.";
      if (count < 3) return "Solid post. Expect 12 likes and one recruiter.";
      return "Viral. Your former classmates are already commenting “So inspiring!”";
    }
    if (mode === "corp") {
      if (count === 0) return "Still dangerously honest. Try words like “problem,” “busy,” or “I forgot.”";
      if (count < 3) return "Corporate-ish. You could survive a quarterly all-hands.";
      if (count < 6) return "Promotion-ready. HR would love this.";
      return "You are now a Senior Vice President of Synergy.";
    }
    if (count === 0) return "No jargon detected. This was written by a real human.";
    if (count < 3) return count + " phrases decoded. Mild middle-management energy.";
    if (count < 6) return count + " phrases decoded. Certified LinkedIn thought leader.";
    return count + " phrases decoded. This email should be reported to HR.";
  }

  // ---------- UI ----------
  const $ = id => document.getElementById(id);
  const input = $("input"), output = $("output"), verdict = $("verdict"), copyBtn = $("copy");
  const LABELS = {
    decode: { input: "Paste the email", output: "What they actually meant", placeholder: "Hope this email finds you well! Just circling back…", empty: "Your translation shows up here as you type." },
    corp: { input: "Say what you really mean", output: "Ready to send to leadership", placeholder: "I forgot to do the report and I’m tired.", empty: "Your corporate version shows up here as you type." },
    ldecode: { input: "Paste the LinkedIn post", output: "What they’re really saying", placeholder: "I’m humbled to announce…", empty: "The honest version shows up here as you type." },
    lpost: { input: "What actually happened?", output: "Ready to post", placeholder: "I got fired today and ate a sandwich.", empty: "Your LinkedIn post shows up here as you type." }
  };
  let lTopic = pick(L_TOPICS), lOpen = pick(L_OPENERS), lClose = pick(L_CLOSERS), lTags = [];
  function shuffleLinkedIn() {
    lTopic = pick(L_TOPICS); lOpen = pick(L_OPENERS); lClose = pick(L_CLOSERS);
    lTags = [...L_TAGS].sort(() => Math.random() - 0.5).slice(0, 3);
  }
  shuffleLinkedIn();

  function renderLinkedIn(text) {
    const parts = (text.match(/[^.!?\n]+[.!?]*/g) || []).map(t => t.trim()).filter(Boolean);
    const lines = parts.map(t => translate(t, "lpost"));
    const count = lines.reduce((n, r) => n + r.count, 0);
    const html = [], plain = [];
    html.push("<mark>" + escHtml(lOpen) + "</mark>"); plain.push(lOpen);
    lines.forEach((r, i) => {
      if (i === lines.length - 1 && lines.length > 1) {
        const lesson = "Here’s what it taught me about " + lTopic + ":";
        html.push("<mark>" + escHtml(lesson) + "</mark>"); plain.push(lesson);
      }
      html.push(r.html); plain.push(r.plain);
    });
    html.push("<mark>" + escHtml(lClose) + "</mark>"); plain.push(lClose);
    const tags = lTags.join(" ");
    html.push("<mark>" + escHtml(tags) + "</mark>"); plain.push(tags);
    return { html: html.join("\n\n"), plain: plain.join("\n\n"), count };
  }
  let mode = "decode", lastPlain = "", opener = pick(OPENERS), closer = pick(CLOSERS);
  const smartBtn = $("smart"), ai = $("ai"), aiText = $("aiText");
  let aiPlain = "", ctl = null;

  function resetAi() {
    if (ctl) { ctl.abort(); ctl = null; }
    ai.classList.remove("on"); aiText.textContent = ""; aiPlain = "";
    smartBtn.textContent = "Smart translation with AI";
    smartBtn.disabled = !input.value.trim();
  }

  async function runSmart() {
    const text = input.value.trim();
    if (!text) return;
    if (ctl) ctl.abort();
    const mine = ctl = new AbortController();
    smartBtn.disabled = true; smartBtn.textContent = "Translating…";
    ai.classList.add("on"); aiText.classList.add("wait"); aiText.textContent = "Thinking…";
    try {
      const r = await fetch("/api/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, text }),
        signal: mine.signal
      });
      let data = {};
      try { data = await r.json(); } catch (e) {}
      if (mine !== ctl) return;
      if (!r.ok || !data.text) throw new Error(data.error || "Smart translation isn’t available here. The highlighted version still works.");
      aiText.classList.remove("wait"); aiText.textContent = data.text; aiPlain = data.text;
      smartBtn.textContent = "Try another take";
    } catch (e) {
      if (mine !== ctl || e.name === "AbortError") return;
      aiText.classList.add("wait");
      aiText.textContent = e.message && !/fetch|network/i.test(e.message) ? e.message : "Smart translation isn’t available here. The highlighted version still works.";
      smartBtn.textContent = "Smart translation with AI";
    } finally {
      if (mine === ctl) { ctl = null; smartBtn.disabled = !input.value.trim(); }
    }
  }
  smartBtn.addEventListener("click", runSmart);

  function render() {
    const text = input.value;
    if (!text.trim()) {
      output.innerHTML = '<span class="empty">' + LABELS[mode].empty + "</span>";
      verdict.textContent = ""; copyBtn.disabled = true; lastPlain = ""; resetAi(); return;
    }
    const r = mode === "lpost" ? renderLinkedIn(text) : translate(text, mode);
    let html = r.html, plain = r.plain;
    if (mode === "corp") {
      html = "<mark>" + escHtml(opener) + "</mark>\n\n" + html + "\n\n<mark>" + escHtml(closer) + "</mark>";
      plain = opener + "\n\n" + plain + "\n\n" + closer;
    }
    output.innerHTML = html;
    verdict.textContent = verdictFor(r.count, mode);
    copyBtn.disabled = false; lastPlain = plain;
    resetAi();
  }

  function setMode(next) {
    mode = next;
    document.querySelectorAll(".modes button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    $("inputLabel").textContent = LABELS[mode].input;
    $("outputLabel").textContent = LABELS[mode].output;
    input.placeholder = LABELS[mode].placeholder;
    opener = pick(OPENERS); closer = pick(CLOSERS); shuffleLinkedIn();
    input.value = "";
    render();
    try { localStorage.setItem("pmle-mode", mode); } catch (e) {}
  }

  document.querySelectorAll(".modes button").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
  input.addEventListener("input", render);
  $("example").addEventListener("click", () => {
    const list = SAMPLES[mode];
    input.value = list[sampleIdx[mode] % list.length];
    sampleIdx[mode]++;
    opener = pick(OPENERS); closer = pick(CLOSERS); shuffleLinkedIn();
    render();
  });
  $("showOrig").addEventListener("change", e => output.classList.toggle("show-orig", e.target.checked));

  copyBtn.addEventListener("click", async () => {
    const toCopy = aiPlain || lastPlain;
    if (!toCopy) return;
    let ok = false;
    try { await navigator.clipboard.writeText(toCopy); ok = true; } catch (e) {
      try {
        const t = document.createElement("textarea");
        t.value = toCopy; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
        document.body.appendChild(t); t.select(); ok = document.execCommand("copy"); t.remove();
      } catch (e2) {}
    }
    copyBtn.textContent = ok ? "Copied" : "Select and copy manually";
    setTimeout(() => (copyBtn.textContent = "Copy translation"), 1600);
  });

  let saved = null;
  try { saved = localStorage.getItem("pmle-mode"); } catch (e) {}
  setMode(["corp", "ldecode", "lpost"].includes(saved) ? saved : "decode");
})();
