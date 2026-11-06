import React, { useRef } from 'react';
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  CheckCircle2,
  Building2,
  User,
  Calendar,
  CreditCard,
  QrCode,
  FileCheck
} from 'lucide-react';
import { TransactionRecord, User as UserType, BookProject } from '../types.ts';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: TransactionRecord | null;
  book?: BookProject | null;
  currentUser: UserType;
  invoiceType?: 'tax' | 'proforma';
}

function numberToPersianWords(num: number): string {
  if (num === 0) return 'صفر تومان';
  const units = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const hundreds = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];

  const scales = ['', 'هزار', 'میلیون', 'میلیارد'];

  function convertGroup(n: number): string {
    const parts: string[] = [];
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const t = Math.floor(rem / 10);
    const u = rem % 10;

    if (h > 0) parts.push(hundreds[h]);
    if (rem >= 10 && rem < 20) {
      parts.push(teens[rem - 10]);
    } else {
      if (t > 0) parts.push(tens[t]);
      if (u > 0) parts.push(units[u]);
    }
    return parts.join(' و ');
  }

  const chunks: string[] = [];
  let temp = Math.abs(num);
  let scaleIdx = 0;

  while (temp > 0) {
    const group = temp % 1000;
    if (group > 0) {
      const gStr = convertGroup(group);
      const scaleStr = scales[scaleIdx];
      chunks.unshift(scaleStr ? `${gStr} ${scaleStr}` : gStr);
    }
    temp = Math.floor(temp / 1000);
    scaleIdx++;
  }

  return `${chunks.join(' و ')} تومان`;
}

