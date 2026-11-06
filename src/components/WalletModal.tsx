import React, { useState, useEffect } from 'react';
import {
  X,
  Wallet,
  CreditCard,
  History,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { TransactionRecord, User } from '../types.ts';
import { InvoiceModal } from './InvoiceModal.tsx';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onBalanceUpdated: (newBalance: number) => void;
}

export function WalletModal({ isOpen, onClose, user, onBalanceUpdated }: WalletModalProps) {
  const [activeTab, setActiveTab] = useState<'recharge' | 'history'>('recharge');
  const [amount, setAmount] = useState<number>(100000);
  const [gateway, setGateway] = useState<'zarinpal' | 'bitpay' | 'zibal' | 'nextpay' | 'idpay'>('zarinpal');
  const [activeGateways, setActiveGateways] = useState<{
    zarinpal: boolean;
    bitpay: boolean;
    zibal: boolean;
    nextpay: boolean;
    idpay: boolean;
    stripe: boolean;
  }>({
    zarinpal: true,
    bitpay: true,
    zibal: true,
    nextpay: false,
    idpay: false,
    stripe: false,
  });
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [selectedInvoiceTx, setSelectedInvoiceTx] = useState<TransactionRecord | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
      fetchActiveGateways();
    }
  }, [isOpen]);

  const fetchActiveGateways = async () => {
    try {
      const res = await fetch('/api/public/config');
      if (res.ok) {
        const data = await res.json();
        if (data.gateways) {
          setActiveGateways(data.gateways);
          // Auto-select first enabled gateway
          if (data.gateways.zarinpal) {
            setGateway('zarinpal');
          } else if (data.gateways.bitpay) {
            setGateway('bitpay');
          } else if (data.gateways.zibal) {
            setGateway('zibal');
          } else if (data.gateways.nextpay) {
            setGateway('nextpay');
          } else if (data.gateways.idpay) {
            setGateway('idpay');
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch active gateways');
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/user/transactions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.warn('Could not fetch transactions');
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/coupons/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'کد تخفیف نامعتبر است.');
      setStatusMessage({ type: 'success', text: data.message });
      if (data.newBalance !== undefined) {
        onBalanceUpdated(data.newBalance);
      }
      setCouponCode('');
      fetchTransactions();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setApplyingCoupon(false);
    }
  };

  if (!isOpen) return null;

  const quickAmounts = [50000, 100000, 200000, 500000, 1000000];

  const handleRecharge = async () => {
    if (!amount || amount < 10000) {
      setStatusMessage({ type: 'error', text: 'حداقل مبلغ شارژ 10,000 تومان است.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      // Create invoice in system and redirect to payment gateway
      const invoiceRes = await fetch('/api/payment/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ amount, gateway }),
      });

      const invoiceData = await invoiceRes.json();
      if (!invoiceRes.ok) throw new Error(invoiceData.error || 'خطا در ایجاد فاکتور');

      // Direct redirect to payment gateway
      const gatewayName = gateway === 'bitpay' ? 'بیت‌پی (شاپرک)' : gateway === 'zarinpal' ? 'زرین‌پال' : gateway === 'zibal' ? 'زیبال' : 'بانکی';
      setStatusMessage({ type: 'success', text: `در حال انتقال مستقیم به درگاه پرداخت اینترنتی ${gatewayName}...` });
      const redirectUrl = invoiceData.paymentUrl || `/payment/gateway/${invoiceData.transactionId}`;
      window.location.href = redirectUrl;
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'خطا در پرداخت' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 font-['Vazirmatn']">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">مدیریت کیف پول و تراکنش‌ها</h3>
              <p className="text-xs text-slate-400">
                موجودی فعلی: <span className="font-bold text-amber-400">{user.walletBalance.toLocaleString('en-US')} تومان</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('recharge')}
            className={`flex-1 py-2 rounded-xl text-center flex items-center justify-center gap-2 transition-all ${
              activeTab === 'recharge'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>افزایش موجودی</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-xl text-center flex items-center justify-center gap-2 transition-all ${
              activeTab === 'history'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>تاریخچه تراکنش‌ها ({transactions.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          {statusMessage && (
            <div
              className={`mb-4 sm:mb-5 p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {activeTab === 'recharge' ? (
            <div className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  انتخاب مبالغ پیشنهادی شارژ (تومان):
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {quickAmounts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setAmount(q)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                        amount === q
                          ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {q.toLocaleString('en-US')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  یا مبلغ دلخواه (تومان):
                </label>
                <input
                  type="number"
                  min="10000"
                  step="10000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  درگاه پرداخت بانکی:
                </label>
                {(!activeGateways.zarinpal && !activeGateways.bitpay && !activeGateways.zibal && !activeGateways.nextpay && !activeGateways.idpay) ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center">
                    در حال حاضر هیچ درگاه پرداختی توسط مدیریت فعال نشده است. لطفاً با پشتیبانی سامانه تماس حاصل فرمایید.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {activeGateways.bitpay && (
                      <button
                        type="button"
                        onClick={() => setGateway('bitpay')}
                        className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
                          gateway === 'bitpay'
                            ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs text-white flex items-center gap-1.5">
                            <span>بیت‌پی (BitPay)</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">مستقیم</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">درگاه مستقیم شاپرک / سداد</div>
                        </div>
                        <CreditCard className="w-4 h-4 text-emerald-400" />
                      </button>
                    )}

                    {activeGateways.zarinpal && (
                      <button
                        type="button"
                        onClick={() => setGateway('zarinpal')}
                        className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
                          gateway === 'zarinpal'
                            ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs text-white">زرین‌پال (ZarinPal)</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">شبکه شاپرک و کارت‌های شتاب</div>
                        </div>
                        <CreditCard className="w-4 h-4 text-amber-400" />
                      </button>
                    )}

                    {activeGateways.zibal && (
                      <button
                        type="button"
                        onClick={() => setGateway('zibal')}
                        className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
                          gateway === 'zibal'
                            ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs text-white">زیبال (Zibal)</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">درگاه پرداخت هوشمند</div>
                        </div>
                        <CreditCard className="w-4 h-4 text-emerald-400" />
                      </button>
                    )}

                    {activeGateways.nextpay && (
                      <button
                        type="button"
                        onClick={() => setGateway('nextpay')}
                        className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
                          gateway === 'nextpay'
                            ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs text-white">نکست‌پی (NextPay)</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">سریع و چندبانکی</div>
                        </div>
                        <CreditCard className="w-4 h-4 text-blue-400" />
                      </button>
                    )}

                    {activeGateways.idpay && (
                      <button
                        type="button"
                        onClick={() => setGateway('idpay')}
                        className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
                          gateway === 'idpay'
                            ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs text-white">آیدی‌پی (IDPay)</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">پرداخت مستقیم شاپرک</div>
                        </div>
                        <CreditCard className="w-4 h-4 text-purple-400" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Coupon / Promo Code Form */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  کد تخفیف یا شارژ هدیه:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. WELCOME50"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={applyingCoupon || !couponCode.trim()}
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 transition disabled:opacity-40"
                  >
                    {applyingCoupon ? '...' : 'اعمال کد'}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>اتصال با پروتکل امن به سامانه شاپرک و تسویه آنی کیف پول شما</span>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleRecharge}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                <span>اتصال به درگاه بانکی شاپرک و پرداخت {amount.toLocaleString('en-US')} تومان</span>
              </button>
            </div>
          ) : (
            /* History Tab */
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  هیچ تراکنشی یافت نشد.
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          tx.amount >= 0
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {tx.amount >= 0 ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{tx.description}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {tx.trackingCode ? `پیگیری: ${tx.trackingCode} • ` : ''}
                          {new Date(tx.createdAt).toLocaleDateString('fa-IR-u-nu-latn')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoiceTx(tx)}
                        className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1 transition"
                        title="مشاهده و چاپ صورت‌حساب رسمی الکترونیک"
                      >
                        <FileText className="w-3 h-3 text-amber-400" />
                        <span>فاکتور رسمی</span>
                      </button>

                      <div className="text-left font-mono font-bold">
                        <span className={tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString('en-US')} تومان
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {selectedInvoiceTx && (
        <InvoiceModal
          isOpen={Boolean(selectedInvoiceTx)}
          onClose={() => setSelectedInvoiceTx(null)}
          transaction={selectedInvoiceTx}
          currentUser={user}
        />
      )}
    </div>
  );
}
