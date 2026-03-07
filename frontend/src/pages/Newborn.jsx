import React, { useState, useEffect } from 'react';
import { 
  Baby,
  Search,
  Filter,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { pairsApi, birdsApi, clutchesApi, cagesApi } from '../lib/api';
import { cn, formatDate } from '../lib/utils';
import { toast } from 'sonner';

export const Newborn = () => {
  const [newborns, setNewborns] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [birds, setBirds] = useState([]);
  const [cages, setCages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [selectedNewborn, setSelectedNewborn] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pairsRes, birdsRes, clutchesRes, cagesRes] = await Promise.all([
        pairsApi.getAll(),
        birdsApi.getAll(),
        clutchesApi.getAll(),
        cagesApi.getAll(),
      ]);
      
      setPairs(pairsRes.data);
      setBirds(birdsRes.data);
      setCages(cagesRes.data);
      
      // Extract banded eggs from all clutches
      const bandedChicks = [];
      
      for (const clutch of clutchesRes.data) {
        const pair = pairsRes.data.find(p => p.id === clutch.pair_id);
        if (!pair) continue;
        
        const cage = cagesRes.data.find(c => c.id === pair.cage_id);
        const father = birdsRes.data.find(b => b.id === pair.male_id);
        const mother = birdsRes.data.find(b => b.id === pair.female_id);
        
        // Get banded eggs from this clutch
        const bandedEggs = clutch.eggs?.filter(egg => egg.band_number && egg.status === 'hatched') || [];
        
        for (const egg of bandedEggs) {
          bandedChicks.push({
            id: egg.id,
            band_number: egg.band_number,
            banded_date: egg.banded_date,
            hatched_date: egg.hatched_date,
            pair_id: pair.id,
            pair_name: pair.name || `Pair ${pair.id.slice(0, 6)}`,
            cage_label: cage?.label || '-',
            father: father ? {
              id: father.id,
              band_number: father.band_number,
              stam: father.stam || father.color,
              gender: 'male'
            } : null,
            mother: mother ? {
              id: mother.id,
              band_number: mother.band_number,
              stam: mother.stam || mother.color,
              gender: 'female'
            } : null,
            clutch_start: clutch.start_date,
            year: egg.banded_date ? new Date(egg.banded_date).getFullYear() : new Date().getFullYear(),
          });
        }
      }
      
      // Sort by banded date (most recent first)
      bandedChicks.sort((a, b) => {
        if (!a.banded_date) return 1;
        if (!b.banded_date) return -1;
        return new Date(b.banded_date) - new Date(a.banded_date);
      });
      
      setNewborns(bandedChicks);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Get unique years for filter
  const years = [...new Set(newborns.map(n => n.year))].sort((a, b) => b - a);

  const filteredNewborns = newborns.filter((chick) => {
    const matchesSearch = 
      chick.band_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chick.pair_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chick.father?.band_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chick.mother?.band_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = yearFilter === 'all' || chick.year.toString() === yearFilter;
    return matchesSearch && matchesYear;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC300]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="newborn-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Barlow_Condensed'] tracking-tight">
            Newborn Registry
          </h1>
          <p className="text-slate-400 mt-1">
            {newborns.length} banded chicks
          </p>
        </div>
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
                placeholder="Search by ring number, pair, or parent..."
                className="pl-10 bg-[#1A2035] border-white/10 text-white"
                data-testid="search-input"
              />
            </div>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-[#1A2035] border-white/10 text-white" data-testid="year-filter">
                <Filter size={16} className="mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#202940] border-white/10">
                <SelectItem value="all" className="text-white hover:bg-[#1A2035]">All Years</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()} className="text-white hover:bg-[#1A2035]">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Newborns Table */}
      {newborns.length === 0 ? (
        <Card className="bg-[#202940] border-white/5">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Baby className="w-16 h-16 text-slate-500 mb-4" />
            <h3 className="text-xl font-['Barlow_Condensed'] text-white mb-2">No Banded Chicks Yet</h3>
            <p className="text-slate-400 text-center max-w-md">
              When you band newly hatched chicks in your clutches, they will appear here with their lineage information.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#202940] border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">Ring Number</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">Pair</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">Cage</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">Father</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">Mother</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">Hatched</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">Banded</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNewborns.map((chick) => (
                  <TableRow 
                    key={chick.id} 
                    className="border-white/5 hover:bg-[#FFC300]/5"
                    data-testid={`newborn-row-${chick.id}`}
                  >
                    <TableCell className="font-mono text-[#FFC300] font-bold">
                      {chick.band_number || '-'}
                    </TableCell>
                    <TableCell className="text-white">
                      {chick.pair_name}
                    </TableCell>
                    <TableCell className="text-slate-300 font-mono">
                      {chick.cage_label}
                    </TableCell>
                    <TableCell>
                      {chick.father ? (
                        <div>
                          <span className="text-[#00BFA6] font-mono">{chick.father.band_number}</span>
                          {chick.father.stam && (
                            <span className="text-slate-400 text-xs ml-2">({chick.father.stam})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {chick.mother ? (
                        <div>
                          <span className="text-[#FF69B4] font-mono">{chick.mother.band_number}</span>
                          {chick.mother.stam && (
                            <span className="text-slate-400 text-xs ml-2">({chick.mother.stam})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {formatDate(chick.hatched_date)}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {formatDate(chick.banded_date)}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => setSelectedNewborn(chick)}
                        className="p-2 rounded-lg text-slate-400 hover:text-[#FFC300] hover:bg-[#FFC300]/10 transition-colors"
                        data-testid={`view-newborn-${chick.id}`}
                      >
                        <Eye size={16} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      {newborns.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-[#202940] border-white/5">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#FFC300] font-['Barlow_Condensed']">
                  {newborns.length}
                </p>
                <p className="text-sm text-slate-400">Total Banded</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#202940] border-white/5">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#00BFA6] font-['Barlow_Condensed']">
                  {new Set(newborns.map(n => n.pair_id)).size}
                </p>
                <p className="text-sm text-slate-400">Producing Pairs</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#202940] border-white/5">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#FF69B4] font-['Barlow_Condensed']">
                  {newborns.filter(n => n.year === new Date().getFullYear()).length}
                </p>
                <p className="text-sm text-slate-400">This Year</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedNewborn} onOpenChange={() => setSelectedNewborn(null)}>
        <DialogContent className="bg-[#202940] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-['Barlow_Condensed'] flex items-center gap-2">
              <Baby className="text-[#FFC300]" size={24} />
              Newborn Details
            </DialogTitle>
          </DialogHeader>
          {selectedNewborn && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#1A2035] text-center">
                <p className="text-2xl font-bold text-[#FFC300] font-mono">
                  {selectedNewborn.band_number}
                </p>
                <p className="text-sm text-slate-400">Ring Number</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-[#1A2035]">
                  <p className="text-xs text-slate-400 uppercase mb-1">Pair</p>
                  <p className="text-white font-medium">{selectedNewborn.pair_name}</p>
                  <p className="text-xs text-slate-500">Cage {selectedNewborn.cage_label}</p>
                </div>
                <div className="p-3 rounded-lg bg-[#1A2035]">
                  <p className="text-xs text-slate-400 uppercase mb-1">Hatched</p>
                  <p className="text-white">{formatDate(selectedNewborn.hatched_date)}</p>
                  <p className="text-xs text-slate-500">Banded: {formatDate(selectedNewborn.banded_date)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-slate-400 uppercase font-['Barlow_Condensed']">Parents</p>
                
                <div className="p-3 rounded-lg bg-[#1A2035] border-l-4 border-[#00BFA6]">
                  <p className="text-xs text-[#00BFA6] uppercase mb-1">Father</p>
                  {selectedNewborn.father ? (
                    <>
                      <p className="text-white font-mono">{selectedNewborn.father.band_number}</p>
                      {selectedNewborn.father.stam && (
                        <p className="text-sm text-slate-400">STAM: {selectedNewborn.father.stam}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-500">Not assigned</p>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-[#1A2035] border-l-4 border-[#FF69B4]">
                  <p className="text-xs text-[#FF69B4] uppercase mb-1">Mother</p>
                  {selectedNewborn.mother ? (
                    <>
                      <p className="text-white font-mono">{selectedNewborn.mother.band_number}</p>
                      {selectedNewborn.mother.stam && (
                        <p className="text-sm text-slate-400">STAM: {selectedNewborn.mother.stam}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-500">Not assigned</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
