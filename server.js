import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import net from "node:net";
import tls from "node:tls";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");
const dataDir = path.join(root, "data");
const dbDir = path.join(root, "db");
const resultsPath = path.join(dbDir, "assessment-results.json");
const majors = JSON.parse(await readFile(path.join(dataDir, "majors.json"), "utf8"));

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const vectorKeys = [
  "research", "realistic", "artistic", "social", "enterprising", "conventional",
  "logic", "data", "communication", "handsOn", "spatial", "creativity",
  "openness", "responsibility", "patience", "pressure", "leadership", "stability"
];

const dimensionLabels = {
  research: "探究", realistic: "动手", artistic: "审美", social: "协作",
  enterprising: "组织", conventional: "规范", logic: "逻辑", data: "数据",
  communication: "表达", handsOn: "实践", spatial: "空间", creativity: "创意",
  openness: "开放", responsibility: "负责", patience: "耐心", pressure: "抗压",
  leadership: "带动", stability: "稳定"
};

let savedResults = [];
let transporter = null;

const mailConfig = {
  host: process.env.SMTP_HOST || "smtp.qq.com",
  port: Number(process.env.SMTP_PORT || 587),
  user: process.env.SMTP_USER || "1329791448@qq.com",
  pass: process.env.SMTP_PASS || "fpmcilnasevkgebb",
  from: process.env.MAIL_FROM || process.env.SMTP_USER || "1329791448@qq.com"
};

