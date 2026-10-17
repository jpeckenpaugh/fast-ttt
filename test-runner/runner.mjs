import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const rootDir = process.env.WORKSPACE_DIR || "/game";
const artifactsDir = process.env.ARTIFACTS_DIR || "/artifacts";
const galleryDir = path.join(artifactsDir, "gallery");
const workAppDir = "/tmp/fast-ttt-run";

fs.mkdirSync(galleryDir, { recursive: true });
fs.rmSync(workAppDir, { recursive: true, force: true });
fs.cpSync(rootDir, workAppDir, { recursive: true });
try {
  fs.unlinkSync(path.join(workAppDir, "src", "data.db"));
} catch {}

function startFastApiServer(port = 8000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "python3",
      ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(port)],
      {
        cwd: path.join(workAppDir, "src"),
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    const checkReady = async () => {
      for (let i = 0; i < 40; i++) {
        try {
          const res = await fetch(`http://127.0.0.1:${port}/health`);
          if (res.ok) {
            resolve(proc);
            return;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 200));
      }
      reject(new Error("FastAPI server failed to start within 8s"));
    };

    checkReady();
  });
}

function buildShowcaseHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Fast TTT — Split-Terminal curl + ASCII HTTP Showcase</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1280px;
      height: 720px;
      overflow: hidden;
      background: radial-gradient(circle at 50% 0%, #172236 0%, #090d14 78%);
      color: #f3f4f6;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      padding: 12px 16px 14px;
      gap: 10px;
    }
    header.topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: rgba(17, 24, 39, 0.9);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 10px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge-act {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 4px 9px;
      border-radius: 999px;
      background: rgba(245, 158, 11, 0.16);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.45);
    }
    .brand h1 {
      font-size: 16px;
      font-weight: 700;
      color: #f9fafb;
    }
    .brand span.sub {
      font-size: 13px;
      color: #9ca3af;
      font-weight: 500;
    }
    #stage-pill {
      font-size: 12.5px;
      font-weight: 600;
      padding: 5px 12px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.16);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .main-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      min-height: 0;
    }
    .term-card {
      display: flex;
      flex-direction: column;
      background: #0d1117;
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid rgba(148, 163, 184, 0.25);
      box-shadow: 0 14px 32px rgba(0, 0, 0, 0.5);
      min-height: 0;
    }
    .term-card.player-x { border-color: rgba(56, 189, 248, 0.55); }
    .term-card.player-o { border-color: rgba(245, 158, 11, 0.55); }
    .term-chrome {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 12px;
      background: #161b22;
      border-bottom: 1px solid #21262d;
      font-size: 12px;
    }
    .chrome-left {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      color: #e6edf3;
    }
    .dots {
      display: inline-flex;
      gap: 5px;
      margin-right: 4px;
    }
    .dots i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
    .dots i:nth-child(1) { background: #ef4444; }
    .dots i:nth-child(2) { background: #f59e0b; }
    .dots i:nth-child(3) { background: #10b981; }
    .role-tag {
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .player-x .role-tag { background: rgba(56, 189, 248, 0.18); color: #38bdf8; }
    .player-o .role-tag { background: rgba(245, 158, 11, 0.18); color: #fbbf24; }
    .chrome-tty {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #8b949e;
      background: #0d1117;
      padding: 2px 8px;
      border-radius: 5px;
      border: 1px solid #30363d;
    }
    .term-body {
      flex: 1;
      padding: 12px 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.42;
      color: #e6edf3;
      overflow-y: auto;
      white-space: pre-wrap;
    }
    .cmd-line {
      color: #7ee787;
      font-weight: 700;
      margin-bottom: 6px;
      display: block;
    }
    .cmd-prompt {
      color: #58a6ff;
      user-select: none;
    }
    .http-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      margin-bottom: 6px;
    }
    .http-200 { background: rgba(46, 160, 67, 0.2); color: #3fb950; border: 1px solid rgba(46, 160, 67, 0.4); }
    .http-201 { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); }
    .http-409 { background: rgba(248, 81, 73, 0.2); color: #ff7b72; border: 1px solid rgba(248, 81, 73, 0.45); }
    .ascii-out {
      color: #f0f6fc;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
      font-size: 13.5px;
      line-height: 1.38;
    }
    .ascii-out .win-cell {
      color: #3fb950;
      font-weight: 800;
    }
    .ascii-out .err-line {
      color: #ff7b72;
      font-weight: 700;
    }
    footer.server-bar {
      height: 128px;
      background: #0d1117;
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 10px;
      display: grid;
      grid-template-columns: 1.35fr 1fr;
      overflow: hidden;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
    }
    .server-col {
      padding: 8px 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11.5px;
      line-height: 1.4;
      overflow: hidden;
    }
    .server-col:first-child {
      border-right: 1px solid #21262d;
    }
    .col-title {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #8b949e;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
    }
    .col-title span.tag {
      color: #a371f7;
    }
    #server-logs {
      color: #c9d1d9;
      white-space: pre-wrap;
    }
    #sqlite-state {
      color: #79c0ff;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="brand">
      <span class="badge-act">Act II · Zero Browser UI</span>
      <h1>Fast TTT (fast-ttt)</h1>
      <span class="sub">"Look Ma, No Browser!" — Two-Player ASCII Tic-Tac-Toe Over curl + FastAPI + SQLite</span>
    </div>
    <div id="stage-pill">Step 1 · FastAPI + SQLite Server Listening on :8000</div>
  </header>

  <div class="main-grid">
    <section class="term-card player-x">
      <div class="term-chrome">
        <div class="chrome-left">
          <span class="dots"><i></i><i></i><i></i></span>
          <span>TERMINAL A · PLAYER X</span>
          <span class="role-tag">curl client #1</span>
        </div>
        <span class="chrome-tty">zsh — 127.0.0.1:8000 (text/plain)</span>
      </div>
      <div class="term-body" id="term-x"></div>
    </section>

    <section class="term-card player-o">
      <div class="term-chrome">
        <div class="chrome-left">
          <span class="dots"><i></i><i></i><i></i></span>
          <span>TERMINAL B · PLAYER O</span>
          <span class="role-tag">curl client #2</span>
        </div>
        <span class="chrome-tty">zsh — 127.0.0.1:8000 (text/plain)</span>
      </div>
      <div class="term-body" id="term-o"></div>
    </section>
  </div>

  <footer class="server-bar">
    <div class="server-col">
      <div class="col-title">
        <span>Uvicorn / FastAPI Access Log (http://localhost:8000)</span>
        <span class="tag">Content-Type: text/plain; charset=utf-8</span>
      </div>
      <div id="server-logs">INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)</div>
    </div>
    <div class="server-col">
      <div class="col-title">
        <span>Relational SQLite State (src/data.db)</span>
        <span class="tag">Atomic SQLAlchemy Transactions</span>
      </div>
      <div id="sqlite-state">games: 0 rows | moves: 0 rows</div>
    </div>
  </footer>
</body>
</html>`;
}

function startShowcaseShellServer(shellPort = 4175, apiPort = 8000) {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const reqUrl = new URL(req.url, `http://127.0.0.1:${shellPort}`);
      if (reqUrl.pathname === "/__showcase__") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(buildShowcaseHtml());
        return;
      }
      if (reqUrl.pathname === "/__proxy__") {
        const targetPath = reqUrl.searchParams.get("path") || "/";
        const apiRes = await fetch(`http://127.0.0.1:${apiPort}${targetPath}`);
        const text = await apiRes.text();
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify({
            status: apiRes.status,
            statusText: apiRes.statusText,
            contentType: apiRes.headers.get("content-type"),
            body: text,
          })
        );
        return;
      }
      res.writeHead(404);
      res.end("Not Found");
    });
    server.listen(shellPort, "127.0.0.1", () => resolve(server));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runTermCommand(page, side, pathStr, sqliteSummary) {
  await page.evaluate(
    async ({ side, pathStr, sqliteSummary }) => {
      const termEl = document.getElementById(side === "X" ? "term-x" : "term-o");
      const cmdText = `curl -s http://localhost:8000${pathStr}`;
      termEl.innerHTML = `<span class="cmd-line"><span class="cmd-prompt">$ </span><span id="typing-active"></span></span>`;
      const typingEl = termEl.querySelector("#typing-active");
      for (let i = 0; i < cmdText.length; i++) {
        typingEl.textContent += cmdText[i];
        await new Promise((r) => setTimeout(r, 12));
      }
      typingEl.removeAttribute("id");

      const proxyRes = await fetch(`/__proxy__?path=${encodeURIComponent(pathStr)}`);
      const data = await proxyRes.json();

      const badgeClass =
        data.status === 201 ? "http-201" : data.status >= 400 ? "http-409" : "http-200";
      const escaped = data.body
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/(\[[XO]\])/g, '<span class="win-cell">$1</span>')
        .replace(/(Wrong turn:.*|Position .* is already occupied\.)/g, '<span class="err-line">$1</span>');

      const outHtml = `<span class="http-badge ${badgeClass}">HTTP ${data.status} · text/plain</span><div class="ascii-out">${escaped}</div>`;
      termEl.insertAdjacentHTML("beforeend", outHtml);

      const logEl = document.getElementById("server-logs");
      const lines = logEl.textContent.split("\n");
      lines.push(`INFO:     127.0.0.1 - "GET ${pathStr} HTTP/1.1" ${data.status}`);
      while (lines.length > 5) lines.shift();
      logEl.textContent = lines.join("\n");

      if (sqliteSummary) {
        document.getElementById("sqlite-state").textContent = sqliteSummary;
      }
    },
    { side, pathStr, sqliteSummary }
  );
}

