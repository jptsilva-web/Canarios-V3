import React, { useState, useEffect } from 'react';
import { 
  Bird, 
  Heart, 
  Egg,
  Activity,
  Calendar,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { dashboardApi } from '../lib/api';
import { formatDate, getDaysUntil, getDaysLabel, getTaskTypeColor } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ icon: Icon, label, value, color, trend }) => (
  <Card className="bg-[#202940] border-white/5 hover:border-[#FFC300]/30 transition-colors">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-wider font-['Barlow_Condensed'] font-medium">
            {label}
          </p>
          <p className="text-3xl font-bold text-white mt-2 font-['Barlow_Condensed']">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-xs text-[#00BFA6]">
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

const TaskItem = ({ task, onClick }) => {
  const days = getDaysUntil(task.due_date);
  const isUrgent = days !== null && days <= 1;
  
  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-lg bg-[#1A2035] hover:bg-[#1A2035]/80 cursor-pointer transition-colors group"
      data-testid={`task-${task.id}`}
    >
      <div 
        className="w-1 h-12 rounded-full"
        style={{ backgroundColor: getTaskTypeColor(task.type) }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span 
            className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ 
              backgroundColor: `${getTaskTypeColor(task.type)}20`,
              color: getTaskTypeColor(task.type)
            }}
          >
            {task.type}
          </span>
          {isUrgent && (
            <span className="text-xs bg-[#E91E63]/20 text-[#E91E63] px-2 py-0.5 rounded">
              Urgent
            </span>
          )}
        </div>
        <p className="text-white font-medium mt-1 truncate">
          {task.cage_label} - {task.pair_name || 'Unnamed Pair'}
        </p>
        <p className="text-sm text-slate-400 truncate">{task.details}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-slate-500">{formatDate(task.due_date)}</p>
        <p className={`text-sm font-medium ${isUrgent ? 'text-[#E91E63]' : 'text-slate-300'}`}>
          {getDaysLabel(days)}
        </p>
      </div>
      <ChevronRight size={20} className="text-slate-500 group-hover:text-[#FFC300] transition-colors" />
    </div>
  );
};

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, tasksRes] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getTasks(),
        ]);
        setStats(statsRes.data);
        setTasks(tasksRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC300]" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white font-['Barlow_Condensed'] tracking-tight">
          Dashboard
        </h1>
        <p className="text-slate-400 mt-1">
          Overview of your breeding operation
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Bird} 
          label="Total Birds" 
          value={stats?.total_birds || 0}
          color="#FFC300"
        />
        <StatCard 
          icon={Heart} 
          label="Active Pairs" 
          value={stats?.active_pairs || 0}
          color="#E91E63"
        />
        <StatCard 
          icon={Egg} 
          label="Laying" 
          value={stats?.eggs_laying || 0}
          color="#FF9800"
        />
        <StatCard 
          icon={Activity} 
          label="Incubating" 
          value={stats?.eggs_incubating || 0}
          color="#00BFA6"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks Section */}
        <div className="lg:col-span-2">
          <Card className="bg-[#202940] border-white/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-['Barlow_Condensed'] text-white uppercase tracking-wider">
                Upcoming Tasks
              </CardTitle>
              <button 
                onClick={() => navigate('/tasks')}
                className="text-sm text-[#FFC300] hover:underline flex items-center gap-1"
                data-testid="view-all-tasks-btn"
              >
                View All <ChevronRight size={16} />
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No upcoming tasks</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Start by creating a pair and adding a clutch
                  </p>
                </div>
              ) : (
                tasks.slice(0, 5).map((task) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onClick={() => navigate(`/pairs`)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card className="bg-[#202940] border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-['Barlow_Condensed'] text-white uppercase tracking-wider">
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-slate-400">Total Pairs</span>
                <span className="text-white font-bold">{stats?.total_pairs || 0}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-slate-400">Total Clutches</span>
                <span className="text-white font-bold">{stats?.total_clutches || 0}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-slate-400">Hatching Now</span>
                <span className="text-[#00BFA6] font-bold">{stats?.chicks_hatching || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Status Legend */}
          <Card className="bg-[#202940] border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-['Barlow_Condensed'] text-white uppercase tracking-wider">
                Status Legend
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Laying', color: '#FFC300' },
                { label: 'Incubating', color: '#FF9800' },
                { label: 'Hatching', color: '#00BFA6' },
                { label: 'Weaning', color: '#E91E63' },
              ].map((status) => (
                <div key={status.label} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm text-slate-300">{status.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
