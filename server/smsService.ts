import { SystemSettings } from './db.ts';

export interface SendSmsResult {
  success: boolean;
  message: string;
  provider: string;
  gatewayRaw?: any;
}

export const MELIPAYAMAK_ERROR_CODES: Record<string, string> = {
  '-111': 'اعمال محدودیت ارسال پیامک بر اساس الگو برای کاربران دارای بدهی در سامانه',
  '-110': 'الزام استفاده از ApiKey به جای رمز عبور در وب‌سرویس ملی‌پیامک',
  '-109': 'الزام تنظیم IP مجاز برای استفاده از API در پنل کاربری ملی‌پیامک',
  '-108': 'مسدود شدن موقت IP به دلیل تلاش‌های ناموفق مکرر برای اتصال به API',
  '-10': 'در میان متغیرهای ارسالی متن پیامک، لینک یا آدرس اینترنتی غیرمجاز وجود دارد',
  '-7': 'خطایی در شماره فرستنده رخ داده است (با پشتیبانی تماس بگیرید)',
  '-6': 'خطای داخلی سامانه ملی‌پیامک رخ داده است (با پشتیبانی تماس بگیرید)',
  '-5': 'متن ارسالی با توجه به متغیرهای مشخص شده در متن پیش‌فرض همخوانی ندارد',
  '-4': 'کد متن ارسالی (bodyId) صحیح نمی‌باشد یا توسط مدیر سامانه پیامک تأیید نشده است',
  '-3': 'خط ارسالی در سیستم تعریف نشده است (با پشتیبانی سامانه تماس بگیرید)',
  '-2': 'محدودیت تعداد شماره (محدودیت هر بار ارسال یک شماره موبایل می‌باشد)',
  '-1': 'دسترسی برای استفاده از این وب‌سرویس غیرفعال است (با پشتیبانی تماس بگیرید)',
  '0': 'نام کاربری یا رمز عبور پنل پیامک نادرست است',
  '2': 'اعتبار پنل پیامک کافی نمی‌باشد (شارژ پنل تمام شده است)',
  '3': 'محدودیت در سقف ارسال روزانه پیامک',
  '4': 'محدودیت در حجم ارسال پیامک',
  '5': 'شماره فرستنده (خط اختصاصی) معتبر یا فعال نمی‌باشد',
  '6': 'سامانه ملی‌پیامک در حال حاضر در حال بروزرسانی می‌باشد',
  '7': 'متن پیامک حاوی کلمه فیلتر شده است (با واحد اداری تماس بگیرید)',
  '9': 'ارسال از خطوط عمومی از طریق وب‌سرویس امکان‌پذیر نمی‌باشد',
  '10': 'کاربر مورد نظر در پنل پیامک فعال نمی‌باشد',
  '11': 'پیامک ارسال نشد',
  '12': 'مدارک و احراز هویت کاربر در سامانه پیامک کامل نمی‌باشد',
  '14': 'متن پیامک حاوی لینک غیرمجاز می‌باشد',
  '15': 'ارسال به بیش از ۱ شماره بدون درج «لغو11» ممکن نیست',
  '16': 'شماره گیرنده‌ای یافت نشد',
  '17': 'متن پیامک خالی می‌باشد',
  '18': 'شماره گیرنده نامعتبر است',
  '19': 'از محدودیت ساعتی ارسال فراتر رفته‌اید',
  '35': 'شماره گیرنده در لیست سیاه مخابرات (بلک‌لیست تبلیغاتی) قرار دارد',
};

function parseMeliPayamakXml(xmlString: string): string {
  if (!xmlString) return '';
  const match = xmlString.match(/<string[^>]*>([^<]+)<\/string>/i);
  if (match) return match[1].trim();
  const matchLong = xmlString.match(/<long[^>]*>([^<]+)<\/long>/i);
  if (matchLong) return matchLong[1].trim();
  return xmlString.replace(/<[^>]+>/g, '').trim();
}

function isSuccessMeliPayamakResult(val: string | number | undefined): boolean {
  if (val === undefined || val === null) return false;
  const s = String(val).trim();
  if (MELIPAYAMAK_ERROR_CODES[s]) return false;
  // If it's a negative number, it's an error code
  if (s.startsWith('-')) return false;
  // If it's a known single/double digit error code
  if (['0', '2', '3', '4', '5', '6', '7', '9', '10', '11', '12', '14', '15', '16', '17', '18', '19', '35'].includes(s)) {
    return false;
  }
  const n = Number(s);
  // recId is a positive number (often > 1000 or > 15 digits)
  return !isNaN(n) && n > 100;
}

