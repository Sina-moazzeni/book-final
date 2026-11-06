# راهنمای جامع و تضمینی استقرار سامانه تجاری ترجمه کتاب روی سرور مجازی لینوکس (VPS Guide)

این راهنما ویژه بالا آوردن بدون خطای سامانه روی **سرور مجازی اختصاصی (VPS)** مجهز به اوبونتو (Ubuntu 20.04 / 22.04 / 24.04) یا دبیان (Debian) تهیه شده است.

---

## 🚀 روش فوق‌سریع و اتوماتیک (پیشنهادی با اسکریپت ۱-کلیکه `deploy.sh`)

پروژه به اسکریپت خودکار و هوشمند `deploy.sh` مجهز است که تمام مراحل (بررسی و نصب Node.js 20 LTS، ایجاد پوشه‌ها، نصب پکیج‌ها، بیلد دوگانه کلاینت و سرور، تنظیم PM2، و تست سلامت پورت ۳۰۰۰) را بدون نیاز به تایپ دستی دستورات انجام می‌دهد:

```bash
# وارد پوشه پروژه روی سرور مجازی شوید:
cd /var/www/book-translator

# دسترسی اجرا به اسکریپت را بدهید و آن را اجرا کنید:
chmod +x deploy.sh
./deploy.sh
```

اسکریپت پس از چند ثانیه خروجی سبز رنگ موفقیت را نمایش داده و سامانه را روی پورت ۳۰۰۰ بالا می‌آورد.

---

## 🛠 روش دستی گام‌به‌گام (Step-by-Step Manual Setup)

اگر مایلید مراحل را به صورت دستی اجرا و نظارت فرمایید:

### مرحله ۱: نصب پیش‌نیازهای اولیه در سرور لینوکس
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx build-essential
```

### مرحله ۲: نصب Node.js 20 LTS و PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```
بررسی صحت نصب:
```bash
node -v   # باید v20.x باشد
npm -v
```

### مرحله ۳: کلون یا انتقال پروژه و بیلد نهایی
```bash
cd /var/www/book-translator

# نصب وابستگی‌ها بدون خطای ERESOLVE
npm install

# اجرای بیلد کامل (تولید dist/index.html برای کلاینت و dist/server.js برای سرور)
npm run build
```

### مرحله ۴: اجرا در پس‌زمینه با PM2 و ذخیره برای ریبوت خودکار
```bash
NODE_ENV=production pm2 start dist/server.js --name "book-translator" --max-memory-restart 600M
pm2 save
pm2 startup
```

*(دستور خروجی `pm2 startup` را کپی و اجرا نمایید تا پس از ری‌استارت شدن سرور، سایت خودکار بالا بیاید).*

---

## 🌐 پیکربندی Nginx برای ساب‌دامین یا دامنه اصلی

فایل کانفیگ وب‌سرور Nginx را بسازید:
```bash
sudo nano /etc/nginx/sites-available/book-translator
```

محتوای بهینه‌سازی‌شده زیر را قرار دهید (ساب‌دامین خود را جایگزین کنید):
```nginx
server {
    listen 80;
    server_name sub.yourdomain.ir; # نام دامنه یا ساب‌دامین شما

    # سقف حجم آپلود برای فایل‌های قطور کتاب (PDF، DOCX، EPUB تا ۱۰۰ مگابایت)
    client_max_body_size 100M;

    # فوروارد ترافیک به سمت سرور نودجی‌اس
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }
}
```

فعال‌سازی کانفیگ در Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/book-translator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### دریافت گواهی امنیتی SSL رایگان (HTTPS با Let's Encrypt):
```bash
sudo certbot --nginx -d sub.yourdomain.ir
```
*(ربات خودکار گواهینامه معتبر SSL نصب کرده و ریدایرکت خودکار به HTTPS را فعال می‌نماید).*

---

## 🔒 تنظیم فایروال لینوکس (UFW Firewall)

برای امنیت سرور و جلوگیری از حملات:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 📋 ابزارهای نظارت و مانیتورینگ زنده سرور

- **مشاهده لاگ‌های خطای زنده و لاگ‌های وب‌سرویس:**
  ```bash
  pm2 logs book-translator
  ```
- **بررسی مصرف رم و پردازنده سرور به صورت گرافیکی در ترمینال:**
  ```bash
  pm2 monit
  ```
- **ری‌استارت کردن سریع برنامه بدون قطعی ترافیک:**
  ```bash
  pm2 reload book-translator
  ```

---

## 👤 حساب‌های پیش‌فرض سامانه جهت ورود اولیه

- **مدیر ارشد سامانه (Super Admin):**
  - شماره همراه: `09120000000` یا ایمیل: `admin@translator.ir`
  - رمز عبور: `Admin@123456`
  - امکانات: تعریف درگاه‌های بانکی، تعیین نرخ کلمه‌ای، پیکربندی استخر هوش مصنوعی، تنظیمات پیامک OTP، صدور کدهای تخفیف و دانلود بکاپ دیتابیس.

- **کاربر نمونه تستی:**
  - شماره همراه: `09121111111` یا ایمیل: `user@translator.ir`
  - رمز عبور: `User@123456`
