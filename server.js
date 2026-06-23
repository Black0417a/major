import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");
const majors = JSON.parse(await readFile(path.join(root, "data", "majors.json"), "utf8"));

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const dimensionKeys = [
  "math", "physics", "chemistry", "biology", "humanities", "language",
  "research", "realistic", "artistic", "social", "enterprising", "conventional",
  "logic", "data", "communication", "handsOn", "spatial", "creativity",
  "openness", "responsibility", "patience", "pressure", "leadership",
  "stability", "income", "socialValue"
];

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function cosine(a, b) {
  let dot = 0, ma = 0, mb = 0;
  for (const k of dimensionKeys) {
    const av = a[k] || 0;
    const bv = b[k] || 0;
    dot += av * bv;
    ma += av * av;
    mb += bv * bv;
  }
  return ma && mb ? dot / (Math.sqrt(ma) * Math.sqrt(mb)) : 0;
}

function buildVector(answers, questions) {
  const sums = Object.fromEntries(dimensionKeys.map(k => [k, 0]));
  const weights = Object.fromEntries(dimensionKeys.map(k => [k, 0]));
  for (const q of questions) {
    const raw = Number(answers[q.id] || 3);
    const value = q.reverse ? 6 - raw : raw;
    for (const key of q.keys) {
      sums[key] += (value - 1) / 4 * (q.weight || 1);
      weights[key] += q.weight || 1;
    }
  }
  return Object.fromEntries(dimensionKeys.map(k => [k, Number((weights[k] ? sums[k] / weights[k] : 0.35).toFixed(3))]));
}

function recommend(studentVector, profile = {}) {
  const provinceBonus = profile.province ? 0.01 : 0;
  return majors.map(major => {
    const interest = cosine(studentVector, major.vector);
    const ability = (Math.min(studentVector.logic, major.vector.logic) + Math.min(studentVector.communication, major.vector.communication) + Math.min(studentVector.handsOn, major.vector.handsOn) + Math.min(studentVector.data, major.vector.data)) / 4;
    const subject = (Math.min(studentVector.math, major.vector.math) + Math.min(studentVector.physics, major.vector.physics) + Math.min(studentVector.chemistry, major.vector.chemistry) + Math.min(studentVector.biology, major.vector.biology) + Math.min(studentVector.humanities, major.vector.humanities) + Math.min(studentVector.language, major.vector.language)) / 6;
    const values = (Math.min(studentVector.income, major.vector.income) + Math.min(studentVector.stability, major.vector.stability) + Math.min(studentVector.socialValue, major.vector.socialValue)) / 3;
    const finalScore = interest * .55 + ability * .22 + subject * .15 + values * .08 + provinceBonus;
    const reasons = topReasons(studentVector, major.vector, major);
    return { ...major, match: Math.round(finalScore * 100), interest: Math.round(interest * 100), reasons };
  }).sort((a, b) => b.match - a.match).slice(0, 24);
}

function topReasons(student, vector, major) {
  const labels = {
    math: "数学与逻辑基础", physics: "物理建模倾向", chemistry: "化学与实验兴趣", biology: "生命科学兴趣",
    humanities: "人文阅读与理解", language: "语言表达", research: "研究探索", realistic: "实践操作",
    artistic: "审美创造", social: "助人与协作", enterprising: "组织与商业意识", conventional: "规则与细致",
    logic: "逻辑推理", data: "数据分析", communication: "沟通表达", handsOn: "动手实践", spatial: "空间想象",
    creativity: "创意生成", stability: "稳定性偏好", income: "收入成长期待", socialValue: "社会价值感"
  };
  return Object.keys(labels)
    .map(k => ({ key: k, score: Math.min(student[k] || 0, vector[k] || 0), label: labels[k] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => `${x.label}与${major.name}要求较一致`);
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") return json(res, 200, { ok: true, majors: majors.length });
  if (req.method === "POST" && url.pathname === "/api/assessment/session") {
    return json(res, 200, { stateless: true, message: "MajorTI does not store assessment progress or answers." });
  }
  if (req.method === "POST" && url.pathname === "/api/assessment/submit") {
    const payload = await body(req);
    const studentVector = buildVector(payload.answers || {}, payload.questions || []);
    const recommendations = recommend(studentVector, payload.profile || {});
    const result = { studentVector, recommendations, generatedAt: new Date().toISOString() };
    return json(res, 200, result);
  }
  if (req.method === "GET" && url.pathname.startsWith("/api/result/")) {
    return json(res, 410, { error: "stateless_results", message: "Results are generated on submit and are not stored on the server." });
  }
  if (req.method === "GET" && url.pathname === "/api/majors") {
    const q = (url.searchParams.get("q") || "").trim();
    const category = url.searchParams.get("category") || "";
    const interest = url.searchParams.get("interest") || "";
    let rows = majors;
    if (q) rows = rows.filter(m => `${m.name}${m.majorClass}${m.description}`.includes(q));
    if (category) rows = rows.filter(m => m.category === category);
    if (interest) rows = rows.filter(m => (m.vector[interest] || 0) >= .65);
    return json(res, 200, { rows: rows.slice(0, 80), total: rows.length });
  }
  if (req.method === "GET" && url.pathname.startsWith("/api/majors/")) {
    const id = Number(url.pathname.split("/").pop());
    const major = majors.find(m => m.id === id);
    return major ? json(res, 200, major) : json(res, 404, { error: "major_not_found" });
  }
  if (req.method === "POST" && url.pathname === "/api/majors/compare") {
    const payload = await body(req);
    const ids = new Set((payload.ids || []).map(Number));
    return json(res, 200, { rows: majors.filter(m => ids.has(m.id)).slice(0, 4) });
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

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    json(res, 500, { error: "server_error", message: error.message });
  }
}).listen(5173, () => {
  console.log("MajorTI running at http://localhost:5173");
});
