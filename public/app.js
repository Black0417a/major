const app = document.querySelector("#app");
const state = {
  view: "home",
  answers: {},
  currentStep: 0,
  profile: {},
  result: null,
  majors: [],
  compare: [],
  detail: null
};

const groups = [
  ["学科倾向", "subject"],
  ["职业兴趣", "interest"],
  ["能力特长", "ability"],
  ["性格特质", "personality"],
  ["价值观", "values"]
];

const questions = [
  q("q1", "学科倾向", ["math", "logic"], "我愿意花较长时间推导公式、证明结论或分析数量关系。"),
  q("q2", "学科倾向", ["physics", "spatial"], "我对力、电、运动、结构等现实规律感到好奇。"),
  q("q3", "学科倾向", ["chemistry", "handsOn"], "我喜欢通过实验观察物质变化并解释原因。"),
  q("q4", "学科倾向", ["biology", "research"], "我关心生命、健康、生态或人体机制方面的问题。"),
  q("q5", "学科倾向", ["humanities", "communication"], "我喜欢阅读、写作、历史、社会现象或观点表达。"),
  q("q6", "学科倾向", ["language", "openness"], "我愿意学习外语并理解不同文化背景下的表达方式。"),
  q("q7", "学科倾向", ["math", "data"], "面对图表和数据，我通常能较快看出趋势。"),
  q("q8", "学科倾向", ["humanities"], "我比起记忆事实，更喜欢理解事件背后的价值和意义。"),
  q("q9", "职业兴趣", ["research", "logic"], "我喜欢拆解复杂问题，并寻找背后的规律。"),
  q("q10", "职业兴趣", ["realistic", "handsOn"], "我喜欢动手制作、调试设备或解决具体技术问题。"),
  q("q11", "职业兴趣", ["artistic", "creativity"], "我常常想设计更好看的界面、作品、空间或表达形式。"),
  q("q12", "职业兴趣", ["social", "communication"], "我愿意帮助别人理解问题、改善状态或获得支持。"),
  q("q13", "职业兴趣", ["enterprising", "leadership"], "我对组织活动、推动项目或商业决策有兴趣。"),
  q("q14", "职业兴趣", ["conventional", "responsibility"], "我能接受细致、规范、需要高准确率的工作。"),
  q("q15", "职业兴趣", ["research", "patience"], "即使短期看不到结果，我也能持续研究一个问题。"),
  q("q16", "职业兴趣", ["enterprising", "income"], "我关注行业机会，也愿意为更高成长性承受压力。"),
  q("q17", "能力特长", ["logic", "math"], "我的逻辑推理能力通常比同龄人更突出。"),
  q("q18", "能力特长", ["data", "conventional"], "我擅长整理信息、制作表格或从数据中得出结论。"),
  q("q19", "能力特长", ["communication", "social"], "我能把复杂事情讲清楚，并根据听众调整表达。"),
  q("q20", "能力特长", ["handsOn", "realistic"], "我不排斥设备、工具、实验或工程实践。"),
  q("q21", "能力特长", ["spatial", "artistic"], "我对空间结构、图形、布局和比例比较敏感。"),
  q("q22", "能力特长", ["creativity", "openness"], "我经常提出和别人不一样的想法或解决方案。"),
  q("q23", "能力特长", ["leadership", "enterprising"], "在小组任务中，我常常能推进分工和进度。"),
  q("q24", "能力特长", ["responsibility", "conventional"], "我能认真检查细节，减少疏漏。"),
  q("q25", "性格特质", ["openness", "creativity"], "我愿意接触新领域，即使一开始并不熟悉。"),
  q("q26", "性格特质", ["responsibility", "stability"], "我重视承诺，倾向于把事情做完整。"),
  q("q27", "性格特质", ["patience", "research"], "我能接受长期训练、反复练习和逐步积累。"),
  q("q28", "性格特质", ["pressure", "enterprising"], "面对竞争和压力，我通常会被激发而不是立刻退缩。"),
  q("q29", "性格特质", ["communication", "social"], "我喜欢与人协作，能从互动中获得能量。"),
  q("q30", "性格特质", ["logic", "research"], "我更喜欢先分析清楚，再做决定。"),
  q("q31", "性格特质", ["artistic", "openness"], "我对美感、体验、表达风格有自己的判断。"),
  q("q32", "性格特质", ["conventional", "stability"], "我能在规则明确的环境中稳定发挥。"),
  q("q33", "价值观", ["stability", "responsibility"], "我希望未来职业有较稳定的发展路径和清晰要求。"),
  q("q34", "价值观", ["income", "enterprising"], "收入潜力和行业上升空间会明显影响我的选择。"),
  q("q35", "价值观", ["socialValue", "social"], "我希望自己的专业能对他人或社会产生直接价值。"),
  q("q36", "价值观", ["creativity", "openness"], "我希望未来工作有一定创造空间，而不是完全重复。"),
  q("q37", "价值观", ["research", "patience"], "我可以接受读研或长期深造来换取更专业的发展。"),
  q("q38", "价值观", ["handsOn", "realistic"], "我更看重能解决现实问题的专业。"),
  q("q39", "价值观", ["communication", "leadership"], "我希望未来能参与决策、协调资源或影响他人。"),
  q("q40", "价值观", ["data", "logic"], "我倾向于用证据、数据和模型判断问题。")
];

