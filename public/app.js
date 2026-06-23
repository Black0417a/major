const app = document.querySelector("#app");

const dimensionLabels = {
  research: "探究",
  realistic: "动手",
  artistic: "审美",
  social: "协作",
  enterprising: "组织",
  conventional: "规范",
  logic: "逻辑",
  data: "数据",
  communication: "表达",
  handsOn: "实践",
  spatial: "空间",
  creativity: "创意",
  openness: "开放",
  responsibility: "负责",
  patience: "耐心",
  pressure: "抗压",
  leadership: "带动",
  stability: "稳定"
};

const questionGroups = [
  {
    id: "explore",
    title: "探究与思考",
    questions: [
      q("q1", ["research", "logic"], "我会主动去查一个问题背后的原因，而不是只记结论。"),
      q("q2", ["data", "logic"], "看到数据、表格或趋势图，我会想继续分析。"),
      q("q3", ["research", "patience"], "遇到难题时，我能接受慢一点，但把它弄明白。"),
      q("q4", ["logic", "data"], "我更喜欢先想清楚再行动。"),
      q("q5", ["openness", "creativity"], "我愿意尝试新的领域，即使一开始不熟悉。")
    ]
  },
  {
    id: "hands",
    title: "动手与空间",
    questions: [
      q("q6", ["handsOn", "realistic"], "我更喜欢自己动手试出来，而不是只听别人讲。"),
      q("q7", ["realistic", "handsOn"], "我喜欢和真实物体、设备、材料打交道。"),
      q("q8", ["spatial", "realistic"], "看到图纸、布局或空间关系，我会比较敏感。"),
      q("q9", ["handsOn", "responsibility"], "把步骤一点点做对、做完，会让我有成就感。"),
      q("q10", ["realistic", "pressure"], "面对需要边做边调的任务，我不会特别抗拒。")
    ]
  },
  {
    id: "express",
    title: "表达与协作",
    questions: [
      q("q11", ["communication", "social"], "我喜欢和人交流、倾听、解释和协作。"),
      q("q12", ["social", "communication"], "遇到需要支持、说服或协调他人的场景，我不排斥。"),
      q("q13", ["communication", "logic"], "我喜欢把复杂内容讲清楚，让别人听懂。"),
      q("q14", ["social", "leadership"], "在团队里，我愿意把大家往前带一带。"),
      q("q15", ["artistic", "communication"], "我愿意用文字、影像、声音或视觉方式表达自己。")
    ]
  },
  {
    id: "organize",
    title: "组织与执行",
    questions: [
      q("q16", ["enterprising", "leadership"], "我对组织活动、项目推进或商业判断有兴趣。"),
      q("q17", ["conventional", "responsibility"], "我能接受重复、规范、细节很多的任务。"),
      q("q18", ["responsibility", "conventional"], "我做事会比较在意流程和准确性。"),
      q("q19", ["leadership", "pressure"], "我愿意在压力下推进事情，而不是立刻退缩。"),
      q("q20", ["enterprising", "stability"], "我会因为一个明确目标而持续往前推。")
    ]
  },
  {
    id: "growth",
    title: "开放与坚持",
    questions: [
      q("q21", ["creativity", "openness"], "我会因为一个想法而想做出新东西。"),
      q("q22", ["openness", "creativity"], "我对新鲜做法、跨界组合或不同风格比较感兴趣。"),
      q("q23", ["patience", "research"], "我愿意为了一个目标持续练习和提升。"),
      q("q24", ["responsibility", "stability"], "我愿意对自己的选择和结果负责。")
    ]
  }
];

const questionIndex = questionGroups.flatMap(group => group.questions);
const interestKeys = [...new Set(questionIndex.flatMap(qs => qs.keys))];
const summaryKeys = [
  ["research", "logic", "data"],
  ["realistic", "handsOn", "spatial"],
  ["communication", "social"],
  ["artistic", "creativity", "openness"],
  ["enterprising", "leadership"],
  ["conventional", "responsibility", "patience"]
];

const state = {
  view: "home",
  step: 0,
  answers: {},
  result: null,
  majors: [],
  compare: [],
  detail: null,
  loading: null,
  saving: false,
  notice: "",
  email: "",
  filters: { q: "", category: "", interest: "" },
  metaLoaded: false,
  majorsLoaded: false,
  metaRequested: false,
  majorsRequested: false
};