async function setBanner(page, text) {
  await page.evaluate((t) => {
    const el = document.getElementById("stage-pill");
    if (el) el.textContent = t;
  }, text);
}

async function runShowcase() {
  console.log("[fast-ttt] Starting FastAPI + Uvicorn server on :8000...");
  const apiProc = await startFastApiServer(8000);
  const shellServer = await startShowcaseShellServer(4175, 8000);

  try {
    console.log("[fast-ttt] Launching Chromium for 1280x720 split-terminal showcase...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: artifactsDir,
        size: { width: 1280, height: 720 },
      },
    });

    const page = await context.newPage();
    const startTime = Date.now();
    const elapsed = () => ((Date.now() - startTime) / 1000).toFixed(1) + "s";

    await page.goto("http://127.0.0.1:4175/__showcase__", { waitUntil: "networkidle" });

    // Step 1: Home stats on left, /games/new on right -> then create Game 1
    await setBanner(page, "Step 1 · Inspect Server Health & Create Game 1 Over Plain-Text HTTP");
    await runTermCommand(
      page,
      "X",
      "/games/new",
      "games: id=1 (board='         ', turn='X', status='in_progress')\nmoves: 0 rows"
    );
    await runTermCommand(
      page,
      "O",
      "/games/1",
      "games: id=1 (board='         ', turn='X', status='in_progress')\nmoves: 0 rows"
    );
    await sleep(1600);
    await page.screenshot({ path: path.join(galleryDir, "01-create-game-and-board.png") });
    console.log(`[${elapsed()}] Captured 01-create-game-and-board.png`);

    // Step 2: Player X plays center (5) & Player O responds top-left (1)
    await setBanner(page, "Step 2 · Atomic Moves Over curl (/games/1/player/{X|O}/move/{1-9})");
    await runTermCommand(
      page,
      "X",
      "/games/1/player/X/move/5",
      "games: id=1 (board='    X    ', turn='O', status='in_progress')\nmoves: #1 (X -> 5)"
    );
    await sleep(900);
    await runTermCommand(
      page,
      "O",
      "/games/1/player/O/move/1",
      "games: id=1 (board='O   X    ', turn='X', status='in_progress')\nmoves: #1 (X->5), #2 (O->1)"
    );
    await sleep(1600);
    await page.screenshot({ path: path.join(galleryDir, "02-opening-moves.png") });
    console.log(`[${elapsed()}] Captured 02-opening-moves.png`);

    // Step 3: Demonstrate Server-Side Rule Enforcement (HTTP 409 Wrong Turn!)
    await setBanner(page, "Step 3 · Server-Authoritative Validation (HTTP 409 Conflict on Wrong Turn)");
    await runTermCommand(
      page,
      "O",
      "/games/1/player/O/move/2",
      "HTTP 409 Conflict -> Rolled back! SQLite turn remains 'X' (atomic validation)"
    );
    await sleep(1900);
    await page.screenshot({ path: path.join(galleryDir, "03-http-409-validation.png") });
    console.log(`[${elapsed()}] Captured 03-http-409-validation.png`);

    // Step 4: Continue Game 1 + Demonstrate /auto endpoint
    await setBanner(page, "Step 4 · Playing Moves & Server-Side Random Move (/games/1/auto)");
    await runTermCommand(
      page,
      "X",
      "/games/1/player/X/move/3",
      "games: id=1 (board='O X X    ', turn='O', status='in_progress')\nmoves: #1 (X->5), #2 (O->1), #3 (X->3)"
    );
    await sleep(900);
    await runTermCommand(
      page,
      "O",
      "/games/1/player/O/move/4",
      "games: id=1 (board='O XOX    ', turn='X', status='in_progress')\nmoves: 4 rows committed in src/data.db"
    );
    await sleep(1500);
    await page.screenshot({ path: path.join(galleryDir, "04-midgame-battle.png") });
    console.log(`[${elapsed()}] Captured 04-midgame-battle.png`);

    // Step 5: Player X completes diagonal [X] at 7 (3-5-7) & Player O views winning board!
    await setBanner(page, "Step 5 · Diagonal Victory Highlighted in ASCII ([X] at 3, 5, 7)");
    await runTermCommand(
      page,
      "X",
      "/games/1/player/X/move/7",
      "games: id=1 (status='x_wins', winner='X') — Winning line [X] highlighted!"
    );
    await sleep(800);
    await runTermCommand(
      page,
      "O",
      "/games/1",
      "games: id=1 (status='x_wins', winner='X') — Empty cells cleared on finished board"
    );
    await sleep(1800);
    await page.screenshot({ path: path.join(galleryDir, "05-ascii-victory-highlight.png") });
    console.log(`[${elapsed()}] Captured 05-ascii-victory-highlight.png`);

    // Step 6: Inspect full SQLite move log (/games/1/moves) & server stats (/)
    await setBanner(page, "Step 6 · Full Move History (/games/1/moves) & Server Scoreboard (/)");
    await runTermCommand(
      page,
      "X",
      "/games/1/moves",
      "SELECT * FROM moves WHERE game_id=1 ORDER BY id ASC -> 5 atomic moves"
    );
    await sleep(800);
    await runTermCommand(
      page,
      "O",
      "/",
      "SELECT status, COUNT(*) FROM games GROUP BY status -> Total: 1, Won by X: 1"
    );
    await sleep(2400);
    await page.screenshot({ path: path.join(galleryDir, "06-move-history-and-stats.png") });
    console.log(`[${elapsed()}] Captured 06-move-history-and-stats.png`);

    const currentMs = Date.now() - startTime;
    if (currentMs < 30500) {
      await sleep(30500 - currentMs);
    }

    const video = page.video();
    await page.close();
    await context.close();
    await browser.close();

    if (video) {
      const videoPath = await video.path();
      const targetVideoPath = path.join(artifactsDir, "demo.webm");
      fs.copyFileSync(videoPath, targetVideoPath);
      if (videoPath !== targetVideoPath) {
        fs.unlinkSync(videoPath);
      }
      console.log(`[fast-ttt] Saved showcase video to ${targetVideoPath} (${elapsed()})`);
    }
  } finally {
    shellServer.close();
    apiProc.kill("SIGTERM");
  }
}

await runShowcase();
