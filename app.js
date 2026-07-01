const form = document.querySelector("#signupForm");
const usernameInput = document.querySelector("#username");
const phoneInput = document.querySelector("#phone");
const message = document.querySelector("#formMessage");
const successPanel = document.querySelector("#successPanel");
const successText = document.querySelector("#successText");
const resetBtn = document.querySelector("#resetBtn");

const phonePattern = /^1[3-9]\d{9}$/;
const storageKey = "migu_worldcup_signups";

function showError(text) {
  message.textContent = text;
}

function maskPhone(phone) {
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
}

function saveSignup(record) {
  const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
  existing.push(record);
  localStorage.setItem(storageKey, JSON.stringify(existing));
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim();
  const phone = phoneInput.value.trim();

  if (!username) {
    showError("请填写用户名");
    usernameInput.focus();
    return;
  }

  if (!phonePattern.test(phone)) {
    showError("请填写正确的手机号");
    phoneInput.focus();
    return;
  }

  const record = {
    username,
    phone,
    submittedAt: new Date().toISOString(),
  };

  saveSignup(record);
  successText.textContent = `${username}，手机号 ${maskPhone(phone)} 已完成报名。`;
  form.hidden = true;
  successPanel.hidden = false;
});

phoneInput.addEventListener("input", () => {
  phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 11);
  showError("");
});

usernameInput.addEventListener("input", () => {
  showError("");
});

resetBtn.addEventListener("click", () => {
  form.reset();
  showError("");
  successPanel.hidden = true;
  form.hidden = false;
  usernameInput.focus();
});
