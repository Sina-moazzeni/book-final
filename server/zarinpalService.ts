/**
 * ZarinPal Payment Gateway Service (REST API v4)
 * Implements:
 * 1. Payment Request: https://payment.zarinpal.com/pg/v4/payment/request.json
 * 2. StartPay Redirect: https://payment.zarinpal.com/pg/StartPay/{authority}
 * 3. Payment Verify: https://payment.zarinpal.com/pg/v4/payment/verify.json
 */

export interface ZarinpalRequestOptions {
  merchantId: string;
  amountTomans: number;
  isSandbox?: boolean;
  currency?: 'IRT' | 'IRR';
  description: string;
  callbackUrl: string;
  mobile?: string;
  email?: string;
  orderId?: string;
  referer?: string;
}

export interface ZarinpalRequestResult {
  success: boolean;
  code?: number;
  message?: string;
  authority?: string;
  paymentUrl?: string;
  fee?: number;
  error?: string;
}

export interface ZarinpalVerifyOptions {
  merchantId: string;
  amountTomans: number;
  isSandbox?: boolean;
  currency?: 'IRT' | 'IRR';
  authority: string;
  referer?: string;
}

export function resolveRefererHeaders(customReferer?: string): { referer: string; origin: string } {
  let ref = (customReferer || 'https://gaiafa.ir/').trim();
  if (!ref.startsWith('http://') && !ref.startsWith('https://')) {
    ref = `https://${ref}`;
  }
  if (!ref.endsWith('/')) {
    ref = `${ref}/`;
  }
  const origin = ref.replace(/\/+$/, '');
  return { referer: ref, origin };
}

export interface ZarinpalVerifyResult {
  success: boolean;
  code?: number;
  message?: string;
  ref_id?: number | string;
  card_pan?: string;
  card_hash?: string;
  fee?: number;
  error?: string;
}

export const ZARINPAL_ERROR_MESSAGES: Record<number, string> = {
  [-9]: 'خطای اعتبارسنجی: مرچنت کد ۳۶ کاراکتری وارد شده نامعتبر است یا در سامانه زرین‌پال تایید نشده است.',
  [-10]: 'آی‌پی یا مرچنت کد پذیرنده در زرین‌پال ثبت نشده یا با دامنه هماهنگ نیست.',
  [-11]: 'مرچنت کد وارد شده در زرین‌پال غیرفعال است.',
  [-12]: 'تلاش بیش از حد در یک بازه زمانی کوتاه. لطفاً چند دقیقه بعد مجدداً تلاش فرمایید.',
  [-14]: 'دامنه آدرس بازگشت (Callback URL) با دامنه ثبت شده در زرین‌پال تطابق ندارد. (در حالت دمو طبیعی است؛ در سرور با دامنه اصلی بدون مشکل کار خواهد کرد، یا از حالت Sandbox استفاده کنید).',
  [-15]: 'درگاه پرداخت پذیرنده به دلیل تخلف توسط زرین‌پال یا شاپرک تعلیق شده است.',
  [-16]: 'سطح دسترسی یا نوع حساب پذیرنده برای این عملیات مجاز نیست.',
  [-30]: 'اجازه دسترسی به تسویه اشتراکی شناور وجود ندارد.',
  [-31]: 'حساب بانکی تسویه حساب توسط پذیرنده تعیین نشده است.',
  [-32]: 'فرمت اطلاعات وارد شده (شماره موبایل یا ایمیل) نامعتبر است.',
  [-33]: 'مبلغ تراکنش با رقم پرداخت شده توسط خریدار در بانک مطابقت ندارد.',
  [-34]: 'مبلغ تراکنش از سقف مجاز روزانه تراکنش درگاه فراتر است.',
  [-40]: 'پارامترهای ارسالی نامعتبر است.',
  [-50]: 'مبلغ تراکنش کمتر از حداقل مجاز (۱,۰۰۰ تومان در زرین‌پال) است.',
  [-51]: 'پرداخت ناموفق بود و توسط خریدار در درگاه بانک لغو شد یا تراکنش تکمیل نشد.',
  [-52]: 'خطای غیرمنتظره در ارتباط با شبکه شاپرک یا بانک عامل.',
  [-53]: 'تراکنش متعلق به این مرچنت کد نمی‌باشد.',
  [-54]: 'شناسه پرداخت (Authority) منقضی شده یا نامعتبر است.',
  100: 'عملیات با موفقیت انجام شد.',
  101: 'تراکنش قبلاً با موفقیت تایید و وریفای شده است.',
};

