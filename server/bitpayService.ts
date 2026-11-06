/**
 * BitPay (bitpay.ir) Payment Gateway Service
 * Documentation & Workflow:
 * 1. Send form-data to https://bitpay.ir/payment/gateway-send
 *    - api (Merchant API key - required)
 *    - amount (Amount in Rials - minimum 1000 IRR)
 *    - redirect (Callback URL - required)
 *    - name, email, description, factorId (optional)
 *    Response: Integer id_get > 0 => Redirect to https://bitpay.ir/payment/gateway-${id_get}-get
 * 2. Callback from bank portal to redirect URL with query: trans_id, id_get
 * 3. Verify transaction at https://bitpay.ir/payment/gateway-result-second
 *    - api, trans_id, id_get, json: 1
 *    Response: { status: 1 | 11, amount, cardNum, factorId }
 */

export interface BitpayRequestOptions {
  apiKey: string;
  amountTomans: number;
  redirectUrl: string;
  name?: string;
  email?: string;
  description?: string;
  factorId?: string | number;
}

export interface BitpayRequestResult {
  success: boolean;
  idGet?: number | string;
  paymentUrl?: string;
  code?: number;
  error?: string;
}

export interface BitpayVerifyOptions {
  apiKey: string;
  transId: string | number;
  idGet: string | number;
}

export interface BitpayVerifyResult {
  success: boolean;
  status: number;
  message?: string;
  amountRials?: number;
  amountTomans?: number;
  cardNum?: string;
  factorId?: string | number;
  error?: string;
}

export const BITPAY_ERROR_MESSAGES: Record<number, string> = {
  [-1]: 'خطا: کلید API ارسالی بیت‌پی معتبر نیست یا در سامانه bitpay.ir ثبت نشده است.',
  [-2]: 'خطا: مبلغ ارسالی داده عددی نمی‌باشد یا کمتر از ۱,۰۰۰ ریال (۱۰۰ تومان) است.',
  [-3]: 'خطا: آدرس بازگشت (Redirect URL) نامعتبر یا خالی است.',
  [-4]: 'خطا: درگاهی با اطلاعات ارسالی شما وجود ندارد و یا هنوز در وضعیت انتظار تایید می‌باشد.',
  [-5]: 'خطا: خطا در برقراری اتصال به شبکه شاپرک و درگاه بانکی، لطفاً مجدداً تلاش فرمایید.',
};

export const BITPAY_VERIFY_STATUS_MESSAGES: Record<number, string> = {
  1: 'تراکنش با موفقیت توسط خریدار در بانک پرداخت و توسط درگاه تایید شد.',
  11: 'تراکنش از قبل با موفقیت وریفای و تایید شده است.',
  [-1]: 'خطا: کلید API ارسالی بیت‌پی صحیح نیست.',
  [-2]: 'خطا: شناسه تراکنش (trans_id) ارسال شده عددی نمی‌باشد.',
  [-3]: 'خطا: شناسه پرداخت (id_get) ارسال شده عددی نمی‌باشد.',
  [-4]: 'خطا: چنین تراکنشی در پایگاه داده وجود ندارد یا پرداخت در بانک ناموفق بوده است.',
};

export class BitpayService {
  private readonly SEND_URL = 'https://bitpay.ir/payment/gateway-send';
  private readonly VERIFY_URL = 'https://bitpay.ir/payment/gateway-result-second';

