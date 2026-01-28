#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌉 Kraton-Cursor Bridge Server
 * Kraton이 Cursor/VS Code에 직접 파일을 수정할 수 있게 해주는 로컬 서버
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 실행: node scripts/kraton-bridge-server.js
 * 포트: 18790
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 18790;
const AUTUS_ROOT = path.resolve(__dirname, "..");
const LOG_FILE = path.join(AUTUS_ROOT, ".kraton", "bridge.log");

// 로그 함수
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

// CORS 헤더
function setCORSHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// 파일 쓰기
function writeFile(filePath, content) {
  const fullPath = path.join(AUTUS_ROOT, filePath);
  const dir = path.dirname(fullPath);

  // 디렉토리 생성
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, content, "utf8");
  log(`✅ 파일 작성: ${filePath}`);
  return true;
}

// 파일 읽기
function readFile(filePath) {
  const fullPath = path.join(AUTUS_ROOT, filePath);
  if (fs.existsSync(fullPath)) {
    return fs.readFileSync(fullPath, "utf8");
  }
  return null;
}

// 파일 수정 (부분 교체)
function editFile(filePath, oldString, newString) {
  const fullPath = path.join(AUTUS_ROOT, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
  }

  let content = fs.readFileSync(fullPath, "utf8");
  if (!content.includes(oldString)) {
    throw new Error(`교체할 문자열을 찾을 수 없습니다`);
  }

  content = content.replace(oldString, newString);
  fs.writeFileSync(fullPath, content, "utf8");
  log(`✏️ 파일 수정: ${filePath}`);
  return true;
}

// 요청 핸들러
const server = http.createServer((req, res) => {
  setCORSHeaders(res);

  // OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        server: "kraton-bridge",
        version: "1.0.0",
      }),
    );
    return;
  }

  // POST /command
  if (req.method === "POST" && req.url === "/command") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const command = JSON.parse(body);
        log(`📥 명령 수신: ${command.type} - ${command.file || "N/A"}`);

        let result;

        switch (command.type) {
          case "write":
            result = writeFile(command.file, command.content);
            break;

          case "read":
            result = readFile(command.file);
            break;

          case "edit":
            result = editFile(
              command.file,
              command.oldString,
              command.newString,
            );
            break;

          case "append":
            const current = readFile(command.file) || "";
            result = writeFile(command.file, current + "\n" + command.content);
            break;

          default:
            throw new Error(`알 수 없는 명령: ${command.type}`);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, result }));
      } catch (error) {
        log(`❌ 오류: ${error.message}`);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

// 서버 시작
server.listen(PORT, () => {
  log(`🌉 Kraton-Cursor Bridge Server 시작`);
  log(`📍 포트: ${PORT}`);
  log(`📁 루트: ${AUTUS_ROOT}`);
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🦎 Kraton-Cursor Bridge Server                               ║
╠═══════════════════════════════════════════════════════════════╣
║  Status: Running                                              ║
║  Port:   ${PORT}                                                ║
║  Root:   ${AUTUS_ROOT}
╚═══════════════════════════════════════════════════════════════╝

Kraton이 이제 직접 파일을 수정할 수 있습니다!

API 사용법:
  POST http://localhost:${PORT}/command
  
  { "type": "write", "file": "path/to/file.tsx", "content": "..." }
  { "type": "edit", "file": "path/to/file.tsx", "oldString": "...", "newString": "..." }
  { "type": "read", "file": "path/to/file.tsx" }

Ctrl+C로 종료
`);
});

// 종료 처리
process.on("SIGINT", () => {
  log("🛑 서버 종료");
  process.exit(0);
});