try {
  const raw = await readFile(resultsPath, "utf8");
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) savedResults = parsed;
} catch {
  savedResults = [];
}

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function persistResults() {
  await mkdir(dbDir, { recursive: true });
  await writeFile(resultsPath, JSON.stringify(savedResults, null, 2), "utf8");
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(String(value), "utf8").toString("base64")}?=`;
}

function escapeSmtpBody(value = "") {
  return String(value).replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function createSmtpSession(socket) {
  let buffer = "";
  let lines = [];
  const waiters = [];
  let failure = null;

  function flush() {
    while (waiters.length && lines.length) {
      const waiter = waiters.shift();
      waiter.resolve();
    }
    if (failure) {
      while (waiters.length) {
        const waiter = waiters.shift();
        waiter.reject(failure);
      }
    }
  }

  socket.on("data", chunk => {
    buffer += chunk.toString("utf8");
    let idx = buffer.indexOf("\r\n");
    while (idx >= 0) {
      lines.push(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 2);
      idx = buffer.indexOf("\r\n");
    }
    flush();
  });

  socket.on("close", () => {
    if (!failure) failure = new Error("SMTP connection closed");
    flush();
  });
  socket.on("error", error => {
    failure = error;
    flush();
  });

  return {
    write(line) {
      socket.write(`${line}\r\n`);
    },
    async read() {
      const collected = [];
      while (true) {
        if (failure) throw failure;
        if (!lines.length) {
          await new Promise((resolve, reject) => waiters.push({ resolve, reject }));
          continue;
        }
        const line = lines.shift();
        collected.push(line);
        if (/^\d{3} /.test(line)) {
          const code = Number(line.slice(0, 3));
          const message = collected.map(item => item.slice(4)).join("\n");
          if (code >= 400) throw new Error(`SMTP ${code}: ${message}`);
          return { code, message, lines: collected };
        }
      }
    },
    end() {
      socket.end();
    }
  };
}

async function connectSocket(config) {
  return await new Promise((resolve, reject) => {
    const socket = net.connect(config.port, config.host);
    socket.once("error", reject);
    socket.once("connect", () => resolve(socket));
  });
}

async function upgradeToTls(socket, config) {
  return await new Promise((resolve, reject) => {
    const secureSocket = tls.connect({
      socket,
      servername: config.host,
      rejectUnauthorized: true
    });
    secureSocket.once("secureConnect", () => resolve(secureSocket));
    secureSocket.once("error", reject);
  });
}

async function smtpSend(config, { to, subject, text, html }) {
  let socket = await connectSocket(config);
  let session = createSmtpSession(socket);

  await session.read();
  session.write("EHLO localhost");
  await session.read();
  session.write("STARTTLS");
  await session.read();

  socket = await upgradeToTls(socket, config);
  session = createSmtpSession(socket);
  session.write("EHLO localhost");
  await session.read();
  session.write("AUTH LOGIN");
  await session.read();
  session.write(Buffer.from(config.user, "utf8").toString("base64"));
  await session.read();
  session.write(Buffer.from(config.pass, "utf8").toString("base64"));
  await session.read();
  session.write(`MAIL FROM:<${config.from}>`);
  await session.read();
  session.write(`RCPT TO:<${to}>`);
  await session.read();
  session.write("DATA");
  await session.read();

  const subjectLine = encodeHeader(subject);
  const message = [
    `From: ${config.from}`,
    `To: ${to}`,
    `Subject: ${subjectLine}`,
    "MIME-Version: 1.0",
    `Content-Type: ${html ? "text/html" : "text/plain"}; charset=UTF-8`,
    "",
    escapeSmtpBody(html || text || "")
  ].join("\r\n");

  session.write(message);
  session.write(".");
  await session.read();
  session.write("QUIT");
  session.end();
}

async function initTransporter() {
  try {
    transporter = {
      async sendMail({ to, subject, text, html }) {
        return smtpSend(mailConfig, { to, subject, text, html });
      }
    };
    console.log("邮件配置成功");
  } catch (error) {
    console.error("邮件配置失败:", error);
    transporter = null;
  }
}

await initTransporter();

function normalizeText(value = "") {
  return String(value).trim().toLowerCase();
}

function cosine(a, b, keys = vectorKeys) {
  let dot = 0;
  let ma = 0;
  let mb = 0;
  for (const key of keys) {
    const av = Number(a?.[key] || 0);
    const bv = Number(b?.[key] || 0);
    dot += av * bv;
    ma += av * av;
    mb += bv * bv;
  }
  return ma && mb ? dot / (Math.sqrt(ma) * Math.sqrt(mb)) : 0;
}

function buildVector(answers, questions) {
  const sums = Object.fromEntries(vectorKeys.map(key => [key, 0]));
  const weights = Object.fromEntries(vectorKeys.map(key => [key, 0]));

  for (const question of questions) {
    const raw = Number(answers?.[question.id] || 3);
    const normalized = question.reverse ? 6 - raw : raw;
    const score = Math.max(0, Math.min(1, (normalized - 1) / 4));
    for (const key of question.keys || []) {
      const weight = Number(question.weight || 1);
      sums[key] += score * weight;
      weights[key] += weight;
    }
  }

  return Object.fromEntries(vectorKeys.map(key => [
    key,
    Number((weights[key] ? sums[key] / weights[key] : 0).toFixed(3))
  ]));
}

function topKeys(vector, keys = vectorKeys, count = 4) {
  return [...keys]
    .map(key => ({ key, value: Number(vector?.[key] || 0) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, count);
}

function topReasons(student, major) {
  const overlaps = vectorKeys
    .map(key => ({ key, value: Math.min(Number(student?.[key] || 0), Number(major?.[key] || 0)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
  return overlaps.map(item => {
    const label = dimensionLabels[item.key] || item.key;
    return `你在${label}上更明显，这和这个专业的要求较接近`;
  });
}

function recommend(studentVector) {
  return majors
    .map(major => {
      const interest = cosine(studentVector, major.vector, vectorKeys);
      const studentTop = topKeys(studentVector);
      const majorTop = topKeys(major.vector);
      const overlap = studentTop.reduce((sum, item) => sum + Number(major.vector?.[item.key] || 0), 0) / studentTop.length;
      const alignment = majorTop.reduce((sum, item) => sum + Number(studentVector?.[item.key] || 0), 0) / majorTop.length;
      const score = interest * 0.7 + overlap * 0.2 + alignment * 0.1;
      return {
        ...major,
        match: Math.max(0, Math.min(100, Math.round(score * 100))),
        interest: Math.max(0, Math.min(100, Math.round(interest * 100))),
        reasons: topReasons(studentVector, major.vector)
      };
    })
    .sort((a, b) => b.match - a.match)
    .slice(0, 12);
}

function buildResultEmail({ result, studentVector, recommendations }) {
  const top = (recommendations || []).slice(0, 6).map((major, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${major.name}</td>
      <td>${major.code || "未配置"}</td>
      <td>${major.match || 0}%</td>
    </tr>
  `).join("");

  const vectorRows = Object.entries(studentVector || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([key, value]) => `<tr><td>${dimensionLabels[key] || key}</td><td>${Math.round(Number(value || 0) * 100)}%</td></tr>`)
    .join("");

  return {
    subject: "MajorTI 测评结果",
    text: `你的测评结果已生成。Top 推荐：${(recommendations || []).slice(0, 6).map(item => item.name).join(" / ")}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#17202b">
        <h2>MajorTI 测评结果</h2>
        <p>以下是你的兴趣画像和专业推荐。</p>
        <h3>兴趣画像</h3>
        <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid #d9e0ea">
          ${vectorRows}
        </table>
        <h3 style="margin-top:20px">推荐专业</h3>
        <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid #d9e0ea">
          <tr><th align="left">序号</th><th align="left">专业</th><th align="left">专业代码</th><th align="left">匹配度</th></tr>
          ${top}
        </table>
        <p style="color:#637087;margin-top:16px">这份结果仅用于兴趣探索，不替代志愿填报和院校信息核对。</p>
      </div>
    `
  };
}

