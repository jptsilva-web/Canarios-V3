import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateShort = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export const getStatusColor = (status) => {
  const colors = {
    laying: 'bg-[#FFC300] text-[#1A2035]',
    incubating: 'bg-[#FF9800] text-white',
    hatching: 'bg-[#00BFA6] text-white',
    weaning: 'bg-[#E91E63] text-white',
    completed: 'bg-slate-500 text-white',
  };
  return colors[status] || 'bg-slate-500 text-white';
};

export const getEggStatusColor = (status) => {
  const colors = {
    fresh: 'bg-white text-slate-700',
    fertile: 'bg-[#FFC300] text-[#1A2035]',
    infertile: 'bg-slate-400 text-white',
    hatched: 'bg-[#00BFA6] text-white',
    dead: 'bg-slate-700 text-slate-400',
  };
  return colors[status] || 'bg-slate-500 text-white';
};

export const getTaskTypeColor = (type) => {
  const colors = {
    laying: '#FFC300',
    incubation: '#FF9800',
    hatching: '#00BFA6',
    banding: '#E91E63',
    weaning: '#9C27B0',
  };
  return colors[type] || '#64748B';
};

export const getDaysUntil = (dateString) => {
  if (!dateString) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getDaysLabel = (days) => {
  if (days === null) return '';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
};