function q(id, keys, text, reverse = false, weight = 1) {
  return { id, keys, text, reverse, weight };
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(payload.message || `API ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return payload;
}

async function runLoading(label, job) {
  state.loading = label;
  state.notice = "";
  render();
  try {
    return await job();
  } finally {
    state.loading = null;
    render();
  }
}

function setView(view) {
  state.view = view;
  state.notice = "";
  render();
  if (view === "majors") bootstrapMajors();
}

function startAssessment() {
  state.step = 0;
  state.answers = {};
  state.result = null;
  state.detail = null;
  state.notice = "";
  state.view = "survey";
  render();
}

async function bootstrapMajors() {
  if (state.metaRequested) return;
  state.metaRequested = true;
  try {
    await runLoading("加载专业目录", async () => {
      const [meta, list] = await Promise.all([
        api("/major/api/meta"),
        api("/major/api/majors")
      ]);
      state.metaLoaded = true;
      state.majorsLoaded = true;
      state.majors = list.rows || [];
      state.meta = meta;
    });
  } catch (error) {
    state.metaRequested = false;
    state.notice = error.message || "专业目录加载失败。";
    render();
  }
}

function progressValue() {
  return Math.round((Object.keys(state.answers).length / questionIndex.length) * 100);
}

function navButton(view, label) {
  return `<button class="${state.view === view ? "active" : ""}" data-view="${view}">${label}</button>`;
}

function nav() {
  return `<header class="topbar">
    <div class="brand"><div class="mark">M</div><span>MajorTI</span></div>
    <nav class="nav">
      ${navButton("home", "首页")}
      ${navButton("survey", "测评")}
      ${navButton("majors", "专业库")}
    </nav>
  </header>`;
}

function home() {
  return `<section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">纯兴趣判断，不填地域和分数</p>
      <h1>先看你像什么，再看适合什么专业</h1>
      <p class="lead">MajorTI 用 24 道更贴近日常感受的题，帮还不太确定方向的高中生梳理兴趣画像，并给出可解释的专业推荐。</p>
      <div class="actions">
        <button class="primary" id="start">开始测评</button>
        <button class="secondary" data-view="majors">打开专业库</button>
      </div>
    </div>
    <aside class="hero-panel">
      <div>
        <h2>测评方式</h2>
        <p class="muted">按你现在真实的感受选，不用想成“理想中的自己”。</p>
      </div>
      <div class="signal-grid">
        <div class="signal"><b>24</b><span>道兴趣与倾向题</span></div>
        <div class="signal"><b>6</b><span>个结果维度</span></div>
        <div class="signal"><b>可选</b><span>邮箱保存结果</span></div>
        <div class="signal"><b>0</b><span>地域和分数输入</span></div>
      </div>
    </aside>
  </section>`;
}

function survey() {
  const group = questionGroups[state.step] || questionGroups[0];
  const answeredInGroup = group.questions.filter(qs => state.answers[qs.id]).length;
  return `<section class="panel">
    <div class="panel-head">
      <div>
        <h2>${group.title}</h2>
        <p class="muted">选择最接近你现在真实情况的答案，犹豫时选中间值也可以。</p>
      </div>
      <div class="pill">${state.step + 1}/${questionGroups.length}</div>
    </div>
    <div class="step-line"><span style="width:${progressValue()}%"></span></div>
    <p class="muted status-line">本组 ${answeredInGroup}/${group.questions.length}，总进度 ${Object.keys(state.answers).length}/${questionIndex.length}</p>
    ${state.step === 0 ? introNotice() : ""}${state.step === questionGroups.length - 1 ? finalStepForm() : ""}
    <div class="question-grid">${group.questions.map(questionCard).join("")}</div>
    <div class="toolbar">
      <button class="secondary" id="prev" ${state.step === 0 ? "disabled" : ""}>上一步</button>
      <div class="actions">
        <button class="primary" id="next">${state.step === questionGroups.length - 1 ? "发送结果" : "下一步"}</button>
      </div>
    </div>
  </section>`;
}

function introNotice() {
  return `<div class="notice-inline">
    <strong>这套题只看兴趣和偏好。</strong>
    <span>不需要填写地域、分数、学校类型这类信息。</span>
  </div>`;
}

function finalStepForm() {
  return `<div class="notice-inline final-step">
    <strong>完成后可选发送到邮箱。</strong>
    <span>留空也能继续，不会影响测评提交。</span>
    <div class="save-row final-email-row">
      <input type="email" data-email value="${escapeHtml(state.email)}" placeholder="邮箱（可选）" />
    </div>
  </div>`;
}

function questionCard(item) {
  const current = Number(state.answers[item.id] || 0);
  return `<article class="question-card">
    <strong>${item.text}</strong>
    <div class="circle-scale" role="group" aria-label="倾向选择">
      ${[1, 2, 3, 4, 5].map(n => {
        const labels = ["很不像我", "比较不像", "一般", "比较像", "非常像我"];
        return `<button class="circle-option ${current === n ? "selected" : ""} size-${n}" data-q="${item.id}" data-v="${n}" aria-label="${labels[n - 1]}">
          <span></span>
        </button>`;
      }).join("")}
    </div>
    <div class="scale-hint"><span>更弱</span><span>一般</span><span>更强</span></div>
  </article>`;
}

async function submitSurvey() {
  try {
    const result = await runLoading("生成推荐", async () => {
      return api("/major/api/assessment/submit", {
        method: "POST",
        body: { answers: state.answers, questions: questionIndex }
      });
    });
    state.result = result;
    const email = (state.email || "").trim();
    if (email) {
      await api("/major/api/assessment/save", {
        method: "POST",
        body: {
          email,
          result: state.result,
          studentVector: state.result.studentVector,
          recommendations: state.result.recommendations
        }
      });
      state.notice = "测评已完成，结果已发送到邮箱。";
    } else {
      state.notice = "测评已完成，留空邮箱不会发送邮件。";
    }
    state.view = "home";
    state.step = 0;
    state.answers = {};
    state.email = "";
    state.result = null;
    render();
  } catch (error) {
    state.notice = error.message || "推荐生成失败。";
    render();
  }
}

function summaryBars(vector) {
  const rows = [
    ["探究", average(vector, summaryKeys[0])],
    ["动手", average(vector, summaryKeys[1])],
    ["表达", average(vector, summaryKeys[2])],
    ["创意", average(vector, summaryKeys[3])],
    ["组织", average(vector, summaryKeys[4])],
    ["规范", average(vector, summaryKeys[5])]
  ];
  return `<div class="bars">${rows.map(([label, val]) => `
    <div>
      <div class="bar-label"><span>${label}</span><b>${Math.round(val * 100)}</b></div>
      <div class="bar"><span style="width:${Math.round(val * 100)}%"></span></div>
    </div>
  `).join("")}</div>`;
}

function majorCard(m) {
  const selected = state.compare.includes(m.id);
  return `<article class="major-card">
    <div>
      <h3>${escapeHtml(m.name)}</h3>
      <div class="meta">
        ${m.code ? `<span class="tag">专业代码 ${escapeHtml(m.code)}</span>` : ""}
        <span class="tag">${escapeHtml(m.category)}</span>
        <span class="tag">${escapeHtml(m.majorClass)}</span>
        <span class="tag">${escapeHtml(m.dataBasis || "目录对齐")}</span>
      </div>
      <p class="muted">${escapeHtml(m.description || "")}</p>
      <p>${escapeHtml((m.reasons || []).join("；"))}</p>
      <div class="actions">
        <button class="secondary" data-detail="${m.id}">详情</button>
        <button class="${selected ? "primary" : "ghost"}" data-compare="${m.id}">${selected ? "已加入对比" : "加入对比"}</button>
      </div>
    </div>
    <div class="score" style="--score:${m.match || 0}%"><span>${m.match ? `${m.match}%` : "目录"}</span></div>
  </article>`;
}

async function loadMajors() {
  const query = new URLSearchParams();
  if (state.filters.q) query.set("q", state.filters.q);
  if (state.filters.category) query.set("category", state.filters.category);
  if (state.filters.interest) query.set("interest", state.filters.interest);

  try {
    const data = await runLoading("加载专业列表", async () => {
      return api(`/major/api/majors?${query.toString()}`);
    });
    state.majors = data.rows || [];
    state.majorsLoaded = true;
    render();
  } catch (error) {
    state.notice = error.message || "专业列表加载失败。";
    render();
  }
}

function majorsView() {
  const categories = state.meta?.categories || [];
  return `<section class="panel">
    <div class="panel-head">
      <div>
        <h2>专业库</h2>
        <p class="muted">专业名称、门类和专业类对齐官方目录数据，未展示未经逐条核验的就业率或分数线。</p>
      </div>
    </div>
    <div class="filters">
      <input data-filter="q" value="${escapeAttr(state.filters.q)}" placeholder="搜索专业名、门类或专业类" />
      <select data-filter="category">
        <option value="">全部门类</option>
        ${categories.map(category => `<option value="${escapeAttr(category)}" ${category === state.filters.category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}
      </select>
      <select data-filter="interest">
        <option value="">全部偏好</option>
        ${interestOption("research", "研究探究")}
        ${interestOption("realistic", "动手实践")}
        ${interestOption("communication", "表达沟通")}
        ${interestOption("social", "协作助人")}
        ${interestOption("enterprising", "组织推进")}
        ${interestOption("creativity", "创意生成")}
      </select>
      <button class="primary" id="filter">筛选</button>
    </div>
    <div class="major-list">${state.majorsLoaded ? state.majors.map(m => majorCard({ ...m, reasons: ["专业名称和门类来自官方目录对齐数据"] })).join("") : skeletonList()}</div>
    ${compareBar()}
  </section>`;
}

function interestOption(value, label) {
  return `<option value="${value}" ${value === state.filters.interest ? "selected" : ""}>${label}</option>`;
}

function compareBar() {
  if (!state.compare.length) return "";
  return `<div class="compare-bar">
    <span>已选择 ${state.compare.length}/4 个专业对比</span>
    <div class="actions">
      <button class="secondary" id="clearCompare">清空</button>
      <button class="primary" id="showCompare">查看对比</button>
    </div>
  </div>`;
}

async function detail(id) {
  try {
    await runLoading("加载详情", async () => {
      state.detail = await api(`/major/api/majors/${id}`);
    });
    render();
  } catch (error) {
    state.notice = error.message || "详情加载失败。";
    render();
  }
}

async function compareModal() {
  try {
    await runLoading("加载对比", async () => {
      const data = await api("/major/api/majors/compare", {
        method: "POST",
        body: { ids: state.compare }
      });
      state.detail = { compareRows: data.rows };
    });
    render();
  } catch (error) {
    state.notice = error.message || "对比加载失败。";
    render();
  }
}

async function saveResult() {
  if (!state.result) return;
  const email = (state.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    state.notice = "邮箱格式看起来不太对，再检查一下。";
    render();
    return;
  }

  if (!email) {
    state.notice = "留空不会发送邮件。";
    render();
    return;
  }

  state.saving = true;
  state.notice = "";
  render();
  try {
    const response = await api("/major/api/assessment/save", {
      method: "POST",
      body: {
        email,
        result: state.result,
        studentVector: state.result.studentVector,
        recommendations: state.result.recommendations
      }
    });
    state.notice = response.message || "已保存到邮箱记录。";
  } catch (error) {
    state.notice = error.message || "保存失败。";
  } finally {
    state.saving = false;
    render();
  }
}

function modal() {
  if (!state.detail) return "";
  if (state.detail.compareRows) {
    const rows = state.detail.compareRows;
    return `<div class="overlay">
      <div class="modal">
        <div class="toolbar">
          <h2>专业对比</h2>
          <button class="ghost" id="closeModal">关闭</button>
        </div>
        <div class="table-wrap">
          <table>
            <tr><th>维度</th>${rows.map(r => `<th>${escapeHtml(r.name)}</th>`).join("")}</tr>
            ${compareRow("专业代码", rows.map(r => escapeHtml(r.code || "未配置")))}
            ${compareRow("门类", rows.map(r => escapeHtml(r.category)))}
            ${compareRow("专业类", rows.map(r => escapeHtml(r.majorClass)))}
            ${compareRow("数据依据", rows.map(r => escapeHtml(r.dataBasis || "目录对齐")))}
            ${compareRow("说明", rows.map(r => escapeHtml(r.sourceNote || "仅展示目录与来源说明")))}
          </table>
        </div>
      </div>
    </div>`;
  }
  const m = state.detail;
  return `<div class="overlay">
    <div class="modal">
      <div class="toolbar">
        <h2>${escapeHtml(m.name)}</h2>
        <button class="ghost" id="closeModal">关闭</button>
      </div>
      <div class="meta">
        <span class="tag">${escapeHtml(m.category)}</span>
        <span class="tag">${escapeHtml(m.majorClass)}</span>
        <span class="tag">${escapeHtml(m.degree || "")}</span>
        <span class="tag">${escapeHtml(`${m.duration || ""} 年`)}</span>
      </div>
      <p>${escapeHtml(m.description || "")}</p>
      <h3>数据说明</h3>
      <p>${escapeHtml(m.verifiedDetailStatus || "专业名称、门类和专业类对齐官方目录数据。")}</p>
      <h3>来源</h3>
      <p>${(m.sources || []).map(s => `${escapeHtml(s.name)}（${escapeHtml(s.url)}）`).join("；")}</p>
      <p class="muted">${escapeHtml(m.sourceNote || "")}</p>
    </div>
  </div>`;
}

function compareRow(label, cells) {
  return `<tr><th>${escapeHtml(label)}</th>${cells.map(cell => `<td>${cell}</td>`).join("")}</tr>`;
}

function loadingOverlay() {
  if (!state.loading) return "";
  return `<div class="loading-overlay" aria-live="polite">
    <div class="loading-card">
      <div class="spinner" aria-hidden="true"></div>
      <div>
        <strong>${escapeHtml(state.loading)}</strong>
        <p class="muted">请稍等一下。</p>
      </div>
    </div>
  </div>`;
}

function skeletonList() {
  return Array.from({ length: 4 }).map(() => `
    <article class="major-card skeleton">
      <div>
        <div class="skeleton-line w-40"></div>
        <div class="skeleton-line w-65"></div>
        <div class="skeleton-line w-90"></div>
      </div>
      <div class="score skeleton-score"></div>
    </article>
  `).join("");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

function average(vector, keys) {
  return keys.reduce((sum, key) => sum + (vector?.[key] || 0), 0) / keys.length;
}

function wire() {
  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.addEventListener("click", () => setView(btn.dataset.view));
  });

  document.querySelector("#start")?.addEventListener("click", startAssessment);

  document.querySelectorAll("[data-q]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.answers[btn.dataset.q] = Number(btn.dataset.v);
      render();
    });
  });

  document.querySelector("#prev")?.addEventListener("click", () => {
    state.step = Math.max(0, state.step - 1);
    render();
  });

  document.querySelector("#next")?.addEventListener("click", async () => {
    if (state.step < questionGroups.length - 1) {
      state.step += 1;
      render();
      return;
    }
    await submitSurvey();
  });

  document.querySelectorAll("[data-filter]").forEach(el => {
    el.addEventListener("input", () => {
      state.filters[el.dataset.filter] = el.value;
    });
    el.addEventListener("change", () => {
      state.filters[el.dataset.filter] = el.value;
    });
  });

  document.querySelector("#filter")?.addEventListener("click", loadMajors);

  document.querySelectorAll("[data-detail]").forEach(btn => {
    btn.addEventListener("click", () => detail(btn.dataset.detail));
  });

  document.querySelectorAll("[data-compare]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.compare);
      state.compare = state.compare.includes(id) ? state.compare.filter(item => item !== id) : [...state.compare, id].slice(0, 4);
      render();
    });
  });

  document.querySelector("#clearCompare")?.addEventListener("click", () => {
    state.compare = [];
    render();
  });

  document.querySelector("#showCompare")?.addEventListener("click", compareModal);

  document.querySelector("#closeModal")?.addEventListener("click", () => {
    state.detail = null;
    render();
  });

  document.querySelector("[data-email]")?.addEventListener("input", ev => {
    state.email = ev.target.value;
  });
}

function route() {
  if (state.view === "survey") return survey();
  if (state.view === "majors") return majorsView();
  return home();
}

function render() {
  app.innerHTML = `<div class="shell">${nav()}<main class="main">${state.notice ? `<div class="global-notice">${escapeHtml(state.notice)}</div>` : ""}${route()}${modal()}${loadingOverlay()}</main></div>`;
  wire();
}

render();
