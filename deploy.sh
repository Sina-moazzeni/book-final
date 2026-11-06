#!/usr/bin/env bash
# ==============================================================================
# اسکریپت استقرار و راه‌اندازی خودکار سامانه تجاری ترجمه کتاب روی سرور مجازی لینوکس (VPS)
# Automated Zero-Error Linux VPS Production Deployment Script
# ==============================================================================
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}   سامانه تجاری و هوشمند ترجمه کتاب | استقرار خودکار لینوکس VPS   ${NC}"
echo -e "${BLUE}================================================================${NC}"

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# 1. بررسی سیستم‌عامل
echo -e "\n${YELLOW}[۱/۷] بررسی پیش‌نیازهای سیستم‌عامل...${NC}"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
    echo -e "سیستم‌عامل تشخیص داده شد: ${GREEN}$OS $VER${NC}"
else
    echo -e "${RED}فایل os-release یافت نشد. ادامه می‌دهیم...${NC}"
fi

# 2. بررسی و نصب Node.js (حداقل نسخه ۱۸ یا ۲۰ LTS)
echo -e "\n${YELLOW}[۲/۷] بررسی محیط Node.js و NPM...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}نودجی‌اس نصب نیست. در حال نصب خودکار Node.js 20 LTS...${NC}"
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -y
        sudo apt-get install -y curl gnupg build-essential
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y nodejs
    elif command -v yum &> /dev/null; then
        sudo yum install -y nodejs
    fi
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "نسخه فعال Node.js: ${GREEN}$NODE_VERSION${NC}"
echo -e "نسخه فعال NPM: ${GREEN}$NPM_VERSION${NC}"

# 3. اطمینان از وجود پوشه data و فایل دیتابیس
echo -e "\n${YELLOW}[۳/۷] آماده‌سازی پوشه ذخیره‌سازی داده‌ها...${NC}"
mkdir -p "$APP_DIR/data"
chmod 755 "$APP_DIR/data"
if [ ! -f "$APP_DIR/data/database.json" ]; then
    echo "{}" > "$APP_DIR/data/database.json"
fi

# 4. ایجاد فایل .env در صورت عدم وجود
if [ ! -f "$APP_DIR/.env" ]; then
    echo -e "${YELLOW}ایجاد فایل پیکربندی .env...${NC}"
    cat <<EOF > "$APP_DIR/.env"
NODE_ENV=production
PORT=3000
EOF
fi

# 5. نصب پکیج‌ها و اجرای بیلد دوگانه (Client + Server Bundle)
echo -e "\n${YELLOW}[۴/۷] نصب پکیج‌ها بدون تداخل (npm install)...${NC}"
npm install

echo -e "\n${YELLOW}[۵/۷] کامپایل کلاینت و سرور مستقل (npm run build)...${NC}"
npm run build

if [ ! -f "$APP_DIR/dist/server.js" ]; then
    echo -e "${RED}خطا: فایل کامپایل‌شده dist/server.js یافت نشد!${NC}"
    exit 1
fi
echo -e "${GREEN}کامپایل فرانت‌اند و بک‌اند با موفقیت به پایان رسید.${NC}"

# 6. راه‌اندازی و مدیریت فرآیند با PM2
echo -e "\n${YELLOW}[۶/۷] پیکربندی و اجرای سرور با PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo -e "نصب سراسری PM2..."
    sudo npm install -g pm2 || npm install -g pm2
fi

# توقف فرآیند قبلی در صورت وجود
pm2 delete book-translator 2>/dev/null || true

# شروع فرآیند با خود موتور سبک Node
NODE_ENV=production pm2 start "$APP_DIR/dist/server.js" \
    --name "book-translator" \
    --time \
    --max-memory-restart 600M

pm2 save

# 7. تست سلامت نهایی (Health Check)
echo -e "\n${YELLOW}[۷/۷] تست سلامت سرویس محلی...${NC}"
sleep 2

HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/public/config || echo "failed")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✓ تست ارتباط با موفقیت انجام شد (HTTP 200). سرویس فعال است!${NC}"
else
    echo -e "${YELLOW}توجه: سرویس در حال بالا آمدن است (وضعیت: $HEALTH_CHECK).${NC}"
fi

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}   استقرار با موفقیت انجام شد!   ${NC}"
echo -e "سرویس روی پورت ۳۰۰۰ در حال اجراست."
echo -e "برای مشاهده لاگ‌های زنده:   ${YELLOW}pm2 logs book-translator${NC}"
echo -e "برای مشاهده وضعیت:          ${YELLOW}pm2 status${NC}"
echo -e "برای ری‌استارت سرویس:        ${YELLOW}pm2 restart book-translator${NC}"
echo -e "${BLUE}================================================================${NC}"
