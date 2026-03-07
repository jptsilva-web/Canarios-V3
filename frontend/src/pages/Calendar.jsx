import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { dashboardApi } from '../lib/api';
import { cn, getTaskTypeColor } from '../lib/utils';
import { toast } from 'sonner';
import { useLanguage } from '../lib/LanguageContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const TASK_TYPES = [
  { value: 'manual', label: 'Manual Task', color: '#64748B' },
  { value: 'reminder', label: 'Reminder', color: '#FFC300' },
  { value: 'vet_visit', label: 'Vet Visit', color: '#E91E63' },
  { value: 'cleaning', label: 'Cleaning', color: '#00BFA6' },
  { value: 'feeding', label: 'Special Feeding', color: '#FF9800' },
  { value: 'other', label: 'Other', color: '#9C27B0' },
];

export const CalendarPage = () => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState([]);
  const [manualTasks, setManualTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    task_type: 'manual',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, manualRes] = await Promise.all([
        dashboardApi.getTasks(),
        fetch(`${API_URL}/api/manual-tasks`).then(r => r.json()),
      ]);
      setTasks(tasksRes.data);
      setManualTasks(manualRes);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getDateString = (day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getTasksForDate = (day) => {
    const dateStr = getDateString(day);
    const breedingTasks = tasks.filter(task => task.due_date === dateStr);
    const manual = manualTasks.filter(task => task.due_date === dateStr && !task.completed);
    return [...breedingTasks, ...manual];
  };

  const today = new Date();
  const isToday = (day) => {
    return today.getFullYear() === year && 
           today.getMonth() === month && 
           today.getDate() === day;
  };

  // Handle right-click on calendar day
  const handleContextMenu = (e, day) => {
    e.preventDefault();
    setSelectedDay(day);
    setContextMenu({ x: e.clientX, y: e.clientY });
    setNewTask({
      ...newTask,
      due_date: getDateString(day),
    });
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Handle click outside context menu
  useEffect(() => {
    const handleClick = () => closeContextMenu();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Open add task dialog
  const openAddTask = () => {
    setDialogOpen(true);
    closeContextMenu();
  };

  // Create manual task
  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast.error(t('messages.taskTitleRequired'));
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/manual-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      
      if (res.ok) {
        toast.success(t('messages.taskCreated'));
        setDialogOpen(false);
        setNewTask({ title: '', description: '', due_date: '', task_type: 'manual' });
        fetchData();
      } else {
        toast.error(t('messages.taskError'));
      }
    } catch (error) {
      toast.error(t('messages.taskError'));
    }
  };

  // Delete manual task
  const handleDeleteTask = async (taskId) => {
    try {
      const res = await fetch(`${API_URL}/api/manual-tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        toast.success(t('messages.taskDeleted'));
        fetchData();
      } else {
        toast.error(t('messages.taskError'));
      }
    } catch (error) {
      toast.error(t('messages.taskError'));
    }
  };

  // Generate calendar days
  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push({ day: null, key: `empty-start-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({ day, key: `day-${day}` });
  }
  const remainingCells = 7 - (calendarDays.length % 7);
  if (remainingCells < 7) {
    for (let i = 0; i < remainingCells; i++) {
      calendarDays.push({ day: null, key: `empty-end-${i}` });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC300]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="calendar-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Barlow_Condensed'] tracking-tight">
            {t('calendar.title')}
          </h1>
          <p className="text-slate-400 mt-1">
            {t('calendar.rightClickToAdd')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setNewTask({ ...newTask, due_date: getDateString(today.getDate()) });
              setDialogOpen(true);
            }}
            className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
            data-testid="add-task-btn"
          >
            <Plus size={16} className="mr-2" /> {t('calendar.addTask')}
          </Button>
          <Button
            onClick={goToToday}
            variant="outline"
            className="border-white/10 text-white hover:bg-white/5"
            data-testid="go-to-today-btn"
          >
            <CalendarIcon size={16} className="mr-2" /> Today
          </Button>
        </div>
      </div>

      <Card className="bg-[#202940] border-white/5">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevMonth}
              className="text-slate-400 hover:text-white"
              data-testid="prev-month-btn"
            >
              <ChevronLeft size={24} />
            </Button>
            <CardTitle className="text-2xl font-['Barlow_Condensed'] text-white">
              {MONTHS[month]} {year}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="text-slate-400 hover:text-white"
              data-testid="next-month-btn"
            >
              <ChevronRight size={24} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((day) => (
              <div 
                key={day} 
                className="text-center py-2 text-sm font-['Barlow_Condensed'] text-slate-400 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ day, key }) => {
              const dayTasks = day ? getTasksForDate(day) : [];
              const isDayToday = day && isToday(day);
              
              return (
                <div
                  key={key}
                  className={cn(
                    'min-h-[100px] p-2 rounded-lg transition-colors',
                    day ? 'bg-[#1A2035] hover:bg-[#1A2035]/80 cursor-pointer' : '',
                    isDayToday && 'ring-2 ring-[#FFC300] ring-inset'
                  )}
                  onContextMenu={(e) => day && handleContextMenu(e, day)}
                  data-testid={day ? `calendar-day-${day}` : undefined}
                >
                  {day && (
                    <>
                      <div className={cn(
                        'text-sm font-medium mb-1',
                        isDayToday ? 'text-[#FFC300]' : 'text-slate-300'
                      )}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayTasks.slice(0, 3).map((task) => {
                          const isManual = task.task_type || !task.pair_id;
                          const taskType = TASK_TYPES.find(t => t.value === task.task_type);
                          const color = taskType?.color || getTaskTypeColor(task.type) || '#64748B';
                          
                          return (
                            <div
                              key={task.id}
                              className="group relative text-xs px-1.5 py-0.5 rounded truncate flex items-center justify-between"
                              style={{ 
                                backgroundColor: `${color}20`,
                                color: color
                              }}
                              title={isManual ? task.title : `${task.type}: ${task.cage_label}`}
                            >
                              <span className="truncate">
                                {isManual ? task.title : task.type}
                              </span>
                              {isManual && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 ml-1 hover:text-red-400 transition-opacity"
                                  data-testid={`delete-task-${task.id}`}
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {dayTasks.length > 3 && (
                          <div className="text-xs text-slate-500 px-1.5">
                            +{dayTasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#202940] border border-white/10 rounded-lg shadow-xl py-2 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={openAddTask}
            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#FFC300]/20 flex items-center gap-2"
          >
            <Plus size={16} className="text-[#FFC300]" />
            Add Task
          </button>
          {getTasksForDate(selectedDay).filter(t => t.task_type).map((task) => (
            <button
              key={task.id}
              onClick={() => {
                handleDeleteTask(task.id);
                closeContextMenu();
              }}
              className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#E91E63]/20 flex items-center gap-2"
            >
              <Trash2 size={16} className="text-[#E91E63]" />
              Delete: {task.title}
            </button>
          ))}
        </div>
      )}

      {/* Add Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#202940] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-['Barlow_Condensed']">
              Add New Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Title *</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Task title"
                className="bg-[#1A2035] border-white/10 text-white"
                data-testid="task-title-input"
              />
            </div>
            <div>
              <Label className="text-slate-300">Date</Label>
              <Input
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                className="bg-[#1A2035] border-white/10 text-white"
                data-testid="task-date-input"
              />
            </div>
            <div>
              <Label className="text-slate-300">Type</Label>
              <Select
                value={newTask.task_type}
                onValueChange={(value) => setNewTask({ ...newTask, task_type: value })}
              >
                <SelectTrigger className="bg-[#1A2035] border-white/10 text-white" data-testid="task-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#202940] border-white/10">
                  {TASK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-white hover:bg-[#1A2035]">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color }} />
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Optional description..."
                className="bg-[#1A2035] border-white/10 text-white min-h-[80px]"
                data-testid="task-description-input"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1 border-white/10 text-white hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTask}
                className="flex-1 bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
                data-testid="create-task-btn"
              >
                Create Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Legend */}
      <Card className="bg-[#202940] border-white/5">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 justify-center">
            {[
              { label: 'Laying', color: '#FFC300' },
              { label: 'Incubation', color: '#FF9800' },
              { label: 'Hatching', color: '#00BFA6' },
              { label: 'Banding', color: '#E91E63' },
              { label: 'Weaning', color: '#9C27B0' },
              { label: 'Manual', color: '#64748B' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-slate-300">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