export class ZarinpalService {
  private getBaseUrl(isSandbox = false): string {
    return isSandbox ? 'https://sandbox.zarinpal.com' : 'https://api.zarinpal.com';
  }

  private getStartPayUrl(isSandbox = false, authority: string): string {
    return isSandbox
      ? `https://sandbox.zarinpal.com/pg/StartPay/${authority}`
      : `https://www.zarinpal.com/pg/StartPay/${authority}`;
  }

  /**
   * Request a new payment authority from Zarinpal API v4
   */
  async requestPayment(options: ZarinpalRequestOptions): Promise<ZarinpalRequestResult> {
    const {
      merchantId,
      amountTomans,
      isSandbox = false,
      currency = 'IRT',
      description,
      callbackUrl,
      mobile,
      email,
      orderId,
    } = options;

    if (!merchantId || merchantId.trim() === '') {
      return {
        success: false,
        error: 'کد مرچنت ۳۶ کاراکتری زرین‌پال در تنظیمات سیستم تعیین نشده است.',
      };
    }

    const cleanMerchant = merchantId.trim();
    // Currency conversion: if IRR is requested, multiply Tomans by 10
    const finalAmount = currency === 'IRR' ? Math.round(amountTomans * 10) : Math.round(amountTomans);

    const baseUrl = this.getBaseUrl(isSandbox);
    const requestEndpoint = `${baseUrl}/pg/v4/payment/request.json`;

    const payload = {
      merchant_id: cleanMerchant,
      amount: finalAmount,
      currency: currency === 'IRR' ? 'IRR' : 'IRT',
      description: description || 'شارژ کیف پول سامانه ترجمه کتاب',
      callback_url: callbackUrl,
      metadata: {
        mobile: mobile ? mobile.trim() : undefined,
        email: email ? email.trim() : undefined,
        order_id: orderId || undefined,
      },
    };

    const { referer: refererHeader, origin: originHeader } = resolveRefererHeaders(options.referer);

    try {
      const response = await fetch(requestEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ZarinPal Rest Api v4',
          'Referer': refererHeader,
          'Origin': originHeader,
        },
        body: JSON.stringify(payload),
      });

      const json: any = await response.json().catch(() => null);

      if (!json) {
        return {
          success: false,
          error: `پاسخ نامعتبر از سرور زرین‌پال دریافت شد (وضعیت HTTP: ${response.status})`,
        };
      }

      // Check for validation errors array/object
      if (json.errors && Object.keys(json.errors).length > 0) {
        const errCode = json.errors.code || -9;
        const errMsg = json.errors.message || ZARINPAL_ERROR_MESSAGES[errCode] || 'خطای اعتبارسنجی در زرین‌پال';
        return {
          success: false,
          code: errCode,
          error: `${errMsg} (کد: ${errCode})`,
        };
      }

      const data = json.data;
      if (data && (data.code === 100 || data.authority)) {
        const authority = data.authority;
        const paymentUrl = this.getStartPayUrl(isSandbox, authority);
        return {
          success: true,
          code: data.code,
          message: data.message || 'درخواست پرداخت موفق',
          authority,
          paymentUrl,
          fee: data.fee,
        };
      }

