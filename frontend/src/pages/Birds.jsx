import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Bird,
  Edit,
  Trash2,
  Search,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { birdsApi } from '../lib/api';
import { cn, formatDate } from '../lib/utils';
import { toast } from 'sonner';

export const Birds = () => {
  const [birds, setBirds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [editingBird, setEditingBird] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');

  const [formData, setFormData] = useState({
    band_number: '',
    band_year: new Date().getFullYear(),
    breeder_number: '',
    gender: 'male',
    species: 'Canary',
    color: '',
    notes: '',
    birth_date: '',
  });

  const fetchBirds = async () => {
    try {
      const res = await birdsApi.getAll();
      setBirds(res.data);
    } catch (error) {
      console.error('Error fetching birds:', error);
      toast.error('Failed to load birds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBirds();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBird) {
        await birdsApi.update(editingBird.id, formData);
        toast.success('Bird updated');
      } else {
        await birdsApi.create(formData);
        toast.success('Bird added');
      }
      setDialogOpen(false);
      setEditingBird(null);
      resetForm();
      fetchBirds();
    } catch (error) {
      toast.error('Failed to save bird');
    }
  };

  const resetForm = () => {
    setFormData({
      band_number: '',
      band_year: new Date().getFullYear(),
      breeder_number: '',
      gender: 'male',
      species: 'Canary',
      color: '',
      notes: '',
      birth_date: '',
    });
  };

  const handleEdit = (bird) => {
    setEditingBird(bird);
    setFormData({
      band_number: bird.band_number || '',
      band_year: bird.band_year || new Date().getFullYear(),
      breeder_number: bird.breeder_number || '',
      gender: bird.gender || 'male',
      species: bird.species || 'Canary',
      color: bird.color || '',
      notes: bird.notes || '',
      birth_date: bird.birth_date || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await birdsApi.delete(deleteDialog.id);
      toast.success('Bird deleted');
      setDeleteDialog(null);
      fetchBirds();
    } catch (error) {
      toast.error('Failed to delete bird');
    }
  };

  const filteredBirds = birds.filter((bird) => {
    const matchesSearch = 
      bird.band_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bird.color?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bird.breeder_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender = genderFilter === 'all' || bird.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  const maleCount = birds.filter(b => b.gender === 'male').length;
  const femaleCount = birds.filter(b => b.gender === 'female').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC300]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="birds-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Barlow_Condensed'] tracking-tight">
            Bird Registry
          </h1>
          <p className="text-slate-400 mt-1">
            {birds.length} birds ({maleCount} males, {femaleCount} females)
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingBird(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90 font-bold"
              data-testid="add-bird-btn"
            >
              <Plus size={20} className="mr-2" /> Add Bird
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#202940] border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-['Barlow_Condensed']">
                {editingBird ? 'Edit Bird' : 'Add New Bird'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Band Number *</Label>
                  <Input
                    value={formData.band_number}
                    onChange={(e) => setFormData({ ...formData, band_number: e.target.value })}
                    placeholder="e.g., PT-001"
                    className="bg-[#1A2035] border-white/10 text-white font-mono"
                    required
                    data-testid="band-number-input"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Band Year</Label>
                  <Input
                    type="number"
                    value={formData.band_year}
                    onChange={(e) => setFormData({ ...formData, band_year: parseInt(e.target.value) })}
                    className="bg-[#1A2035] border-white/10 text-white"
                    data-testid="band-year-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Gender *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  >
                    <SelectTrigger className="bg-[#1A2035] border-white/10 text-white" data-testid="gender-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#202940] border-white/10">
                      <SelectItem value="male" className="text-white hover:bg-[#1A2035]">Male</SelectItem>
                      <SelectItem value="female" className="text-white hover:bg-[#1A2035]">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Color</Label>
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="e.g., Yellow"
                    className="bg-[#1A2035] border-white/10 text-white"
                    data-testid="color-input"
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Breeder Number</Label>
                <Input
                  value={formData.breeder_number}
                  onChange={(e) => setFormData({ ...formData, breeder_number: e.target.value })}
                  placeholder="Your breeder ID"
                  className="bg-[#1A2035] border-white/10 text-white"
                  data-testid="breeder-number-input"
                />
              </div>
              <div>
                <Label className="text-slate-300">Species</Label>
                <Input
                  value={formData.species}
                  onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                  placeholder="Canary"
                  className="bg-[#1A2035] border-white/10 text-white"
                  data-testid="species-input"
                />
              </div>
              <div>
                <Label className="text-slate-300">Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  className="bg-[#1A2035] border-white/10 text-white"
                  data-testid="notes-input"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
                  data-testid="save-bird-btn"
                >
                  {editingBird ? 'Update' : 'Add'} Bird
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="bg-[#202940] border-white/5">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by band number, color, or breeder..."
                className="pl-10 bg-[#1A2035] border-white/10 text-white"
                data-testid="search-input"
              />
            </div>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-[#1A2035] border-white/10 text-white" data-testid="gender-filter">
                <Filter size={16} className="mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#202940] border-white/10">
                <SelectItem value="all" className="text-white hover:bg-[#1A2035]">All Birds</SelectItem>
                <SelectItem value="male" className="text-white hover:bg-[#1A2035]">Males Only</SelectItem>
                <SelectItem value="female" className="text-white hover:bg-[#1A2035]">Females Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Birds Table */}
      {birds.length === 0 ? (
        <Card className="bg-[#202940] border-white/5">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bird className="w-16 h-16 text-slate-500 mb-4" />
            <h3 className="text-xl font-['Barlow_Condensed'] text-white mb-2">No Birds Yet</h3>
            <p className="text-slate-400 text-center max-w-md mb-6">
              Start by adding your birds to the registry. You can then use them to create breeding pairs.
            </p>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
            >
              <Plus size={20} className="mr-2" /> Add Your First Bird
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#202940] border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">Band</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">Gender</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">Color</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">Species</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">Year</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">Added</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBirds.map((bird) => (
                  <TableRow 
                    key={bird.id} 
                    className="border-white/5 hover:bg-[#FFC300]/5"
                    data-testid={`bird-row-${bird.id}`}
                  >
                    <TableCell className="font-mono text-white">{bird.band_number}</TableCell>
                    <TableCell>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        bird.gender === 'male' 
                          ? 'bg-[#00BFA6]/20 text-[#00BFA6]' 
                          : 'bg-[#E91E63]/20 text-[#E91E63]'
                      )}>
                        {bird.gender}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-300">{bird.color || '-'}</TableCell>
                    <TableCell className="text-slate-300">{bird.species}</TableCell>
                    <TableCell className="text-slate-400 font-mono">{bird.band_year}</TableCell>
                    <TableCell className="text-slate-400">{formatDate(bird.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(bird)}
                          className="p-2 rounded-lg text-slate-400 hover:text-[#FFC300] hover:bg-[#FFC300]/10 transition-colors"
                          data-testid={`edit-bird-${bird.id}`}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteDialog(bird)}
                          className="p-2 rounded-lg text-slate-400 hover:text-[#E91E63] hover:bg-[#E91E63]/10 transition-colors"
                          data-testid={`delete-bird-${bird.id}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent className="bg-[#202940] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Bird?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete this bird from the registry. If this bird is part of a breeding pair, 
              you should remove it from the pair first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-[#E91E63] text-white hover:bg-[#E91E63]/90"
              data-testid="confirm-delete-bird"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
