import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ListTodo,
  ChevronRight,
  Filter,
  CheckCircle,
  History,
  Clock,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { dashboardApi } from '../lib/api';
import { formatDate, getDaysUntil, getDaysLabel, getTaskTypeColor } from '../lib/utils';
import { toast } from 'sonner';
import { useLanguage } from '../lib/LanguageContext';
import { useSeasonChange } from '../hooks/useSeasonChange';

const TaskCard = ({ task, onComplete, t }) => {
  const days = getDaysUntil(task.due_date);
  const isUrgent = days !== null && days <= 1;
  const isOverdue = days !== null && days < 0;
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (task.pair_id) {
      navigate(`/pairs?pairId=${task.pair_id}`);
    } else {
      navigate('/pairs');
    }
  };

  const handleComplete = (e) => {
    e.stopPropagation();
    onComplete(task);
  };
  
  return (
    <div 
      onClick={handleClick}
      className="flex items-center gap-4 p-4 rounded-lg bg-[#202940] hover:bg-[#202940]/80 cursor-pointer transition-colors border border-white/5 hover:border-[#FFC300]/30"
      data-testid={`task-${task.id}`}
    >
      <div 
        className="w-1.5 h-16 rounded-full flex-shrink-0"
        style={{ backgroundColor: getTaskTypeColor(task.type) }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span 
            className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded"
            style={{ 
              backgroundColor: `${getTaskTypeColor(task.type)}20`,
              color: getTaskTypeColor(task.type)
            }}
          >
            {task.type}
          </span>
          <span className="text-white font-medium truncate">{task.pair_name}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 text-sm truncate">{task.cage_label}</span>
        </div>
        <p className="text-slate-400 text-sm mt-1 truncate">{task.details}</p>
        <div className="flex items-center gap-2 mt-2 text-sm">
          <span className={`${isOverdue ? 'text-[#E91E63]' : isUrgent ? 'text-[#FFC300]' : 'text-slate-400'} flex items-center gap-1`}>
            <Clock size={14} />
            {formatDate(task.due_date)}
          </span>
          {days !== null && (
            <span className={`${isOverdue ? 'text-[#E91E63]' : isUrgent ? 'text-[#FFC300]' : 'text-slate-500'}`}>
              ({getDaysLabel(days)})
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="text-[#00BFA6] hover:text-[#00BFA6] hover:bg-[#00BFA6]/10"
        onClick={handleComplete}
        data-testid={`complete-task-${task.id}`}
      >
        <CheckCircle size={20} />
      </Button>
      <ChevronRight className="text-slate-500 flex-shrink-0" size={20} />
    </div>
  );
};

const HistoryCard = ({ task, onRemove, t }) => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1A2035] border border-white/5">
      <div 
        className="w-1 h-10 rounded-full flex-shrink-0 opacity-50"
        style={{ backgroundColor: getTaskTypeColor(task.task_type) }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span 
            className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded opacity-75"
            style={{ 
              backgroundColor: `${getTaskTypeColor(task.task_type)}20`,
              color: getTaskTypeColor(task.task_type)
            }}
          >
            {task.task_type}
          </span>
          <span className="text-slate-300 text-sm truncate">{task.pair_name}</span>
        </div>
        <p className="text-slate-500 text-xs mt-1 truncate">{task.details}</p>
        <p className="text-slate-600 text-xs mt-1">
          {t('tasks.completedAt') || 'Concluído em'}: {formatDate(task.completed_at)}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="text-slate-500 hover:text-[#E91E63] hover:bg-[#E91E63]/10 p-1"
        onClick={() => onRemove(task.id)}
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
};

export const Tasks = () => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchTasks = async () => {
    try {
      const res = await dashboardApi.getTasks();
      setTasks(res.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskHistory = async () => {
    try {
      const res = await dashboardApi.getTaskHistory();
      setTaskHistory(res.data);
    } catch (error) {
      console.error('Error fetching task history:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchTaskHistory();
  }, []);

  useSeasonChange(() => {
    fetchTasks();
    fetchTaskHistory();
  });

  const handleCompleteTask = async (task) => {
    try {
      // Add to history
      await dashboardApi.addTaskToHistory({
        task_id: task.id,
        task_type: task.type,
        pair_id: task.pair_id,
        pair_name: task.pair_name,
        cage_label: task.cage_label,
        due_date: task.due_date,
        details: task.details,
        action: 'completed'
      });
      
      // Remove from active tasks
      setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
      
      // Refresh history
      fetchTaskHistory();
      
      toast.success(t('tasks.taskCompleted'));
    } catch (error) {
      toast.error(t('messages.error'));
    }
  };

  const handleRemoveFromHistory = async (taskId) => {
    try {
      await dashboardApi.removeFromHistory(taskId);
      setTaskHistory(prev => prev.filter(t => t.id !== taskId));
      toast.success(t('tasks.removedFromHistory') || 'Removido do histórico');
    } catch (error) {
      toast.error(t('messages.error'));
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (typeFilter === 'all') return true;
    return task.type === typeFilter;
  });

  const taskTypes = ['all', ...new Set(tasks.map(t => t.type))];

  const overdueTasks = filteredTasks.filter(t => {
    const days = getDaysUntil(t.due_date);
    return days !== null && days < 0;
  });
  
  const todayTasks = filteredTasks.filter(t => {
    const days = getDaysUntil(t.due_date);
    return days === 0;
  });
  
  const upcomingTasks = filteredTasks.filter(t => {
    const days = getDaysUntil(t.due_date);
    return days !== null && days > 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC300]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="tasks-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Barlow_Condensed'] tracking-tight">
            {t('tasks.title')}
          </h1>
          <p className="text-slate-400 mt-1">
            {tasks.length} {t('tasks.activeTasks') || 'tarefas ativas'}
          </p>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-[#202940] border-white/10 text-white" data-testid="type-filter">
            <Filter size={16} className="mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#202940] border-white/10">
            {taskTypes.map((type) => (
              <SelectItem key={type} value={type} className="text-white hover:bg-[#1A2035] capitalize">
                {type === 'all' ? t('common.all') : type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main content - 2 columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Tasks - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {tasks.length === 0 ? (
            <Card className="bg-[#202940] border-white/5">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ListTodo className="w-16 h-16 text-slate-500 mb-4" />
                <h3 className="text-xl font-['Barlow_Condensed'] text-white mb-2">{t('tasks.noTasks')}</h3>
                <p className="text-slate-400 text-center max-w-md">
                  {t('tasks.noTasksDesc')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Overdue */}
              {overdueTasks.length > 0 && (
                <div>
                  <h2 className="text-lg font-['Barlow_Condensed'] text-[#E91E63] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#E91E63] animate-pulse" />
                    {t('tasks.overdue')} ({overdueTasks.length})
                  </h2>
                  <div className="space-y-3">
                    {overdueTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} t={t} />
                    ))}
                  </div>
                </div>
              )}

              {/* Today */}
              {todayTasks.length > 0 && (
                <div>
                  <h2 className="text-lg font-['Barlow_Condensed'] text-[#FFC300] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#FFC300]" />
                    {t('tasks.today')} ({todayTasks.length})
                  </h2>
                  <div className="space-y-3">
                    {todayTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} t={t} />
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming */}
              {upcomingTasks.length > 0 && (
                <div>
                  <h2 className="text-lg font-['Barlow_Condensed'] text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    {t('tasks.upcoming')} ({upcomingTasks.length})
                  </h2>
                  <div className="space-y-3">
                    {upcomingTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} t={t} />
                    ))}
                  </div>
                </div>
              )}

              {filteredTasks.length === 0 && tasks.length > 0 && (
                <Card className="bg-[#202940] border-white/5">
                  <CardContent className="py-12 text-center">
                    <p className="text-slate-400">{t('common.noResults')}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Task History - 1/3 width */}
        <div className="lg:col-span-1">
          <Card className="bg-[#202940] border-white/5 sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-['Barlow_Condensed'] text-slate-300 flex items-center gap-2">
                <History size={20} />
                {t('tasks.history') || 'Histórico'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {taskHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">
                    {t('tasks.noHistory') || 'Nenhuma tarefa concluída'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {taskHistory.map((task) => (
                    <HistoryCard 
                      key={task.id} 
                      task={task} 
                      onRemove={handleRemoveFromHistory}
                      t={t} 
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
