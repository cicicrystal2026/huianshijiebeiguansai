const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const csvHeader = "submittedAt,eventName,sessions,username,phone,pageUrl,userAgent,ip\n";

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  try {
    const record = normalizeRecord(req.body || {}, req);
    validateRecord(record);
    await appendCsvRow(record);
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message || "Submit failed" });
  }
}

function setCors(res) {
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.setHeader(key, value);
  }
}

function normalizeRecord(payload, req) {
  return {
    submittedAt: payload.submittedAt || new Date().toISOString(),
    eventName: String(payload.eventName || ""),
    sessions: Array.isArray(payload.sessions) ? payload.sessions.map((item) => String(item)) : [],
    username: String(payload.username || "").trim(),
    phone: String(payload.phone || "").trim(),
    pageUrl: String(payload.pageUrl || ""),
    userAgent: req.headers["user-agent"] || "",
    ip: String(req.headers["x-forwarded-for"] || "").split(",")[0].trim(),
  };
}

function validateRecord(record) {
  if (!record.sessions.length) {
    throw new Error("请选择至少一场观赛活动");
  }
  if (!record.username) {
    throw new Error("用户名不能为空");
  }
  if (!/^1[3-9]\d{9}$/.test(record.phone)) {
    throw new Error("手机号格式不正确");
  }
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function encodeUtf8Base64(text) {
  return Buffer.from(text, "utf8").toString("base64");
}

function decodeBase64Utf8(base64) {
  return Buffer.from(base64.replace(/\n/g, ""), "base64").toString("utf8");
}

async function appendCsvRow(record) {
  const owner = requireEnv("GH_OWNER");
  const repo = requireEnv("GH_REPO");
  const token = requireEnv("GH_TOKEN");
  const branch = process.env.GH_BRANCH || "main";
  const path = process.env.GH_FILE_PATH || "data/registrations.csv";

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`;
  const getResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
    headers: githubHeaders(token),
  });

  let content = csvHeader;
  let sha;

  if (getResponse.status === 200) {
    const file = await getResponse.json();
    sha = file.sha;
    content = normalizeCsvHeader(decodeBase64Utf8(file.content));
    if (!content.endsWith("\n")) {
      content += "\n";
    }
  } else if (getResponse.status !== 404) {
    throw new Error(`读取 GitHub 表格失败: ${getResponse.status}`);
  }

  const row = [
    record.submittedAt,
    record.eventName,
    record.sessions.join(" | "),
    record.username,
    record.phone,
    record.pageUrl,
    record.userAgent,
    record.ip,
  ].map(csvEscape).join(",");

  content += `${row}\n`;

  const putBody = {
    message: `Add signup: ${record.username}`,
    content: encodeUtf8Base64(content),
    branch,
  };
  if (sha) {
    putBody.sha = sha;
  }

  const putResponse = await fetch(apiUrl, {
    method: "PUT",
    headers: githubHeaders(token),
    body: JSON.stringify(putBody),
  });

  if (!putResponse.ok) {
    const text = await putResponse.text();
    throw new Error(`写入 GitHub 表格失败: ${putResponse.status} ${text.slice(0, 120)}`);
  }
}

function normalizeCsvHeader(content) {
  const oldHeader = "submittedAt,eventName,username,phone,pageUrl,userAgent,ip";
  const newHeader = csvHeader.trim();
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);

  if (lines[0] === newHeader) {
    return content;
  }

  if (lines[0] === oldHeader) {
    lines[0] = newHeader;
    return lines.join("\n");
  }

  return `${csvHeader}${content.replace(/^\uFEFF/, "")}`;
}

function requireEnv(name) {
  if (!process.env[name]) {
    throw new Error(`后端缺少环境变量 ${name}`);
  }
  return process.env[name];
}

function githubHeaders(token) {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "huian-signup-vercel",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}
