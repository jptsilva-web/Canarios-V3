import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Calendar,
  Check,
  Trash2,
  Edit,
  Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { seasonsApi } from '../lib/api';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useLanguage } from '../lib/LanguageContext';

export const Seasons = () => {
  const { t } = useLanguage();
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [editingSeason, setEditingSeason] = useState(null);

  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    year: currentYear,
    name: String(currentYear),
    start_date: `${currentYear}-01-01`,
    end_date: `${currentYear}-12-31`,
    is_active: false,
    notes: '',
  });

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const res = await seasonsApi.getAll();
      setSeasons(res.data);
    } catch (error) {
      console.error('Error fetching seasons:', error);
      toast.error(t('messages.seasonLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      year: currentYear,
      name: String(currentYear),
      start_date: `${currentYear}-01-01`,
      end_date: `${currentYear}-12-31`,
      is_active: false,
      notes: '',
    });
    setEditingSeason(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSeason) {
        await seasonsApi.update(editingSeason.id, formData);
        toast.success(t('messages.seasonUpdated'));
      } else {
        await seasonsApi.create(formData);
        toast.success(t('messages.seasonCreated'));
      }
      fetchSeasons();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving season:', error);
      toast.error(t('messages.seasonSaveError'));
    }
  };

  const handleEdit = (season) => {
    setEditingSeason(season);
    setFormData({
      year: season.year,
      name: season.name,
      start_date: season.start_date || '',
      end_date: season.end_date || '',
      is_active: season.is_active,
      notes: season.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await seasonsApi.delete(deleteDialog.id);
      toast.success(t('messages.seasonDeleted'));
      fetchSeasons();
    } catch (error) {
      toast.error(t('messages.seasonDeleteError'));
    } finally {
      setDeleteDialog(null);
    }
  };

  const handleActivate = async (season) => {
    try {
      await seasonsApi.activate(season.id);
      toast.success(t('messages.seasonActivated'));
      fetchSeasons();
    } catch (error) {
      toast.error(t('messages.seasonActivateError'));
    }
  };

  // Generate year suggestions
  const yearSuggestions = [];
  for (let y = currentYear + 1; y >= currentYear - 5; y--) {
    yearSuggestions.push(y);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC300]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="seasons-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Barlow_Condensed'] tracking-tight">
            {t('seasons.title')}
          </h1>
          <p className="text-slate-400 mt-1">
            {t('seasons.subtitle')}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button 
              className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90 font-bold"
              data-testid="add-season-btn"
            >
              <Plus size={20} className="mr-2" /> {t('seasons.addSeason')}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#202940] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-['Barlow_Condensed']">
                {editingSeason ? t('seasons.editSeason') : t('seasons.addSeason')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">{t('seasons.year')} *</Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) => {
                      const year = parseInt(e.target.value);
                      setFormData({ 
                        ...formData, 
                        year,
                        name: String(year),
                        start_date: `${year}-01-01`,
                        end_date: `${year}-12-31`,
                      });
                    }}
                    className="bg-[#1A2035] border-white/10 text-white"
                    required
                    data-testid="year-input"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">{t('seasons.name')}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., 2024, Spring 2024"
                    className="bg-[#1A2035] border-white/10 text-white"
                    data-testid="name-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">{t('seasons.startDate')}</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="bg-[#1A2035] border-white/10 text-white"
                    data-testid="start-date-input"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">{t('seasons.endDate')}</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="bg-[#1A2035] border-white/10 text-white"
                    data-testid="end-date-input"
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">{t('common.notes')}</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes..."
                  className="bg-[#1A2035] border-white/10 text-white"
                  data-testid="notes-input"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#1A2035]">
                <div>
                  <Label className="text-white">{t('seasons.setActive')}</Label>
                  <p className="text-xs text-slate-400">{t('seasons.setActiveDesc')}</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  data-testid="active-switch"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
                  data-testid="save-season-btn"
                >
                  {editingSeason ? t('common.save') : t('common.add')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Add Years */}
      <Card className="bg-[#202940] border-white/5">
        <CardContent className="py-4">
          <p className="text-sm text-slate-400 mb-3">{t('seasons.quickAdd')}:</p>
          <div className="flex flex-wrap gap-2">
            {yearSuggestions.map((year) => {
              const exists = seasons.some(s => s.year === year);
              return (
                <Button
                  key={year}
                  variant="outline"
                  size="sm"
                  disabled={exists}
                  onClick={() => {
                    setFormData({
                      year,
                      name: String(year),
                      start_date: `${year}-01-01`,
                      end_date: `${year}-12-31`,
                      is_active: false,
                      notes: '',
                    });
                    setDialogOpen(true);
                  }}
                  className={cn(
                    "border-white/10",
                    exists 
                      ? "text-slate-500 cursor-not-allowed" 
                      : "text-white hover:bg-white/5 hover:border-[#FFC300]/50"
                  )}
                >
                  {year} {exists && <Check size={14} className="ml-1 text-[#00BFA6]" />}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Seasons List */}
      {seasons.length === 0 ? (
        <Card className="bg-[#202940] border-white/5">
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl text-white font-['Barlow_Condensed']">{t('seasons.noSeasons')}</h3>
            <p className="text-slate-400 mt-2">{t('seasons.noSeasonsDesc')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seasons.sort((a, b) => b.year - a.year).map((season) => (
            <Card 
              key={season.id} 
              className={cn(
                "bg-[#202940] border-2 transition-colors",
                season.is_active 
                  ? "border-[#FFC300]" 
                  : "border-white/5 hover:border-white/10"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-bold text-white font-['Barlow_Condensed']">
                        {season.year}
                      </h3>
                      {season.is_active && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#FFC300] text-[#1A2035]">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm">{season.name}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-slate-600" />
                </div>

                {(season.start_date || season.end_date) && (
                  <div className="mt-3 text-xs text-slate-500">
                    {season.start_date} — {season.end_date}
                  </div>
                )}

                {season.notes && (
                  <p className="mt-2 text-sm text-slate-400 truncate">{season.notes}</p>
                )}

                <div className="flex gap-2 mt-4">
                  {!season.is_active && (
                    <Button
                      size="sm"
                      onClick={() => handleActivate(season)}
                      className="flex-1 bg-[#00BFA6] text-white hover:bg-[#00BFA6]/90"
                      data-testid={`activate-${season.id}`}
                    >
                      <Star size={14} className="mr-1" /> {t('seasons.activate')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(season)}
                    className="border-white/10 text-white hover:bg-white/5"
                    data-testid={`edit-${season.id}`}
                  >
                    <Edit size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteDialog(season)}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    data-testid={`delete-${season.id}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent className="bg-[#202940] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t('common.delete')}?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {t('seasons.confirmDelete')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
