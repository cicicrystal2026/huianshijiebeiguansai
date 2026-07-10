# 域名空间部署说明

本仓库是活动报名 H5 页面，域名为：

```txt
http://mjm.chindaliy.com.cn
```

页面是静态 H5，但报名数据需要由 PHP 接口写入 CSV。请域名空间服务商按本说明部署。

## 1. 部署方式

请将 GitHub 仓库 `cicicrystal2026/huianshijiebeiguansai` 的 `main` 分支完整部署到网站根目录。

网站根目录应包含以下层级：

```txt
网站根目录/
  index.html
  app.js
  config.js
  styles.css
  test.html
  assets/
  api/
    config.php
    health/
      index.php
    register/
      index.php
    export/
      index.php
  data/
    .htaccess
```

其中：

- `index.html`、`app.js`、`styles.css`、`assets/` 是前端页面文件。
- `config.js` 配置前端提交接口，当前接口为 `./api/register/`。
- `api/register/index.php` 接收报名数据。
- `api/export/index.php` 导出 CSV。
- `api/health/index.php` 用于检查 PHP 是否正常。
- `data/` 用于保存报名数据，需要 PHP 可写权限。

## 2. PHP 环境要求

请确认空间支持 PHP，建议 PHP 5.6 或以上。无需 MySQL 数据库。

请确保 `data/` 目录 Web 服务用户可写。提交成功后会自动生成：

```txt
data/signups.csv.php
data/signups.jsonl.php
```

如果提交时报：

```txt
数据目录不可写，请检查 data 目录权限
```

请将 `data/` 目录调整为 PHP 可写。

## 3. 导出密码

部署前请打开：

```txt
api/config.php
```

把默认导出密码：

```php
define('SIGNUP_EXPORT_TOKEN', 'Huian2026_change_this_token');
```

改为正式的长随机密码，并将密码告知客户。

默认密码未修改时，导出接口会拒绝导出。

## 4. 测试链接

部署完成后，请依次测试：

### PHP 健康检查

```txt
http://mjm.chindaliy.com.cn/api/health/
```

预期返回：

```json
{"ok":true}
```

### 测试提交页

```txt
http://mjm.chindaliy.com.cn/test.html
```

点击“提交测试报名”，预期返回：

```json
{"ok":true,"id":"...","message":"报名成功"}
```

### 正式页面提交

打开：

```txt
http://mjm.chindaliy.com.cn/
```

选择场次，填写用户名和手机号，点击“确认报名”。页面应显示报名成功。

### 数据文件确认

提交成功后，服务器应生成：

```txt
data/signups.csv.php
data/signups.jsonl.php
```

### 导出 CSV

```txt
http://mjm.chindaliy.com.cn/api/export/?token=正式导出密码
```

浏览器应下载：

```txt
huian-signups.csv
```

## 5. 安全说明

报名数据文件使用 `.php` 后缀，并在文件开头写入 `<?php exit; ?>` 保护头，避免被浏览器直接下载。

如果服务器是 Apache，`data/.htaccess` 会禁止直接访问 `data/` 目录。

如果服务器是 Nginx，建议额外增加：

```nginx
location ^~ /data/ {
    deny all;
}
```
