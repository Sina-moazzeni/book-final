import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Filter,
  Search,
  Download,
  RefreshCw,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  BarChart3,
  Activity,
  Layers,
  Sparkles,
  PieChart,
  Wallet,
  ArrowDownLeft,
  X
} from 'lucide-react';

interface DailyRevenueViewProps {
  token: string | null;
  onRefreshOverview?: () => void;
}

interface DailyRecord {
  rawDate: string;
  dateFa: string;
  dayLabel: string;
  depositIncome: number;
  chargeExpense: number;
  refundAmount: number;
  netIncome: number;
  depositCount: number;
  totalCount: number;
  timestamp: number;
}

interface FinancialData {
  kpis: {
    totalRevenue: number;
    netRevenue: number;
    totalCharges: number;
    totalRefunds: number;
    totalCount: number;
    successfulCount: number;
    failedCount: number;
    pendingCount: number;
    successRate: number;
    averageDeposit: number;
    largestDeposit: number;
    peakDay: { date: string; amount: number };
  };
  dailyData: DailyRecord[];
  gatewayBreakdown: Array<{
    gateway: string;
    title: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  transactions: Array<{
    id: string;
    userId: string;
    amount: number;
    type: string;
    description: string;
    gateway?: string;
    status: string;
    trackingCode?: string;
    authority?: string;
    cardPan?: string;
    refId?: string | number;
    fee?: number;
    createdAt: number;
    dateFa: string;
    timeFa: string;
    user: {
      id: string;
      name: string;
      phone: string;
      email: string;
    };
  }>;
}

export const DailyRevenueView: React.FC<DailyRevenueViewProps> = ({ token, onRefreshOverview }) => {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [timeRange, setTimeRange] = useState<'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'all'>('last30days');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');
  const [gatewayFilter, setGatewayFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Chart Presentation Mode
  const [chartMode, setChartMode] = useState<'area' | 'bar'>('area');
  const [hoveredDay, setHoveredDay] = useState<DailyRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('range', timeRange);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (gatewayFilter !== 'all') params.set('gateway', gatewayFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/financial-analytics?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('auth_token')}`,
        },
      });

      if (!res.ok) {
        throw new Error('خطا در دریافت اطلاعات مالی از سرور');
      }

      const resData: FinancialData = await res.json();
      setData(resData);
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, statusFilter, gatewayFilter, typeFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnalytics();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCopy = (text?: string, id?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleExportCsv = () => {
    if (!data || !data.transactions || data.transactions.length === 0) return;

    const headers = ['شناسه تراکنش', 'نام کاربر', 'شماره تماس', 'نوع', 'مبلغ (تومان)', 'درگاه پرداخت', 'وضعیت', 'کد پیگیری', 'شماره مرجع', 'تاریخ', 'ساعت'];
    const rows = data.transactions.map((tx) => [
      tx.id,
      `"${tx.user?.name || ''}"`,
      `"${tx.user?.phone || ''}"`,
      tx.type === 'deposit' ? 'واریز به کیف پول' : tx.type === 'charge' ? 'هزینه ترجمه' : tx.type === 'refund' ? 'استرداد وجه' : tx.type,
      tx.amount,
      tx.gateway || 'زرین‌پال',
      tx.status === 'success' ? 'موفق' : tx.status === 'failed' ? 'ناموفق' : 'معلق',
      `"${tx.trackingCode || ''}"`,
      `"${tx.refId || ''}"`,
      `"${tx.dateFa || ''}"`,
      `"${tx.timeFa || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_report_${timeRange}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // SVG Chart Computations
  const chartHeight = 240;
  const chartWidth = 800;
  const paddingX = 40;
  const paddingY = 30;

  const dailyData = data?.dailyData || [];
  const maxDeposit = useMemo(() => {
    const maxVal = Math.max(...dailyData.map(d => d.depositIncome), 100000);
    return Math.ceil(maxVal / 50000) * 50000;
  }, [dailyData]);

  // Points for SVG Area / Line
  const chartPoints = useMemo(() => {
    if (dailyData.length === 0) return [];
    const stepX = dailyData.length > 1 ? (chartWidth - paddingX * 2) / (dailyData.length - 1) : 0;
    return dailyData.map((d, index) => {
      const x = paddingX + index * stepX;
      const ratio = d.depositIncome / (maxDeposit || 1);
      const y = (chartHeight - paddingY) - ratio * (chartHeight - paddingY * 2);
      return { x, y, data: d };
    });
  }, [dailyData, maxDeposit]);

  const areaSvgPath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    const pointsStr = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const firstX = chartPoints[0].x.toFixed(1);
    const lastX = chartPoints[chartPoints.length - 1].x.toFixed(1);
    const bottomY = (chartHeight - paddingY).toFixed(1);
    return `${pointsStr} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [chartPoints]);

  const lineSvgPath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [chartPoints]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shadow-inner">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white">آمار درآمد روزانه و مدیریت پرداختی‌ها</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                تحلیل جامع مالی
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              گزارش نموداری تفکیک درآمد روزانه، رهگیری تراکنش‌های شاپرک و بررسی فیلترشده سفارش‌ها
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>بروزرسانی داده‌ها</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!data || data.transactions.length === 0}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی اکسل / CSV</span>
          </button>
        </div>
      </div>

      {/* Time Range Quick Filter Tabs */}
      <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 px-3">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span className="font-semibold">بازه زمانی تحلیل:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1 text-xs">
          {[
            { id: 'today', label: 'امروز' },
            { id: 'yesterday', label: 'دیروز' },
            { id: 'last7days', label: '۷ روز اخیر' },
            { id: 'last30days', label: '۳۰ روز اخیر' },
            { id: 'last90days', label: '۳ ماه اخیر' },
            { id: 'all', label: 'کل تاریخچه' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTimeRange(item.id as any)}
              className={`px-3.5 py-1.5 rounded-xl transition-all font-semibold ${
                timeRange === item.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Row */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 font-mono">
          {/* Card 1: Total Revenue */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between text-xs font-sans text-slate-400 mb-2">
              <span className="font-semibold">کل درآمد واریزی</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {data.kpis.totalRevenue.toLocaleString('en-US')}
              <span className="text-xs text-slate-400 font-sans mr-1">تومان</span>
            </div>
            <div className="text-[11px] font-sans text-slate-400 mt-2 flex items-center justify-between">
              <span>تراکنش‌های واریزی:</span>
              <span className="font-bold text-white">{data.kpis.successfulCount} مورد</span>
            </div>
          </div>

          {/* Card 2: Net Revenue */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-teal-500/30 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between text-xs font-sans text-slate-400 mb-2">
              <span className="font-semibold">درآمد خالص (خالص سازی)</span>
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-teal-300">
              {data.kpis.netRevenue.toLocaleString('en-US')}
              <span className="text-xs text-slate-400 font-sans mr-1">تومان</span>
            </div>
            <div className="text-[11px] font-sans text-slate-400 mt-2 flex items-center justify-between">
              <span>کسر استردادها:</span>
              <span className="text-rose-400 font-bold">-{data.kpis.totalRefunds.toLocaleString('en-US')} تومان</span>
            </div>
          </div>

          {/* Card 3: Daily Average */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-xs font-sans text-slate-400 mb-2">
              <span className="font-semibold">میانگین درآمد روزانه</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400">
              {Math.round(data.kpis.totalRevenue / Math.max(1, dailyData.length)).toLocaleString('en-US')}
              <span className="text-xs text-slate-400 font-sans mr-1">تومان/روز</span>
            </div>
            <div className="text-[11px] font-sans text-slate-400 mt-2 flex items-center justify-between">
              <span>میانگین هر تراکنش:</span>
              <span className="font-bold text-slate-200">{data.kpis.averageDeposit.toLocaleString('en-US')} تومان</span>
            </div>
          </div>

          {/* Card 4: Peak Revenue Day */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-xs font-sans text-slate-400 mb-2">
              <span className="font-semibold">پردرآمدترین روز</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-300">
              {data.kpis.peakDay.amount.toLocaleString('en-US')}
              <span className="text-xs text-slate-400 font-sans mr-1">تومان</span>
            </div>
            <div className="text-[11px] font-sans text-slate-400 mt-2 flex items-center justify-between">
              <span>تاریخ رکورد:</span>
              <span className="font-bold text-white">{data.kpis.peakDay.date || '-'}</span>
            </div>
          </div>

          {/* Card 5: Success Rate */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-xs font-sans text-slate-400 mb-2">
              <span className="font-semibold">نرخ موفقیت شاپرک</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-400">
              {data.kpis.successRate}%
              <span className="text-xs text-slate-400 font-sans mr-1">موفق</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${data.kpis.successRate}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Daily Revenue Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">نمودار روند روزانه درآمد و حجم پرداخت‌ها</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              نمایش مبالغ واریزی به تفکیک هر روز در بازه انتخاب‌شده (تومان)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
              <button
                onClick={() => setChartMode('area')}
                className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
                  chartMode === 'area'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                منحنی گرادیانتی (Area)
              </button>
              <button
                onClick={() => setChartMode('bar')}
                className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
                  chartMode === 'bar'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ستونی تفکیکی (Bar)
              </button>
            </div>
          </div>
        </div>

        {/* Hovered Tooltip Card */}
        {hoveredDay && (
          <div className="mb-3 p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white">{hoveredDay.dayLabel} ({hoveredDay.dateFa}):</span>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <div>
                <span className="text-slate-400">درآمد روز: </span>
                <span className="text-emerald-400 font-bold">{hoveredDay.depositIncome.toLocaleString('en-US')} تومان</span>
              </div>
              <div>
                <span className="text-slate-400">تراکنش‌ها: </span>
                <span className="text-white font-bold">{hoveredDay.depositCount} واریز</span>
              </div>
              {hoveredDay.chargeExpense > 0 && (
                <div>
                  <span className="text-slate-400">مصرف ترجمه: </span>
                  <span className="text-amber-400 font-bold">-{hoveredDay.chargeExpense.toLocaleString('en-US')} تومان</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SVG Drawing Canvas */}
        <div className="w-full overflow-x-auto pb-2">
          <div className="min-w-[650px] relative">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-56 sm:h-64 overflow-visible"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                  <stop offset="80%" stopColor="#0d9488" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#047857" stopOpacity="0.6" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = (chartHeight - paddingY) - ratio * (chartHeight - paddingY * 2);
                const val = Math.round(ratio * maxDeposit);
                return (
                  <g key={idx}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#334155"
                      strokeDasharray="4 4"
                      strokeOpacity={0.6}
                    />
                    <text
                      x={paddingX - 6}
                      y={y + 3}
                      fill="#64748b"
                      fontSize="9"
                      textAnchor="end"
                      fontFamily="Vazirmatn, sans-serif"
                    >
                      {val.toLocaleString('en-US')}
                    </text>
                  </g>
                );
              })}

              {/* Chart Content: Area Mode */}
              {chartMode === 'area' && areaSvgPath && (
                <>
                  <path d={areaSvgPath} fill="url(#areaGradient)" />
                  <path d={lineSvgPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                  {chartPoints.map((pt, idx) => (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredDay(pt.data)}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredDay?.rawDate === pt.data.rawDate ? 6 : pt.data.depositIncome > 0 ? 3.5 : 2}
                        fill={hoveredDay?.rawDate === pt.data.rawDate ? '#34d399' : '#10b981'}
                        stroke="#0f172a"
                        strokeWidth="2"
                      />
                    </g>
                  ))}
                </>
              )}

              {/* Chart Content: Bar Mode */}
              {chartMode === 'bar' && (
                <g>
                  {chartPoints.map((pt, idx) => {
                    const barW = Math.max(8, Math.min(28, (chartWidth - paddingX * 2) / (dailyData.length * 1.5)));
                    const barH = (chartHeight - paddingY) - pt.y;
                    const isHovered = hoveredDay?.rawDate === pt.data.rawDate;
                    return (
                      <g
                        key={idx}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredDay(pt.data)}
                        onMouseLeave={() => setHoveredDay(null)}
                      >
                        <rect
                          x={pt.x - barW / 2}
                          y={pt.y}
                          width={barW}
                          height={Math.max(2, barH)}
                          rx="4"
                          fill={isHovered ? '#34d399' : 'url(#barGradient)'}
                          className="transition-colors"
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* X-Axis Dates */}
              {chartPoints.map((pt, idx) => {
                // Show label every N items depending on length
                const total = chartPoints.length;
                const step = total > 14 ? Math.ceil(total / 7) : total > 7 ? 2 : 1;
                if (idx % step !== 0 && idx !== total - 1) return null;

                return (
                  <text
                    key={idx}
                    x={pt.x}
                    y={chartHeight - 8}
                    fill="#94a3b8"
                    fontSize="9"
                    textAnchor="middle"
                    fontFamily="Vazirmatn, sans-serif"
                  >
                    {pt.data.dayLabel.split(' ')[0] || pt.data.dateFa}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Gateway Breakdown & Status Insights */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Gateway Distribution */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
            <h4 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>تفکیک درگاه‌های پرداخت و سهم پردازش هر سامانه</span>
            </h4>

            {data.gatewayBreakdown.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                در این بازه زمانی هیچ تراکنش موفقی ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-4">
                {data.gatewayBreakdown.map((gw, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <span className="font-bold text-white">{gw.title}</span>
                      </div>
                      <div className="font-mono text-emerald-400 font-bold">
                        {gw.amount.toLocaleString('en-US')} تومان ({gw.percentage}%)
                      </div>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, gw.percentage)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span>تعداد تراکنش‌های تسویه شده:</span>
                      <span className="font-mono text-slate-200">{gw.count} پرداخت</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transaction Status Summary Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-amber-400" />
                <span>وضعیت کلی تراکنش‌ها</span>
              </h4>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>پرداخت‌های موفق</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-300 text-sm">
                    {data.kpis.successfulCount} تراکنش
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-rose-300 font-semibold">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>ناموفق یا انصراف</span>
                  </div>
                  <span className="font-mono font-bold text-rose-300 text-sm">
                    {data.kpis.failedCount} تراکنش
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>در انتظار تایید درگاه</span>
                  </div>
                  <span className="font-mono font-bold text-amber-300 text-sm">
                    {data.kpis.pendingCount} تراکنش
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              کلیه تراکنش‌های واریزی بلافاصله پس از بازگشت از درگاه شاپرک با پروتکل Verify استعلام شده و به کیف پول افزوده می‌گردند.
            </div>
          </div>
        </div>
      )}

      {/* Filterable Payments List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {/* Table Filters Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <span>لیست جامع تراکنش‌ها و پرداختی‌های کاربران</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                فیلتر بر اساس درگاه، وضعیت پرداخت، نوع تراکنش یا مشخصات کاربر
              </p>
            </div>

            <div className="text-xs text-slate-400">
              تعداد نتایج: <span className="font-bold text-emerald-400 font-mono">{data?.transactions.length || 0}</span> رکورد
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                placeholder="جستجو در نام، شماره، ایمیل، کد رهگیری..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2 pr-9 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none placeholder:text-slate-500"
              />
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Gateway Filter */}
            <select
              value={gatewayFilter}
              onChange={(e) => setGatewayFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="all">همه درگاه‌های پرداخت</option>
              <option value="zarinpal">زرین‌پال شاپرک (ZarinPal)</option>
              <option value="zibal">زیبال (Zibal)</option>
              <option value="nextpay">نکست‌پِی (NextPay)</option>
              <option value="idpay">آیدی‌پِی (IDPay)</option>
              <option value="manual">کارت‌به‌کارت / شارژ دستی</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="success">پرداخت‌های موفق</option>
              <option value="failed">ناموفق / انصراف</option>
              <option value="pending">در انتظار پرداخت</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="all">همه انواع تراکنش‌ها</option>
              <option value="deposit">واریز و افزایش موجودی</option>
              <option value="charge">کسر هزینه ترجمه کتاب</option>
              <option value="refund">استرداد وجه</option>
              <option value="admin_gift">هدیه ثبت‌نام / شارژ مدیر</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
              <tr>
                <th className="py-3.5 px-4">کاربر</th>
                <th className="py-3.5 px-4">شرح تراکنش</th>
                <th className="py-3.5 px-4">مبلغ (تومان)</th>
                <th className="py-3.5 px-4">درگاه بانکی</th>
                <th className="py-3.5 px-4">وضعیت</th>
                <th className="py-3.5 px-4">کد رهگیری / مرجع</th>
                <th className="py-3.5 px-4">تاریخ و زمان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {!data || data.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                    {loading ? 'در حال دریافت اطلاعات...' : 'هیچ تراکنشی منطبق با فیلترهای انتخابی یافت نشد.'}
                  </td>
                </tr>
              ) : (
                data.transactions.map((tx) => {
                  const isDeposit = tx.type === 'deposit';
                  const isCharge = tx.type === 'charge';
                  const isRefund = tx.type === 'refund';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-850/60 transition-colors">
                      {/* User */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-white">{tx.user?.name || 'کاربر سیستم'}</div>
                        <div className="text-[10px] text-slate-400 font-mono" dir="ltr">{tx.user?.phone || tx.user?.email || tx.userId}</div>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 font-sans text-slate-300">
                        <div className="max-w-xs truncate">{tx.description}</div>
                        <span className="text-[10px] text-slate-500 block font-mono">
                          {tx.type === 'deposit' ? 'افزایش موجودی' : isCharge ? 'سفارش ترجمه' : isRefund ? 'بازگشت وجه' : 'هدیه تشویقی'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-bold text-sm">
                        <span className={tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {tx.amount >= 0 ? '+' : ''}
                          {tx.amount.toLocaleString('en-US')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans mr-1">تومان</span>
                      </td>

                      {/* Gateway */}
                      <td className="py-3.5 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-semibold border border-slate-700/60 inline-flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-amber-400" />
                          <span>
                            {tx.gateway === 'zarinpal' ? 'زرین‌پال شاپرک' : tx.gateway === 'zibal' ? 'زیبال' : tx.gateway === 'nextpay' ? 'نکست‌پِی' : tx.gateway === 'idpay' ? 'آیدی‌پِی' : 'سیستمی'}
                          </span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 font-sans">
                        {tx.status === 'success' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1 w-max">
                            <CheckCircle2 className="w-3 h-3" />
                            موفق
                          </span>
                        ) : tx.status === 'failed' ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold flex items-center gap-1 w-max">
                            <AlertCircle className="w-3 h-3" />
                            ناموفق
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1 w-max">
                            <Clock className="w-3 h-3" />
                            در انتظار
                          </span>
                        )}
                      </td>

                      {/* Tracking / Ref */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-300 text-[11px]">{tx.trackingCode || tx.refId || tx.id}</span>
                          {(tx.trackingCode || tx.refId) && (
                            <button
                              onClick={() => handleCopy(String(tx.trackingCode || tx.refId), tx.id)}
                              className="text-slate-500 hover:text-amber-400 transition"
                              title="کپی کد پیگیری"
                            >
                              {copiedId === tx.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                        {tx.cardPan && (
                          <span className="text-[10px] text-slate-500 block font-mono" dir="ltr">{tx.cardPan}</span>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 font-sans text-slate-400 text-[11px]">
                        <div>{tx.dateFa || new Date(tx.createdAt).toLocaleDateString('fa-IR-u-nu-latn')}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{tx.timeFa || new Date(tx.createdAt).toLocaleTimeString('fa-IR-u-nu-latn')}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