function majorMatchesFilter(major, q, category, interest) {
  if (q) {
    const haystack = normalizeText(`${major.code || ""} ${major.name} ${major.category} ${major.majorClass} ${major.description}`);
    if (!haystack.includes(normalizeText(q))) return false;
  }
  if (category && major.category !== category) return false;
  if (interest && Number(major.vector?.[interest] || 0) < 0.65) return false;
  return true;
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/major/api/health") {
    return json(res, 200, { ok: true, majors: majors.length, savedResults: savedResults.length });
  }

  if (req.method === "GET" && url.pathname === "/major/api/meta") {
    return json(res, 200, {
      total: majors.length,
      categories: [...new Set(majors.map(major => major.category))].sort(),
      dimensions: vectorKeys.map(key => ({ key, label: dimensionLabels[key] || key }))
    });
  }

  if (req.method === "POST" && url.pathname === "/major/api/assessment/session") {
    return json(res, 200, { stateless: true, message: "This app does not store survey progress on the server." });
  }

  if (req.method === "POST" && url.pathname === "/major/api/assessment/submit") {
    const payload = await body(req);
    const studentVector = buildVector(payload.answers || {}, payload.questions || []);
    const recommendations = recommend(studentVector);
    return json(res, 200, {
      studentVector,
      recommendations,
      generatedAt: new Date().toISOString()
    });
  }

  if (req.method === "POST" && url.pathname === "/major/api/assessment/save") {
    const payload = await body(req);
    const email = String(payload.email || "").trim().toLowerCase();
    if (!email) {
      return json(res, 200, { saved: false, message: "邮箱为空，未发送邮件。" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(res, 400, { error: "invalid_email", message: "邮箱格式不正确。" });
    }

    const record = {
      id: `result_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      email,
      savedAt: new Date().toISOString(),
      result: payload.result || null,
      studentVector: payload.studentVector || null,
      recommendations: payload.recommendations || null
    };
    savedResults.push(record);
    await persistResults();
    const mail = buildResultEmail({
      result: record.result,
      studentVector: record.studentVector,
      recommendations: record.recommendations
    });
    if (!transporter) {
      return json(res, 500, { error: "mail_unavailable", message: "邮件服务未初始化。" });
    }
    try {
      await transporter.sendMail({
        to: email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html
      });
    } catch (error) {
      return json(res, 502, { error: "mail_send_failed", message: `邮件发送失败：${error.message}` });
    }
    return json(res, 200, { saved: true, id: record.id, message: "结果已发送到邮箱。" });
  }

  if (req.method === "GET" && url.pathname.startsWith("/major/api/result/")) {
    const id = url.pathname.split("/").pop();
    const record = savedResults.find(item => item.id === id);
    return record ? json(res, 200, record) : json(res, 404, { error: "result_not_found" });
  }

  if (req.method === "GET" && url.pathname === "/major/api/majors") {
    const q = url.searchParams.get("q") || "";
    const category = url.searchParams.get("category") || "";
    const interest = url.searchParams.get("interest") || "";
    const rows = majors.filter(major => majorMatchesFilter(major, q, category, interest));
    return json(res, 200, { rows: rows.slice(0, 80), total: rows.length });
  }

  if (req.method === "GET" && url.pathname.startsWith("/major/api/majors/")) {
    const id = Number(url.pathname.split("/").pop());
    const major = majors.find(item => item.id === id);
    return major ? json(res, 200, major) : json(res, 404, { error: "major_not_found" });
  }

  if (req.method === "POST" && url.pathname === "/major/api/majors/compare") {
    const payload = await body(req);
    const ids = new Set((payload.ids || []).map(Number));
    return json(res, 200, { rows: majors.filter(major => ids.has(major.id)).slice(0, 4) });
  }

  return json(res, 404, { error: "not_found" });
}

async function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(publicDir, requested));
  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { "content-type": mime[ext] || "application/octet-stream" });
  res.end(await readFile(filePath));
}

function createAppServer() {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/major/api/")) return await handleApi(req, res, url);
      return await serveStatic(req, res, url);
    } catch (error) {
      console.error(error);
      json(res, 500, { error: "server_error", message: error.message });
    }
  });
}

async function listen(port) {
  return await new Promise((resolve, reject) => {
    const server = createAppServer();
    server.once("error", reject);
    server.listen(port, () => resolve(server));
  });
}

const basePort = Number(process.env.PORT || 5173);
let server = null;
let port = basePort;
for (let candidate = basePort; candidate < basePort + 10; candidate += 1) {
  try {
    server = await listen(candidate);
    port = candidate;
    break;
  } catch (error) {
    if (error.code !== "EADDRINUSE") throw error;
  }
}

if (!server) {
  throw new Error(`No free port found starting at ${basePort}`);
}

server.on("close", () => {});
server.on("error", error => {
  console.error(error);
});

console.log(`MajorTI running at http://localhost:${port}`);