      const code = data?.code || -1;
      const errorText = ZARINPAL_ERROR_MESSAGES[code] || data?.message || 'خطا در ایجاد درخواست پرداخت در زرین‌پال';
      return {
        success: false,
        code,
        error: `${errorText} (کد: ${code})`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `خطای برقراری ارتباط با زرین‌پال: ${err.message || 'شبکه قطع است'}`,
      };
    }
  }

  /**
   * Verify an existing payment authority with Zarinpal API v4
   */
  async verifyPayment(options: ZarinpalVerifyOptions): Promise<ZarinpalVerifyResult> {
    const {
      merchantId,
      amountTomans,
      isSandbox = false,
      currency = 'IRT',
      authority,
      referer,
    } = options;

    if (!merchantId || !authority) {
      return {
        success: false,
        error: 'مرچنت کد یا کد Authority یافت نشد.',
      };
    }

    const cleanMerchant = merchantId.trim();
    const finalAmount = currency === 'IRR' ? Math.round(amountTomans * 10) : Math.round(amountTomans);
    const baseUrl = this.getBaseUrl(isSandbox);
    const verifyEndpoint = `${baseUrl}/pg/v4/payment/verify.json`;

    const payload = {
      merchant_id: cleanMerchant,
      amount: finalAmount,
      authority: authority.trim(),
    };

    const { referer: refererHeader, origin: originHeader } = resolveRefererHeaders(referer);

    try {
      const response = await fetch(verifyEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ZarinPal Rest Api v4',
          'Referer': refererHeader,
          'Origin': originHeader,
        },
        body: JSON.stringify(payload),
      });

      const json: any = await response.json().catch(() => null);

      if (!json) {
        return {
          success: false,
          error: `پاسخ نامعتبر از متد وریفای زرین‌پال (HTTP: ${response.status})`,
        };
      }

      if (json.errors && Object.keys(json.errors).length > 0) {
        const errCode = json.errors.code || -1;
        const errMsg = json.errors.message || ZARINPAL_ERROR_MESSAGES[errCode] || 'خطای اعتبارسنجی تایید تراکنش';
        return {
          success: false,
          code: errCode,
          error: `${errMsg} (کد: ${errCode})`,
        };
      }

      const data = json.data;
      if (data && (data.code === 100 || data.code === 101)) {
        return {
          success: true,
          code: data.code,
          message: data.code === 101 ? 'تراکنش قبلاً با موفقیت تایید شده بود' : 'تراکنش با موفقیت تایید شد',
          ref_id: data.ref_id,
          card_pan: data.card_pan,
          card_hash: data.card_hash,
          fee: data.fee,
        };
      }

      const code = data?.code || -1;
      const errorText = ZARINPAL_ERROR_MESSAGES[code] || data?.message || 'تراکنش توسط درگاه بانک یا زرین‌پال تایید نشد';
      return {
        success: false,
        code,
        error: `${errorText} (کد: ${code})`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `خطای برقراری ارتباط در مرحله تایید پرداخت: ${err.message || 'خطای شبکه'}`,
      };
    }
  }

  /**
   * Health-check / ping test for admin gateway configuration
   */
  async testConnection(merchantId: string, isSandbox = false, currency: 'IRT' | 'IRR' = 'IRT', referer = 'https://gaiafa.ir/'): Promise<{ success: boolean; message: string; details?: any }> {
    if (!merchantId || merchantId.trim().length < 10) {
      return {
        success: false,
        message: 'مرچنت کد وارد شده بسیار کوتاه یا نامعتبر است (کد ۳۶ کاراکتری زرین‌پال مورد نیاز است).',
      };
    }

    // Attempt test request of 1,000 Tomans with Referer & Origin header
    const result = await this.requestPayment({
      merchantId,
      amountTomans: 1000,
      isSandbox,
      currency,
      description: 'تست اتصال سامانه ترجمه کتاب به درگاه زرین‌پال',
      callbackUrl: 'https://gaiafa.ir/test-callback',
      referer,
    });

    if (result.success) {
      return {
        success: true,
        message: `اتصال وب‌سرویس زرین‌پال با موفقیت تایید شد! شناسه معتبر ایجاد شد (${result.authority})`,
        details: result,
      };
    }

    return {
      success: false,
      message: result.error || 'ارتباط با زرین‌پال برقرار نشد.',
      details: result,
    };
  }
}

export const zarinpalService = new ZarinpalService();
