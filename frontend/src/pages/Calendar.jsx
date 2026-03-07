import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { dashboardApi } from '../lib/api';
import { cn, getTaskTypeColor } from '../lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const CalendarPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getTasksForDate = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(task => task.due_date === dateStr);
  };

  const today = new Date();
  const isToday = (day) => {
    return today.getFullYear() === year && 
           today.getMonth() === month && 
           today.getDate() === day;
  };

  // Generate calendar days
  const calendarDays = [];
  
  // Empty cells before first day
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push({ day: null, key: `empty-start-${i}` });
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({ day, key: `day-${day}` });
  }
  
  // Empty cells after last day to complete the grid
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
            Calendar
          </h1>
          <p className="text-slate-400 mt-1">
            View your breeding schedule
          </p>
        </div>
        <Button
          onClick={goToToday}
          variant="outline"
          className="border-[#FFC300]/50 text-[#FFC300] hover:bg-[#FFC300]/10"
          data-testid="go-to-today-btn"
        >
          <CalendarIcon size={16} className="mr-2" />
          Today
        </Button>
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
                    day ? 'bg-[#1A2035] hover:bg-[#1A2035]/80' : '',
                    isDayToday && 'ring-2 ring-[#FFC300] ring-inset'
                  )}
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
                        {dayTasks.slice(0, 3).map((task) => (
                          <div
                            key={task.id}
                            className="text-xs px-1.5 py-0.5 rounded truncate"
                            style={{ 
                              backgroundColor: `${getTaskTypeColor(task.type)}20`,
                              color: getTaskTypeColor(task.type)
                            }}
                            title={`${task.type}: ${task.cage_label}`}
                          >
                            {task.type}
                          </div>
                        ))}
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
