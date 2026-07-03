const config = window.SIGNUP_CONFIG || {};
const form = document.querySelector("#signupForm");
const usernameInput = document.querySelector("#username");
const phoneInput = document.querySelector("#phone");
const sessionInputs = [...document.querySelectorAll('input[name="sessions"]')];
const submitBtn = document.querySelector("#submitBtn");
const message = document.querySelector("#formMessage");
const successPanel = document.querySelector("#successPanel");
const successText = document.querySelector("#successText");
const resetBtn = document.querySelector("#resetBtn");

const phonePattern = /^1[3-9]\d{9}$/;
const localStorageKey = "huian_worldcup_signups";

function setMessage(text) {
  message.textContent = text;
}

function maskPhone(phone) {
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
}

function selectedSessions() {
  return sessionInputs.filter((input) => input.checked).map((input) => input.value);
}

function localBackup(record) {
  const saved = JSON.parse(localStorage.getItem(localStorageKey) || "[]");
  saved.push(record);
  localStorage.setItem(localStorageKey, JSON.stringify(saved));
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadLocalCsv() {
  const saved = JSON.parse(localStorage.getItem(localStorageKey) || "[]");
  const rows = [["提交时间", "活动", "报名场次", "用户名", "手机号", "来源页面"], ...saved.map((item) => [
    item.submittedAt,
    item.eventName,
    (item.sessions || []).join(" | "),
    item.username,
    item.phone,
    item.pageUrl,
  ])];
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "huian-signups.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

async function submitToEndpoint(record) {
  if (!config.endpointUrl) {
    throw new Error("报名接口尚未配置，请先部署 Worker 并填写 config.js 的 endpointUrl。");
  }

  const response = await fetch(config.endpointUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok !== true) {
    throw new Error(result.message || "提交失败，请稍后再试。");
  }

  return result;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim();
  const phone = phoneInput.value.trim();
  const sessions = selectedSessions();

  if (sessions.length === 0) {
    setMessage("请选择至少一场观赛活动");
    sessionInputs[0].focus();
    return;
  }

  if (!username) {
    setMessage("请填写用户名");
    usernameInput.focus();
    return;
  }

  if (!phonePattern.test(phone)) {
    setMessage("请填写正确的手机号");
    phoneInput.focus();
    return;
  }

  const record = {
    eventName: config.eventName || "2026美加墨世界杯线下观赛报名",
    sessions,
    username,
    phone,
    pageUrl: location.href,
    submittedAt: new Date().toISOString(),
  };

  submitBtn.disabled = true;
  setMessage("正在提交...");

  try {
    await submitToEndpoint(record);
    localBackup(record);
    successText.textContent = `${username}，已报名 ${sessions.length} 场，手机号 ${maskPhone(phone)}。`;
    form.hidden = true;
    successPanel.hidden = false;
  } catch (error) {
    localBackup(record);
    setMessage(error.message);
  } finally {
    submitBtn.disabled = false;
  }
});

phoneInput.addEventListener("input", () => {
  phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 11);
  setMessage("");
});

usernameInput.addEventListener("input", () => {
  setMessage("");
});

sessionInputs.forEach((input) => {
  input.addEventListener("change", () => {
    setMessage("");
  });
});

resetBtn.addEventListener("click", () => {
  form.reset();
  form.hidden = false;
  successPanel.hidden = true;
  setMessage("");
  usernameInput.focus();
});

window.downloadHuianSignupBackup = downloadLocalCsv;
