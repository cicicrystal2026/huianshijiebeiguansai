# PHP 报名接口

这是给支持 PHP 的虚拟主机/备案空间用的最小报名后台。上传后，H5 报名会写入服务器 CSV。

## 上传位置

把本目录里的内容上传到网站根目录，和 `index.html` 同级：

```txt
网站根目录/
  index.html
  config.js
  app.js
  styles.css
  test.html
  assets/
  api/
    config.php
    health/index.php
    register/index.php
    export/index.php
  data/
    .htaccess
```

## 前端配置

`config.js` 已经配置为相对路径：

```js
window.SIGNUP_CONFIG = {
  endpointUrl: "./api/register/",
  eventName: "2026美加墨世界杯线下观赛招募",
};
```

## 导出密码

打开 `api/config.php`，把：

```php
define('SIGNUP_EXPORT_TOKEN', 'Huian2026_change_this_token');
```

改成只有你知道的长密码。默认密码未修改时，导出接口会拒绝导出。

## 测试

健康检查：

```txt
http://mjm.chindaliy.com.cn/api/health/
```

测试提交页：

```txt
http://mjm.chindaliy.com.cn/test.html
```

导出 CSV：

```txt
http://mjm.chindaliy.com.cn/api/export/?token=你的导出密码
```