function q(id, dimension, keys, text, reverse = false, weight = 1) {
  return { id, dimension, keys, text, reverse, weight };
}

function save() {
  // Intentionally stateless: no localStorage/sessionStorage/cookie persistence.
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function setView(view) {
  state.view = view;
  save();
  render();
}

async function startAssessment() {
  state.answers = {};
  state.profile = {};
  state.result = null;
  state.currentStep = 0;
  state.view = "survey";
  render();
}

function nav() {
  return `<header class="topbar">
    <div class="brand"><div class="mark">M</div><span>MajorTI</span></div>
    <nav class="nav">
      ${navButton("home", "首页")}
      ${navButton("survey", "测评")}
      ${navButton("results", "结果")}
      ${navButton("majors", "专业库")}
    </nav>
  </header>`;
}

function navButton(view, label) {
  return `<button class="${state.view === view ? "active" : ""}" data-view="${view}">${label}</button>`;
}

function home() {
  return `<section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">匿名、快速、可解释的专业探索</p>
      <h1>发现更适合你的大学专业</h1>
      <p class="lead">MajorTI 通过学科倾向、职业兴趣、能力特长、性格特质和价值观五个维度，为暂时没有明确兴趣方向的高考考生生成专业推荐和解释。</p>
      <div class="actions">
        <button class="primary" id="start">开始测评</button>
        <button class="secondary" data-view="majors">浏览专业库</button>
      </div>
    </div>
    <aside class="hero-panel">
      <div>
        <h2>测评路径</h2>
        <p class="muted">40 道核心题，约 8-12 分钟完成。</p>
      </div>
      <div class="signal-grid">
        <div class="signal"><b>5</b><span>兴趣与决策维度</span></div>
        <div class="signal"><b>300+</b><span>本科专业样本库</span></div>
        <div class="signal"><b>Top 24</b><span>可解释推荐结果</span></div>
      <div class="signal"><b>0</b><span>无需账号</span></div>
      </div>
    </aside>
  </section>`;
}

function survey() {
  const group = groups[state.currentStep] || groups[0];
  const items = questions.filter(item => item.dimension === group[0]);
  const answered = items.filter(item => state.answers[item.id]).length;
  const totalAnswered = Object.keys(state.answers).length;
  return `<section class="panel">
    <h2>${group[0]}</h2>
    <p class="muted">请选择每句话与你的符合程度。1 表示非常不符合，5 表示非常符合。</p>
    <div class="step-line"><span style="width:${Math.round((totalAnswered / questions.length) * 100)}%"></span></div>
    <p class="muted">本阶段 ${answered}/${items.length}，总进度 ${totalAnswered}/${questions.length}</p>
    ${state.currentStep === 0 ? profileForm() : ""}
    <div class="question-grid">${items.map(questionCard).join("")}</div>
    <div class="toolbar">
      <button class="secondary" id="prev" ${state.currentStep === 0 ? "disabled" : ""}>上一步</button>
      <div class="actions">
        <button class="primary" id="next">${state.currentStep === groups.length - 1 ? "生成结果" : "下一步"}</button>
      </div>
    </div>
  </section>`;
}

function profileForm() {
  return `<div class="form-row">
    <div class="field"><label>省份，可选</label><input data-profile="province" value="${state.profile.province || ""}" placeholder="例如 广东" /></div>
    <div class="field"><label>预估分数，可选</label><input data-profile="score" value="${state.profile.score || ""}" placeholder="例如 610" /></div>
    <div class="field"><label>首选科目</label><select data-profile="track">
      ${option("", "暂不填写", state.profile.track)}
      ${option("物理", "物理", state.profile.track)}
      ${option("历史", "历史", state.profile.track)}
    </select></div>
    <div class="field"><label>更看重</label><select data-profile="priority">
      ${option("", "综合平衡", state.profile.priority)}
      ${option("interest", "兴趣匹配", state.profile.priority)}
      ${option("employment", "就业前景", state.profile.priority)}
      ${option("admission", "录取可达", state.profile.priority)}
    </select></div>
  </div>`;
}

function option(value, label, selected) {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
}

function questionCard(item) {
  const value = Number(state.answers[item.id] || 0);
  return `<article class="question-card">
    <strong>${item.text}</strong>
    <div class="scale">
      ${[1, 2, 3, 4, 5].map(n => `<button class="${value === n ? "selected" : ""}" data-q="${item.id}" data-v="${n}">${n}</button>`).join("")}
    </div>
  </article>`;
}

async function submitSurvey() {
  const result = await api("/api/assessment/submit", { method: "POST", body: { answers: state.answers, questions, profile: state.profile } });
  state.result = result;
  state.view = "results";
  render();
}

function results() {
  if (!state.result) {
    return `<section class="panel"><h2>还没有测评结果</h2><p class="muted">完成问卷后，这里会展示你的兴趣画像和专业推荐。</p><button class="primary" id="start">开始测评</button></section>`;
  }
  const top = state.result.recommendations;
  return `<section class="result-layout">
    <aside class="panel">
      <h2>兴趣画像</h2>
      <canvas class="radar" id="radar" width="320" height="320"></canvas>
      ${bars(state.result.studentVector)}
    </aside>
    <div class="panel">
      <h2>推荐专业</h2>
      <p class="muted">综合兴趣、能力、学科倾向、价值观和就业前景生成。匹配度用于辅助探索，不作为唯一志愿依据。</p>
      <div class="major-list">${top.map(majorCard).join("")}</div>
      ${compareBar()}
    </div>
  </section>`;
}

function bars(vector) {
  const rows = [
    ["研究探索", vector.research], ["实践操作", vector.realistic], ["审美创造", vector.artistic],
    ["助人与协作", vector.social], ["组织商业", vector.enterprising], ["数据逻辑", (vector.data + vector.logic) / 2]
  ];
  return `<div class="bars">${rows.map(([label, val]) => `<div>
    <div class="bar-label"><span>${label}</span><b>${Math.round(val * 100)}</b></div>
    <div class="bar"><span style="width:${Math.round(val * 100)}%"></span></div>
  </div>`).join("")}</div>`;
}

function majorCard(m) {
  const selected = state.compare.includes(m.id);
  return `<article class="major-card">
    <div>
      <h3>${m.name}</h3>
      <div class="meta"><span class="tag">${m.category}</span><span class="tag">${m.majorClass}</span><span class="tag">${m.dataBasis || "目录来源"}</span></div>
      <p class="muted">${m.description}</p>
      <p>${(m.reasons || []).join("；")}。</p>
      <div class="actions">
        <button class="secondary" data-detail="${m.id}">详情</button>
        <button class="${selected ? "primary" : "ghost"}" data-compare="${m.id}">${selected ? "已加入对比" : "加入对比"}</button>
      </div>
    </div>
    <div class="score" style="--score:${m.match || 0}%"><span>${m.match ? `${m.match}%` : "目录"}</span></div>
  </article>`;
}

async function loadMajors() {
  const qText = document.querySelector("[data-filter=q]")?.value || "";
  const category = document.querySelector("[data-filter=category]")?.value || "";
  const interest = document.querySelector("[data-filter=interest]")?.value || "";
  const data = await api(`/api/majors?q=${encodeURIComponent(qText)}&category=${encodeURIComponent(category)}&interest=${encodeURIComponent(interest)}`);
  state.majors = data.rows;
  render();
}

function majorsView() {
  return `<section class="panel">
    <h2>专业库</h2>
    <div class="filters">
      <input data-filter="q" placeholder="搜索专业、方向或关键词" />
      <select data-filter="category">
        <option value="">全部门类</option>
        ${["哲学", "经济学", "法学", "教育学", "文学", "历史学", "理学", "工学", "农学", "医学", "管理学", "艺术学"].map(c => `<option>${c}</option>`).join("")}
      </select>
      <select data-filter="interest">
        <option value="">全部兴趣</option>
        ${option("research", "研究探索")}
        ${option("realistic", "实践操作")}
        ${option("artistic", "审美创造")}
        ${option("social", "助人与协作")}
        ${option("enterprising", "组织商业")}
        ${option("conventional", "规则细致")}
      </select>
      <button class="primary" id="filter">筛选</button>
    </div>
    <div class="major-list">${state.majors.map(m => majorCard({ ...m, reasons: ["专业名称、门类和专业类按公开目录口径展示"] })).join("") || `<p class="muted">点击筛选加载专业。</p>`}</div>
    ${compareBar()}
  </section>`;
}

function compareBar() {
  if (!state.compare.length) return "";
  return `<div class="compare-bar"><span>已选择 ${state.compare.length}/4 个专业对比</span><div class="actions"><button class="secondary" id="clearCompare">清空</button><button class="primary" id="showCompare">查看对比</button></div></div>`;
}

async function detail(id) {
  state.detail = await api(`/api/majors/${id}`);
  render();
}

async function compareModal() {
  const data = await api("/api/majors/compare", { method: "POST", body: { ids: state.compare } });
  state.detail = { compareRows: data.rows };
  render();
}

function modal() {
  if (!state.detail) return "";
  if (state.detail.compareRows) {
    const rows = state.detail.compareRows;
    return `<div class="overlay"><div class="modal">
      <div class="toolbar"><h2>专业对比</h2><button class="ghost" id="closeModal">关闭</button></div>
      <div class="table-wrap"><table>
        <tr><th>维度</th>${rows.map(r => `<th>${r.name}</th>`).join("")}</tr>
        ${compareRow("所属门类", rows.map(r => r.category))}
        ${compareRow("专业类", rows.map(r => r.majorClass))}
        ${compareRow("数据依据", rows.map(r => r.dataBasis || "教育部本科专业目录/阳光高考专业库口径"))}
        ${compareRow("详情状态", rows.map(r => r.verifiedDetailStatus || "培养方案、就业、薪资等数据待接入权威来源"))}
        ${compareRow("适合提醒", rows.map(r => r.description))}
      </table></div>
    </div></div>`;
  }
  const m = state.detail;
  return `<div class="overlay"><div class="modal">
    <div class="toolbar"><h2>${m.name}</h2><button class="ghost" id="closeModal">关闭</button></div>
    <div class="meta"><span class="tag">目录名称已对齐</span><span class="tag">${m.category}</span><span class="tag">${m.majorClass}</span><span class="tag">${m.duration} 年</span></div>
    <p>${m.description}</p>
    <h3>权威数据状态</h3><p>${m.verifiedDetailStatus || "核心课程、就业方向、就业率、薪资等详情尚未接入逐条可追溯来源，因此当前不展示数值或模板内容。"}</p>
    <h3>依据</h3><p>${(m.sources || []).map(s => `${s.name}：${s.url}`).join("；")}</p>
    <p class="muted">${m.sourceNote}</p>
  </div></div>`;
}

function compareRow(label, cells) {
  return `<tr><th>${label}</th>${cells.map(cell => `<td>${cell}</td>`).join("")}</tr>`;
}

function render() {
  app.innerHTML = `<div class="shell">${nav()}<main class="main">${route()}${modal()}</main></div>`;
  wire();
  if (state.view === "results" && state.result) drawRadar();
}

function route() {
  if (state.view === "survey") return survey();
  if (state.view === "results") return results();
  if (state.view === "majors") return majorsView();
  return home();
}

function wire() {
  document.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));
  document.querySelector("#start")?.addEventListener("click", startAssessment);
  document.querySelectorAll("[data-q]").forEach(btn => btn.addEventListener("click", async () => {
    state.answers[btn.dataset.q] = Number(btn.dataset.v);
    render();
  }));
  document.querySelectorAll("[data-profile]").forEach(input => input.addEventListener("input", () => {
    state.profile[input.dataset.profile] = input.value;
  }));
  document.querySelector("#prev")?.addEventListener("click", () => {
    state.currentStep = Math.max(0, state.currentStep - 1);
    render();
  });
  document.querySelector("#next")?.addEventListener("click", async () => {
    if (state.currentStep < groups.length - 1) {
      state.currentStep += 1;
      render();
    } else {
      await submitSurvey();
    }
  });
  document.querySelector("#filter")?.addEventListener("click", loadMajors);
  document.querySelectorAll("[data-detail]").forEach(btn => btn.addEventListener("click", () => detail(btn.dataset.detail)));
  document.querySelectorAll("[data-compare]").forEach(btn => btn.addEventListener("click", () => {
    const id = Number(btn.dataset.compare);
    state.compare = state.compare.includes(id) ? state.compare.filter(x => x !== id) : [...state.compare, id].slice(0, 4);
    render();
  }));
  document.querySelector("#clearCompare")?.addEventListener("click", () => {
    state.compare = [];
    render();
  });
  document.querySelector("#showCompare")?.addEventListener("click", compareModal);
  document.querySelector("#closeModal")?.addEventListener("click", () => {
    state.detail = null;
    render();
  });
}