  /**
   * Request a new payment transaction from BitPay
   */
  async requestPayment(options: BitpayRequestOptions): Promise<BitpayRequestResult> {
    const { apiKey, amountTomans, redirectUrl, name, email, description, factorId } = options;

    if (!apiKey || apiKey.trim() === '') {
      return {
        success: false,
        error: 'کلید API درگاه بیت‌پی (bitpay.ir) در تنظیمات سامانه وارد نشده است.',
      };
    }

    // Convert Tomans to Rials (1 Toman = 10 Rials)
    const amountRials = Math.round(amountTomans * 10);
    if (amountRials < 1000) {
      return {
        success: false,
        error: 'مبلغ تراکنش کمتر از حداقل مجاز درگاه بیت‌پی (۱,۰۰۰ ریال) است.',
      };
    }

    try {
      const formData = new FormData();
      formData.append('api', apiKey.trim());
      formData.append('amount', String(amountRials));
      formData.append('redirect', redirectUrl);
      if (name) formData.append('name', name);
      if (email) formData.append('email', email);
      if (description) formData.append('description', description);
      if (factorId !== undefined && factorId !== null) {
        formData.append('factorId', String(factorId));
      }

      const response = await fetch(this.SEND_URL, {
        method: 'POST',
        body: formData,
      });

      const responseText = (await response.text()).trim();
      const numCode = Number(responseText);

      // If response is a positive number, it's the id_get
      if (!isNaN(numCode) && numCode > 0) {
        const idGet = numCode;
        const paymentUrl = `https://bitpay.ir/payment/gateway-${idGet}-get`;
        return {
          success: true,
          idGet,
          paymentUrl,
        };
      }

      // If it's a known negative error code
      if (!isNaN(numCode) && numCode < 0) {
        const errorText = BITPAY_ERROR_MESSAGES[numCode] || `خطای درگاه بیت‌پی (کد: ${numCode})`;
        return {
          success: false,
          code: numCode,
          error: errorText,
        };
      }

      return {
        success: false,
        error: `پاسخ غیرمنتظره از بیت‌پی دریافت شد: ${responseText.slice(0, 100)}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `خطای برقراری ارتباط با وب‌سرویس بیت‌پی: ${err.message || 'شبکه قطع است'}`,
      };
    }
  }

  /**
   * Verify transaction after return from bank
   */
  async verifyPayment(options: BitpayVerifyOptions): Promise<BitpayVerifyResult> {
    const { apiKey, transId, idGet } = options;

    if (!apiKey || !transId || !idGet) {
      return {
        success: false,
        status: -1,
        error: 'پارامترهای تایید تراکنش (api، trans_id یا id_get) ناقص هستند.',
      };
    }

    try {
      const formData = new FormData();
      formData.append('api', apiKey.trim());
      formData.append('trans_id', String(transId));
      formData.append('id_get', String(idGet));
      formData.append('json', '1');

      const response = await fetch(this.VERIFY_URL, {
        method: 'POST',
        body: formData,
      });

      const jsonText = await response.text();
      let data: any;
      try {
        data = JSON.parse(jsonText);
      } catch {
        const num = Number(jsonText.trim());
        if (!isNaN(num)) {
          data = { status: num };
        } else {
          return {
            success: false,
            status: -99,
            error: `پاسخ نامعتبر از متد وریفای بیت‌پی: ${jsonText.slice(0, 100)}`,
          };
        }
      }

      const status = Number(data.status);
      const isSuccess = status === 1 || status === 11;

      if (isSuccess) {
        const amountRials = Number(data.amount) || 0;
        const amountTomans = Math.round(amountRials / 10);
        return {
          success: true,
          status,
          message: BITPAY_VERIFY_STATUS_MESSAGES[status] || 'تراکنش با موفقیت تایید شد.',
          amountRials,
          amountTomans,
          cardNum: data.cardNum ? String(data.cardNum) : undefined,
          factorId: data.factorId,
        };
      }

      const errorText = BITPAY_VERIFY_STATUS_MESSAGES[status] || `تراکنش توسط درگاه بیت‌پی تایید نشد (کد: ${status})`;
      return {
        success: false,
        status,
        error: errorText,
      };
    } catch (err: any) {
      return {
        success: false,
        status: -99,
        error: `خطای برقراری ارتباط در مرحله تایید پرداخت بیت‌پی: ${err.message || 'خطای شبکه'}`,
      };
    }
  }

  /**
   * Test connection using merchant API key
   */
  async testConnection(apiKey: string, redirectUrl = 'https://gaiafa.ir/test-callback'): Promise<{ success: boolean; message: string; details?: any }> {
    if (!apiKey || apiKey.trim().length < 5) {
      return {
        success: false,
        message: 'کلید API بیت‌پی وارد نشده یا بسیار کوتاه است.',
      };
    }

    // Try a test payment of 1,000 Tomans (10,000 Rials)
    const result = await this.requestPayment({
      apiKey,
      amountTomans: 1000,
      redirectUrl,
      description: 'آزمایش اتصال درگاه بیت‌پی سامانه ترجمه کتاب',
      factorId: 999999,
    });

    if (result.success) {
      return {
        success: true,
        message: `اتصال به وب‌سرویس درگاه بیت‌پی (BitPay) با موفقیت تایید شد! شناسه معتبر ایجاد شد (id_get: ${result.idGet})`,
        details: result,
      };
    }

    return {
      success: false,
      message: result.error || 'ارتباط با درگاه بیت‌پی برقرار نشد.',
      details: result,
    };
  }
}

export const bitpayService = new BitpayService();