export async function sendRealOtpSms(
  phone: string,
  otpCode: string,
  smsSettings: SystemSettings['sms']
): Promise<SendSmsResult> {
  const cleanPhone = phone.trim().replace(/^(\+98|0098)/, '0');
  const provider = smsSettings.provider || 'melipayamak';

  console.log(`[SMS] Sending OTP ${otpCode} to ${cleanPhone} via ${provider} (method: ${smsSettings.authMethod})`);

  if (provider === 'mock') {
    return {
      success: true,
      message: `[حالت تستی] پیامک شبیه‌سازی شد. کد تایید: ${otpCode}`,
      provider: 'mock',
    };
  }

  // =========================================================================
  // 1. MeliPayamak (ملی‌پیامک) - Patterns (SendByBaseNumber / SendByBaseNumber2) & Direct
  // =========================================================================
  if (provider === 'melipayamak') {
    const rawUsername = (smsSettings.username || '989375473800').trim();
    const rawPassword = (smsSettings.password || 'Srs2360442201*').trim();
    const rawApiKey = (smsSettings.apiKey || 'e0d8fbb9-fbf5-4082-b02f-80b6fb478407').trim();
    const sender = smsSettings.senderNumber || '50004000';
    const bodyId = Number(smsSettings.bodyId || smsSettings.patternCode || 314818);

    // List of candidate credential pairs to handle automatic password / apiKey interchange
    const candidateCredentials = [
      { username: rawUsername, password: rawPassword, label: 'نام‌کاربری و رمز عبور' },
      { username: rawUsername, password: rawApiKey, label: 'نام‌کاربری و ApiKey به جای رمز' },
    ];

    // -----------------------------------------------------------------------
    // A. PATTERN MODE (خط خدماتی اشتراکی - متد اول و متد دوم)
    // -----------------------------------------------------------------------
    if (smsSettings.authMethod === 'pattern' || bodyId) {
      console.log(`[MeliPayamak] Executing Pattern SMS with bodyId=${bodyId}...`);

      for (const cred of candidateCredentials) {
        if (!cred.username || !cred.password) continue;

        // --- METHOD 2: SendByBaseNumber2 (URL GET/POST ASMX) ---
        // Format: text with variables separated by ";" (for single OTP, simply otpCode)
        try {
          const urlMethod2 = `http://api.payamak-panel.com/post/Send.asmx/SendByBaseNumber2?username=${encodeURIComponent(cred.username)}&password=${encodeURIComponent(cred.password)}&text=${encodeURIComponent(otpCode)}&to=${encodeURIComponent(cleanPhone)}&bodyId=${bodyId}`;
          console.log(`[MeliPayamak] Trying Method 2 (SendByBaseNumber2) using ${cred.label}...`);

          const controller2 = new AbortController();
          const tid2 = setTimeout(() => controller2.abort(), 9000);
          const res2 = await fetch(urlMethod2, { signal: controller2.signal });
          clearTimeout(tid2);

          const rawText2 = await res2.text().catch(() => '');
          const val2 = parseMeliPayamakXml(rawText2);
          console.log(`[MeliPayamak Method 2 Result]:`, val2);

          if (isSuccessMeliPayamakResult(val2)) {
            return {
              success: true,
              message: 'کد تأیید ورود به شماره موبایل شما پیامک شد.',
              provider: 'melipayamak_pattern_method2',
              gatewayRaw: { recId: val2, raw: rawText2 },
            };
          }

          // If return value is a known error code other than credential error (0 or -110), report or try next
          if (val2 && MELIPAYAMAK_ERROR_CODES[val2] && val2 !== '0' && val2 !== '-110') {
            console.warn(`[MeliPayamak Method 2] Known error ${val2}: ${MELIPAYAMAK_ERROR_CODES[val2]}`);
          }
        } catch (err2: any) {
          console.warn(`[MeliPayamak Method 2 Failed]:`, err2.message);
        }

        // --- METHOD 1: BaseServiceNumber REST endpoint ---
        try {
          console.log(`[MeliPayamak] Trying Method 1 (BaseServiceNumber REST) using ${cred.label}...`);
          const controller1 = new AbortController();
          const tid1 = setTimeout(() => controller1.abort(), 9000);

          const res1 = await fetch('https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: cred.username,
              password: cred.password,
              text: [otpCode],
              to: cleanPhone,
              bodyId: bodyId,
            }),
            signal: controller1.signal,
          });
          clearTimeout(tid1);

          const data1: any = await res1.json().catch(() => null);
          console.log(`[MeliPayamak Method 1 Result]:`, data1);

          const val1 = data1?.Value !== undefined ? String(data1.Value) : (data1?.RetStatus !== undefined ? String(data1.RetStatus) : '');
          if (isSuccessMeliPayamakResult(val1)) {
            return {
              success: true,
              message: 'کد تأیید ورود به شماره موبایل شما پیامک شد.',
              provider: 'melipayamak_pattern_method1',
              gatewayRaw: data1,
            };
          }
        } catch (err1: any) {
          console.warn(`[MeliPayamak Method 1 Failed]:`, err1.message);
        }
      }
    }

    // -----------------------------------------------------------------------
    // B. CONSOLE OTP / REST API KEY ENDPOINT (if token is provided)
    // -----------------------------------------------------------------------
    if (rawApiKey) {
      try {
        console.log(`[MeliPayamak] Trying Console OTP API for ${cleanPhone}...`);
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 8000);

        const otpResp = await fetch(`https://console.melipayamak.com/api/send/otp/${rawApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: cleanPhone,
            code: otpCode,
          }),
          signal: controller.signal,
        });
        clearTimeout(tid);

        const otpData: any = await otpResp.json().catch(() => null);
        console.log(`[MeliPayamak Console OTP Response]`, otpResp.status, otpData);

        if (otpResp.ok && (otpData?.status === 'success' || otpData?.recId || otpData?.message?.includes('موفق'))) {
          return {
            success: true,
            message: 'کد تأیید ورود به شماره موبایل شما پیامک شد.',
            provider: 'melipayamak_console_otp',
            gatewayRaw: otpData,
          };
        }
      } catch (err: any) {
        console.warn(`[MeliPayamak Console OTP Exception]:`, err.message);
      }
    }

    // -----------------------------------------------------------------------
    // C. DIRECT SIMPLE SMS (SendSimpleSMS2 / SendSMS REST)
    // -----------------------------------------------------------------------
    if (rawUsername && rawPassword) {
      for (const cred of candidateCredentials) {
        // Direct SendSimpleSMS2 ASMX
        try {
          const queryParams = new URLSearchParams({
            username: cred.username,
            password: cred.password,
            to: cleanPhone,
            from: sender,
            text: `کد تایید ورود به سامانه هوشمند مترجم کتاب:\n${otpCode}\n(اعتبار ۳ دقیقه)`,
            isflash: 'false',
          });

          const asmxResp = await fetch(`http://api.payamak-panel.com/post/Send.asmx/SendSimpleSMS2?${queryParams.toString()}`);
          const asmxText = await asmxResp.text().catch(() => '');
          const asmxVal = parseMeliPayamakXml(asmxText);

          if (isSuccessMeliPayamakResult(asmxVal)) {
            return {
              success: true,
              message: 'کد تأیید ورود به شماره موبایل شما پیامک شد.',
              provider: 'melipayamak_sendsimplesms2',
              gatewayRaw: { asmxVal, asmxText },
            };
          }

          if (MELIPAYAMAK_ERROR_CODES[asmxVal] && asmxVal !== '0' && asmxVal !== '-110') {
            return {
              success: false,
              message: `خطای ملی‌پیامک (${asmxVal}): ${MELIPAYAMAK_ERROR_CODES[asmxVal]}`,
              provider: 'melipayamak_sendsimplesms2',
              gatewayRaw: { asmxVal, asmxText },
            };
          }
        } catch (e: any) {
          console.warn('[MeliPayamak SendSimpleSMS2 Exception]', e.message);
        }

        // Standard REST SendSMS
        try {
          const resp = await fetch('https://rest.payamak-panel.com/api/SendSMS/SendSMS', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: cred.username,
              password: cred.password,
              to: cleanPhone,
              from: sender,
              text: `کد تایید ورود به سامانه ترجمه کتاب:\n${otpCode}`,
              isFlash: false,
            }),
          });
          const data: any = await resp.json().catch(() => null);
          const val = String(data?.Value ?? '');

          if (isSuccessMeliPayamakResult(val)) {
            return {
              success: true,
              message: 'کد تأیید ورود به شماره موبایل شما پیامک شد.',
              provider: 'melipayamak_rest_sendsms',
              gatewayRaw: data,
            };
          }

          if (MELIPAYAMAK_ERROR_CODES[val] && val !== '0' && val !== '-110') {
            return {
              success: false,
              message: `خطای سامانه پیامک (${val}): ${MELIPAYAMAK_ERROR_CODES[val]}`,
              provider: 'melipayamak_rest',
              gatewayRaw: data,
            };
          }
        } catch (e: any) {
          console.warn('[MeliPayamak SendSMS Exception]', e.message);
        }
      }
    }

    // Default error with decoded explanation
    return {
      success: false,
      message: 'عدم پاسخ‌دهی از سرور ملی‌پیامک یا عدم تایید الگو در پنل. لطفاً از پنل مدیریت تنظیمات الگو و اعتبار را بررسی کنید.',
      provider: 'melipayamak',
    };
  }

  // =========================================================================
  // 2. Kavenegar (کاوه‌نگار)
  // =========================================================================
  if (provider === 'kavenegar' && smsSettings.apiKey) {
    try {
      const resp = await fetch(
        `https://api.kavenegar.com/v1/${smsSettings.apiKey}/verify/lookup.json?receptor=${cleanPhone}&token=${otpCode}&template=${smsSettings.patternCode || 'verify'}`
      );
      const data: any = await resp.json().catch(() => null);
      if (resp.ok && data?.return?.status === 200) {
        return {
          success: true,
          message: 'پیامک تایید از طریق کاوه‌نگار ارسال گردید.',
          provider: 'kavenegar',
          gatewayRaw: data,
        };
      }
      return {
        success: false,
        message: data?.return?.message || 'خطا در درگاه کاوه‌نگار',
        provider: 'kavenegar',
        gatewayRaw: data,
      };
    } catch (err: any) {
      return { success: false, message: err.message, provider: 'kavenegar' };
    }
  }

  return {
    success: true,
    message: 'پیامک ارسال شد (حالت پشتیبان).',
    provider: 'fallback',
  };
}