export function InvoiceModal({
  isOpen,
  onClose,
  transaction,
  book,
  currentUser,
  invoiceType = transaction ? 'tax' : 'proforma',
}: InvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const isProforma = Boolean(book) || invoiceType === 'proforma';
  const prefix = isProforma ? 'PRO' : 'INV';
  const dateSource = transaction?.createdAt || Date.now();
  const rawId = transaction?.id || book?.id || '982145';
  const invoiceNumber = `${prefix}-${new Date(dateSource).getFullYear()}-${rawId.replace(/[^0-9]/g, '').slice(-6) || '104829'}`;

  const transactionDate = new Date(dateSource).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const rawAmount = Math.abs(transaction ? transaction.amount : (book?.estimatedCost || (book ? (book.wordCount || 0) * 45 : 50000)));
  const taxAmount = 0; // معاف از مالیات بر ارزش افزوده خدمات نرم‌افزاری ابری
  const finalPayable = rawAmount + taxAmount;

  const descriptionText = transaction?.description || (book
    ? `پیش‌فاکتور رسمی ترجمه و صفحه‌بندی کتاب «${book.title}» (${book.wordCount?.toLocaleString('fa-IR') || '۰'} کلمه)`
    : 'ارائه خدمات ترجمه و پردازش ابری کتاب');

  const handlePrint = () => {
    window.print();
  };

  const getGatewayLabel = (gw?: string) => {
    switch (gw) {
      case 'zarinpal': return 'درگاه پرداخت شاپرک زرین‌پال';
      case 'zibal': return 'درگاه بانکی شاپرک زیبال';
      case 'nextpay': return 'درگاه نکست‌پی';
      case 'idpay': return 'درگاه امن آیدی‌پی';
      case 'stripe': return 'استرایپ بین‌الملل';
      case 'manual': return 'واریز یا تخصیص اعتباری مدیریت';
      default: return 'درگاه پرداخت الکترونیک شتابی';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="no-print p-4 sm:px-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                {invoiceType === 'tax' ? 'صورت‌حساب رسمی الکترونیک (فاکتور مالیاتی)' : 'پیش‌فاکتور رسمی سامانه'}
              </h3>
              <p className="text-[11px] text-slate-400">شناسه پیگیری و استناد قانونی معتبر جهت حسابداری و امور مالیاتی</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ یا ذخیره PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-900 font-['Vazirmatn'] text-right" dir="rtl">
          <div
            ref={invoiceRef}
            className="bg-white text-slate-900 p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full"
          >
            {/* Invoice Top Header */}
            <div className="border-b-2 border-slate-900 pb-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
                  <Building2 className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    سامانه هوشمند ترجمه و پردازش ابری کتاب
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">ارائه‌دهنده خدمات تخصصی صفحه‌بندی، واژه‌نامه یکپارچه و ترجمه هوش مصنوعی</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-left w-full sm:w-auto text-xs space-y-1 font-mono">
                <div><span className="font-bold text-slate-700">شماره صورت‌حساب:</span> <span className="font-bold text-slate-900">{invoiceNumber}</span></div>
                <div><span className="font-bold text-slate-700">تاریخ صدور:</span> <span className="text-slate-800">{transactionDate}</span></div>
                <div><span className="font-bold text-slate-700">وضعیت سند:</span> <span className="text-emerald-700 font-bold">پرداخت و ثبت نهایی قطعی</span></div>
              </div>
            </div>

            {/* Parties Info Grid: Seller & Buyer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-xs">
              {/* Seller */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 mb-2 flex items-center gap-1.5 text-amber-700">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>مشخصات ارائه‌دهنده خدمات (فروشنده)</span>
                </h4>
                <div className="space-y-1.5 text-slate-700 leading-relaxed">
                  <div><strong>نام واحد:</strong> سامانه ابری ترجمه کتاب (پلتفرم تجاری GaiaFa)</div>
                  <div><strong>نوع فعالیت:</strong> خدمات پردازش ابری، هوش مصنوعی و نشر دیجیتال</div>
                  <div><strong>پشتیبانی آنلاین:</strong> support@booktranslator.ir | تلفن: ۰۲۱-۸۸۸۸۹۹۹۹</div>
                  <div><strong>شناسه ثبت نرم‌افزاری:</strong> IR-SaaS-982145-AI</div>
                </div>
              </div>

              {/* Buyer */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 mb-2 flex items-center gap-1.5 text-indigo-700">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>مشخصات مشترک / متقاضی (خریدار)</span>
                </h4>
                <div className="space-y-1.5 text-slate-700 leading-relaxed">
                  <div><strong>نام / عنوان:</strong> {currentUser.name || 'کاربر گرامی'}</div>
                  <div><strong>شماره تماس:</strong> <span className="font-mono">{currentUser.phone || 'ثبت در سیستم'}</span></div>
                  <div><strong>پست الکترونیک:</strong> <span className="font-mono">{currentUser.email || '-'}</span></div>
                  <div><strong>شناسه اشتراک کاربری:</strong> <span className="font-mono text-[11px] text-slate-500">{currentUser.id}</span></div>
                </div>
              </div>
            </div>

            {/* Services Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-xs text-right border-collapse border border-slate-300">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2.5 border border-slate-300 text-center w-12">ردیف</th>
                    <th className="p-2.5 border border-slate-300">شرح خدمت / کالا</th>
                    <th className="p-2.5 border border-slate-300 text-center">نوع سرویس</th>
                    <th className="p-2.5 border border-slate-300 text-center">نحوه تسویه</th>
                    <th className="p-2.5 border border-slate-300 text-left">مبلغ کل (تومان)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  <tr>
                    <td className="p-3 border border-slate-300 text-center font-mono">۱</td>
                    <td className="p-3 border border-slate-300">
                      <div className="font-bold text-slate-900">{descriptionText}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        شامل پردازش ابری در سرور، استخراج واژه‌نامه تخصصی، صفحه‌بندی کتاب و خروجی Word/PDF
                      </div>
                    </td>
                    <td className="p-3 border border-slate-300 text-center">پردازش ابری (Cloud SaaS)</td>
                    <td className="p-3 border border-slate-300 text-center text-slate-700">
                      {transaction ? getGatewayLabel(transaction.gateway) : 'پیش‌فاکتور رسمی'}
                    </td>
                    <td className="p-3 border border-slate-300 text-left font-mono font-bold text-sm text-slate-900">
                      {rawAmount.toLocaleString('fa-IR')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals & Price in Words */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-4 mb-6">
              <div className="bg-amber-500/10 border border-amber-300 rounded-xl p-3.5 flex-1 text-xs">
                <span className="font-bold text-amber-900 block mb-1">مبلغ به حروف:</span>
                <span className="font-bold text-slate-900 text-sm">{numberToPersianWords(finalPayable)}</span>
                <div className="text-[11px] text-slate-600 mt-2">
                  کلیه مبالغ به تومان بوده و طبق ماده ۹ قانون مالیات بر ارزش افزوده خدمات نرم‌افزاری و پژوهشی دارای نرخ معافیت مالیاتی می‌باشند.
                </div>
              </div>

              <div className="w-full sm:w-72 bg-slate-50 border border-slate-300 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>جمع کل خدمات:</span>
                  <span className="font-mono font-bold">{rawAmount.toLocaleString('fa-IR')} تومان</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>تخفیف / تسهیلات:</span>
                  <span className="font-mono">۰ تومان</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>مالیات بر ارزش افزوده:</span>
                  <span className="font-mono">۰ تومان</span>
                </div>
                <div className="pt-2 border-t border-slate-300 flex justify-between font-bold text-sm text-emerald-800">
                  <span>مبلغ پرداخت شده:</span>
                  <span className="font-mono">{finalPayable.toLocaleString('fa-IR')} تومان</span>
                </div>
              </div>
            </div>

            {/* Banking Audit & Verification Stamp */}
            <div className="border-t border-slate-200 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-center shrink-0 p-1">
                  {/* Digital QR Code representation */}
                  <svg className="w-12 h-12 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm8-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h4v4h-4v-4zm-4 4h4v4h-4v-4zm4 0h2v2h-2v-2zm-6-4h2v2h-2v-2zm2 2h2v2h-2v-2z"/>
                  </svg>
                </div>
                <div className="space-y-0.5 text-slate-600 font-mono text-[11px]">
                  <div><strong>{transaction ? 'کد پیگیری شاپرک:' : 'کد رهگیری پیش‌فاکتور:'}</strong> {transaction?.trackingCode || `PRO-${rawId.slice(-6)}`}</div>
                  {transaction?.refId && <div><strong>شماره مرجع بانکی (RefId):</strong> {transaction.refId}</div>}
                  {transaction?.cardPan && <div><strong>شماره کارت پرداخت‌کننده:</strong> {transaction.cardPan}</div>}
                  <div className="text-emerald-700 font-bold">{transaction ? 'تراکنش در پایگاه داده شاپرک اعتبارسنجی شده است' : 'پیش‌فاکتور رسمی معتبر جهت ارائه به امور مالی و حسابداری'}</div>
                </div>
              </div>

              {/* Official Digital Seal */}
              <div className="border-2 border-dashed border-emerald-600 bg-emerald-50 rounded-2xl p-3 text-center min-w-[200px]">
                <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-black text-xs mb-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>ممهور به مهر دیجیتال مالی</span>
                </div>
                <div className="text-[10px] text-emerald-700 leading-tight">
                  سامانه پردازش ابری کتاب<br/>
                  پرداخت تایید شده الکترونیک شاپرک
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
