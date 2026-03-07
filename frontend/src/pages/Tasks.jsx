import React, { useState, useEffect } from 'react';
import { 
  ListTodo,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { dashboardApi } from '../lib/api';
import { formatDate, getDaysUntil, getDaysLabel, getTaskTypeColor } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const TaskCard = ({ task }) => {
  const days = getDaysUntil(task.due_date);
  const isUrgent = days !== null && days <= 1;
  const isOverdue = days !== null && days < 0;
  const navigate = useNavigate();
  
  return (
    <div 
      onClick={() => navigate('/pairs')}
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
          {isOverdue && (
            <span className="text-xs bg-[#E91E63] text-white px-2 py-0.5 rounded font-bold">
              OVERDUE
            </span>
          )}
          {isUrgent && !isOverdue && (
            <span className="text-xs bg-[#FF9800]/20 text-[#FF9800] px-2 py-0.5 rounded">
              Urgent
            </span>
          )}
        </div>
        <p className="text-white font-medium mt-2 truncate">
          {task.cage_label} - {task.pair_name || 'Unnamed Pair'}
        </p>
        <p className="text-sm text-slate-400 truncate">{task.details}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-slate-500">{formatDate(task.due_date)}</p>
        <p className={`text-sm font-medium ${isOverdue ? 'text-[#E91E63]' : isUrgent ? 'text-[#FF9800]' : 'text-slate-300'}`}>
          {getDaysLabel(days)}
        </p>
      </div>
      <ChevronRight size={20} className="text-slate-500 flex-shrink-0" />
    </div>
  );
};

export const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
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
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter((task) => {
    if (typeFilter === 'all') return true;
    return task.type === typeFilter;
  });

  const taskTypes = ['all', ...new Set(tasks.map(t => t.type))];

  // Group tasks by urgency
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
            Tasks
          </h1>
          <p className="text-slate-400 mt-1">
            {tasks.length} total tasks
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
                {type === 'all' ? 'All Tasks' : type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tasks.length === 0 ? (
        <Card className="bg-[#202940] border-white/5">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ListTodo className="w-16 h-16 text-slate-500 mb-4" />
            <h3 className="text-xl font-['Barlow_Condensed'] text-white mb-2">No Tasks</h3>
            <p className="text-slate-400 text-center max-w-md">
              Tasks will appear here when you have active clutches. Start by creating pairs and adding clutches.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <div>
              <h2 className="text-lg font-['Barlow_Condensed'] text-[#E91E63] uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E91E63] animate-pulse" />
                Overdue ({overdueTasks.length})
              </h2>
              <div className="space-y-3">
                {overdueTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Today */}
          {todayTasks.length > 0 && (
            <div>
              <h2 className="text-lg font-['Barlow_Condensed'] text-[#FFC300] uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FFC300]" />
                Today ({todayTasks.length})
              </h2>
              <div className="space-y-3">
                {todayTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcomingTasks.length > 0 && (
            <div>
              <h2 className="text-lg font-['Barlow_Condensed'] text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Upcoming ({upcomingTasks.length})
              </h2>
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {filteredTasks.length === 0 && tasks.length > 0 && (
            <Card className="bg-[#202940] border-white/5">
              <CardContent className="py-12 text-center">
                <p className="text-slate-400">No tasks match the selected filter</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
