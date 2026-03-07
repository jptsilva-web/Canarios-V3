import React, { useState, useEffect } from 'react';
import { 
  BarChart3,
  Download,
  FileText,
  FileSpreadsheet,
  Egg,
  Bird,
  TrendingUp,
  Target,
  Activity,
  CheckCircle,
  LineChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { reportsApi, exportApi } from '../lib/api';
import { toast } from 'sonner';
import { useLanguage } from '../lib/LanguageContext';

const StatCard = ({ icon: Icon, label, value, subValue, color, trend }) => (
  <Card className="bg-[#202940] border-white/5">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-wider font-['Barlow_Condensed']">
            {label}
          </p>
          <p className="text-3xl font-bold text-white mt-2 font-['Barlow_Condensed']">
            {value}
          </p>
          {subValue && (
            <p className="text-sm text-slate-500 mt-1">{subValue}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-xs" style={{ color }}>
              <TrendingUp size={14} />
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon size={24} style={{ color }} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ProgressBar = ({ label, value, max, color }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-mono">{value} / {max}</span>
      </div>
      <div className="h-2 bg-[#1A2035] rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

const RateCard = ({ label, rate, description, color }) => (
  <div className="p-4 rounded-lg bg-[#1A2035] border border-white/5">
    <p className="text-xs text-slate-400 uppercase tracking-wider font-['Barlow_Condensed']">
      {label}
    </p>
    <div className="flex items-end gap-2 mt-2">
      <span className="text-3xl font-bold" style={{ color }}>{rate}%</span>
    </div>
    <p className="text-xs text-slate-500 mt-2">{description}</p>
  </div>
);

// Simple trend chart component
const TrendChart = ({ data, t }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500">
        No trend data available yet
      </div>
    );
  }

  const maxEggs = Math.max(...data.map(d => d.total_eggs), 1);
  const maxRate = 100;

  // Format month for display
  const formatMonth = (month) => {
    const [year, m] = month.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m) - 1]} ${year.slice(2)}`;
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#FFC300]" />
          <span className="text-slate-400">{t('reports.totalEggs')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#00BFA6]" />
          <span className="text-slate-400">{t('reports.hatched')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-[#E91E63]" />
          <span className="text-slate-400">{t('reports.fertilityRate')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-[#FF9800]" />
          <span className="text-slate-400">{t('reports.hatchRate')}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-48">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-xs text-slate-500 w-8">
          <span>{maxEggs}</span>
          <span>{Math.round(maxEggs / 2)}</span>
          <span>0</span>
        </div>
        
        {/* Bars and lines */}
        <div className="ml-10 h-full flex items-end gap-1 overflow-x-auto pb-6">
          {data.map((item, index) => (
            <div key={item.month} className="flex flex-col items-center gap-1 min-w-[60px]">
              {/* Bars container */}
              <div className="relative h-36 w-full flex items-end justify-center gap-1">
                {/* Total eggs bar */}
                <div 
                  className="w-4 bg-[#FFC300]/80 rounded-t transition-all duration-500"
                  style={{ height: `${(item.total_eggs / maxEggs) * 100}%` }}
                  title={`${item.total_eggs} eggs`}
                />
                {/* Hatched bar */}
                <div 
                  className="w-4 bg-[#00BFA6]/80 rounded-t transition-all duration-500"
                  style={{ height: `${(item.hatched_eggs / maxEggs) * 100}%` }}
                  title={`${item.hatched_eggs} hatched`}
                />
                {/* Rate dots */}
                <div 
                  className="absolute w-3 h-3 rounded-full border-2 border-[#E91E63] bg-[#202940]"
                  style={{ bottom: `${(item.fertility_rate / maxRate) * 100}%`, right: '10px' }}
                  title={`${item.fertility_rate}% fertility`}
                />
                <div 
                  className="absolute w-3 h-3 rounded-full border-2 border-[#FF9800] bg-[#202940]"
                  style={{ bottom: `${(item.hatch_rate / maxRate) * 100}%`, right: '25px' }}
                  title={`${item.hatch_rate}% hatch rate`}
                />
              </div>
              {/* Month label */}
              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                {formatMonth(item.month)}
              </span>
            </div>
          ))}
        </div>

        {/* Right Y-axis for percentages */}
        <div className="absolute right-0 top-0 bottom-6 flex flex-col justify-between text-xs text-slate-500 w-8 text-right">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
      </div>
    </div>
  );
};

export const Reports = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, trendsRes] = await Promise.all([
        reportsApi.getBreedingStats(),
        reportsApi.getBreedingTrends(),
      ]);
      setStats(statsRes.data);
      setTrends(trendsRes.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (type, format) => {
    let url;
    if (type === 'birds') {
      url = format === 'csv' ? exportApi.birdsCSV() : exportApi.birdsPDF();
    } else {
      url = format === 'csv' ? exportApi.breedingReportCSV() : exportApi.breedingReportPDF();
    }
    window.open(url, '_blank');
    toast.success(`${t('common.export')} ${type} ${format.toUpperCase()}...`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC300]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="reports-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Barlow_Condensed'] tracking-tight">
            {t('reports.title')}
          </h1>
          <p className="text-slate-400 mt-1">
            {t('reports.subtitle')}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Egg} 
          label="Total Eggs" 
          value={stats?.total_eggs || 0}
          subValue={`${stats?.total_clutches || 0} clutches`}
          color="#FFC300"
        />
        <StatCard 
          icon={Bird} 
          label="Hatched Chicks" 
          value={stats?.hatched_eggs || 0}
          subValue={`${stats?.survival_rate || 0}% survival`}
          color="#00BFA6"
        />
        <StatCard 
          icon={Target} 
          label="Fertility Rate" 
          value={`${stats?.fertility_rate || 0}%`}
          subValue={`${stats?.fertile_eggs || 0} fertile eggs`}
          color="#FF9800"
        />
        <StatCard 
          icon={Activity} 
          label="Hatch Rate" 
          value={`${stats?.hatch_rate || 0}%`}
          subValue="of fertile eggs"
          color="#E91E63"
        />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Egg Status Breakdown */}
        <Card className="bg-[#202940] border-white/5">
          <CardHeader>
            <CardTitle className="text-lg font-['Barlow_Condensed'] text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 size={20} className="text-[#FFC300]" />
              Egg Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressBar 
              label="Fertile" 
              value={stats?.fertile_eggs || 0} 
              max={stats?.total_eggs || 1}
              color="#00BFA6"
            />
            <ProgressBar 
              label="Hatched" 
              value={stats?.hatched_eggs || 0} 
              max={stats?.total_eggs || 1}
              color="#FFC300"
            />
            <ProgressBar 
              label="Infertile" 
              value={stats?.infertile_eggs || 0} 
              max={stats?.total_eggs || 1}
              color="#E91E63"
            />
            <ProgressBar 
              label="Dead" 
              value={stats?.dead_eggs || 0} 
              max={stats?.total_eggs || 1}
              color="#9C27B0"
            />
          </CardContent>
        </Card>

        {/* Performance Rates */}
        <Card className="bg-[#202940] border-white/5">
          <CardHeader>
            <CardTitle className="text-lg font-['Barlow_Condensed'] text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={20} className="text-[#00BFA6]" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <RateCard 
              label="Fertility Rate"
              rate={stats?.fertility_rate || 0}
              description="Eggs that were fertile"
              color="#00BFA6"
            />
            <RateCard 
              label="Hatch Rate"
              rate={stats?.hatch_rate || 0}
              description="Fertile eggs that hatched"
              color="#FFC300"
            />
            <RateCard 
              label="Survival Rate"
              rate={stats?.survival_rate || 0}
              description="Total eggs to chicks"
              color="#FF9800"
            />
            <div className="p-4 rounded-lg bg-[#1A2035] border border-white/5">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-['Barlow_Condensed']">
                Avg per Clutch
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Eggs</span>
                  <span className="text-white font-mono">{stats?.avg_eggs_per_clutch || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Hatched</span>
                  <span className="text-[#00BFA6] font-mono">{stats?.avg_hatched_per_clutch || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breeding Trends Chart */}
      <Card className="bg-[#202940] border-white/5">
        <CardHeader>
          <CardTitle className="text-lg font-['Barlow_Condensed'] text-white uppercase tracking-wider flex items-center gap-2">
            <LineChart size={20} className="text-[#FFC300]" />
            {t('reports.performanceMetrics')} - Monthly Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={trends} t={t} />
        </CardContent>
      </Card>

      {/* Clutch Summary */}
      <Card className="bg-[#202940] border-white/5">
        <CardHeader>
          <CardTitle className="text-lg font-['Barlow_Condensed'] text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle size={20} className="text-[#00BFA6]" />
            Clutch Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-[#1A2035] text-center">
              <p className="text-3xl font-bold text-white">{stats?.total_clutches || 0}</p>
              <p className="text-sm text-slate-400 mt-1">Total Clutches</p>
            </div>
            <div className="p-4 rounded-lg bg-[#1A2035] text-center">
              <p className="text-3xl font-bold text-[#00BFA6]">{stats?.completed_clutches || 0}</p>
              <p className="text-sm text-slate-400 mt-1">Completed</p>
            </div>
            <div className="p-4 rounded-lg bg-[#1A2035] text-center">
              <p className="text-3xl font-bold text-[#FF9800]">{stats?.active_clutches || 0}</p>
              <p className="text-sm text-slate-400 mt-1">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card className="bg-[#202940] border-white/5">
        <CardHeader>
          <CardTitle className="text-lg font-['Barlow_Condensed'] text-white uppercase tracking-wider flex items-center gap-2">
            <Download size={20} className="text-[#FFC300]" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Birds Export */}
            <div className="p-4 rounded-lg bg-[#1A2035] border border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <Bird size={24} className="text-[#FFC300]" />
                <div>
                  <p className="text-white font-medium">Bird Registry</p>
                  <p className="text-xs text-slate-400">Export all birds data</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleExport('birds', 'csv')}
                  variant="outline"
                  className="flex-1 border-[#00BFA6]/50 text-[#00BFA6] hover:bg-[#00BFA6]/10"
                  data-testid="export-birds-csv"
                >
                  <FileSpreadsheet size={16} className="mr-2" /> CSV
                </Button>
                <Button
                  onClick={() => handleExport('birds', 'pdf')}
                  variant="outline"
                  className="flex-1 border-[#E91E63]/50 text-[#E91E63] hover:bg-[#E91E63]/10"
                  data-testid="export-birds-pdf"
                >
                  <FileText size={16} className="mr-2" /> PDF
                </Button>
              </div>
            </div>

            {/* Breeding Report Export */}
            <div className="p-4 rounded-lg bg-[#1A2035] border border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 size={24} className="text-[#00BFA6]" />
                <div>
                  <p className="text-white font-medium">Breeding Report</p>
                  <p className="text-xs text-slate-400">Export statistics and pairs data</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleExport('breeding', 'csv')}
                  variant="outline"
                  className="flex-1 border-[#00BFA6]/50 text-[#00BFA6] hover:bg-[#00BFA6]/10"
                  data-testid="export-breeding-csv"
                >
                  <FileSpreadsheet size={16} className="mr-2" /> CSV
                </Button>
                <Button
                  onClick={() => handleExport('breeding', 'pdf')}
                  variant="outline"
                  className="flex-1 border-[#E91E63]/50 text-[#E91E63] hover:bg-[#E91E63]/10"
                  data-testid="export-breeding-pdf"
                >
                  <FileText size={16} className="mr-2" /> PDF
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