function drawRadar() {
  const canvas = document.querySelector("#radar");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const labels = [
    ["学科", avg(["math", "physics", "chemistry", "biology", "humanities", "language"])],
    ["研究", state.result.studentVector.research],
    ["实践", state.result.studentVector.realistic],
    ["创造", avg(["artistic", "creativity"])],
    ["协作", avg(["social", "communication"])],
    ["发展", avg(["income", "enterprising", "leadership"])]
  ];
  const cx = 160, cy = 160, r = 112;
  ctx.clearRect(0, 0, 320, 320);
  ctx.strokeStyle = "#d9e0ea";
  ctx.fillStyle = "#647086";
  ctx.font = "14px sans-serif";
  for (let ring = 1; ring <= 4; ring++) {
    polygon(ctx, labels.length, cx, cy, r * ring / 4);
    ctx.stroke();
  }
  labels.forEach((item, i) => {
    const a = -Math.PI / 2 + i * Math.PI * 2 / labels.length;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
    ctx.fillText(item[0], cx + Math.cos(a) * (r + 18) - 14, cy + Math.sin(a) * (r + 18) + 5);
  });
  ctx.beginPath();
  labels.forEach((item, i) => {
    const a = -Math.PI / 2 + i * Math.PI * 2 / labels.length;
    const rr = r * item[1];
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(37, 99, 235, .22)";
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
}

function polygon(ctx, sides, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / sides;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function avg(keys) {
  return keys.reduce((sum, key) => sum + (state.result.studentVector[key] || 0), 0) / keys.length;
}

render();
if (state.view === "majors" && !state.majors.length) loadMajors();
