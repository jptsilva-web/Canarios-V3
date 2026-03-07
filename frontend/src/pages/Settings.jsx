import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon,
  Save,
  RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DEFAULT_SETTINGS = {
  days_incubation: 13,
  days_hatching: 0,
  days_banding: 5,
  days_separator: 21,
  days_weaning: 35,
};

const STAGE_COLORS = [
  { key: 'laying', label: 'Laying Eggs', color: '#FFC300', description: 'Female is laying eggs' },
  { key: 'incubating', label: 'Incubating', color: '#FF9800', description: 'Eggs being incubated' },
  { key: 'hatching', label: 'Hatching', color: '#00BFA6', description: 'Chicks hatching from eggs' },
  { key: 'banding', label: 'Banding', color: '#E91E63', description: 'Time to put rings on chicks' },
  { key: 'weaning', label: 'Weaning', color: '#9C27B0', description: 'Separate chicks from parents' },
];

export const Settings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success('Settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    toast.info('Settings reset to defaults');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC300]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Barlow_Condensed'] tracking-tight">
            Settings
          </h1>
          <p className="text-slate-400 mt-1">
            Configure breeding cycle timings
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            className="border-white/10 text-white hover:bg-white/5"
            data-testid="reset-settings-btn"
          >
            <RotateCcw size={16} className="mr-2" /> Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
            data-testid="save-settings-btn"
          >
            <Save size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Breeding Cycle Configuration */}
      <Card className="bg-[#202940] border-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white font-['Barlow_Condensed'] uppercase tracking-wider">
            Breeding Cycle Days
          </CardTitle>
          <p className="text-sm text-slate-400">
            Configure the number of days for each breeding stage (from start of incubation)
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF9800]" />
                Days to Hatch (Incubation)
              </Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={settings.days_incubation}
                onChange={(e) => setSettings({ ...settings, days_incubation: parseInt(e.target.value) || 13 })}
                className="bg-[#1A2035] border-white/10 text-white"
                data-testid="days-incubation-input"
              />
              <p className="text-xs text-slate-500">Days from incubation start to hatching</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#E91E63]" />
                Days to Band (after hatch)
              </Label>
              <Input
                type="number"
                min="1"
                max="15"
                value={settings.days_banding}
                onChange={(e) => setSettings({ ...settings, days_banding: parseInt(e.target.value) || 5 })}
                className="bg-[#1A2035] border-white/10 text-white"
                data-testid="days-banding-input"
              />
              <p className="text-xs text-slate-500">Days after hatching to put rings</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#00BFA6]" />
                Days to Separator (after hatch)
              </Label>
              <Input
                type="number"
                min="1"
                max="40"
                value={settings.days_separator}
                onChange={(e) => setSettings({ ...settings, days_separator: parseInt(e.target.value) || 21 })}
                className="bg-[#1A2035] border-white/10 text-white"
                data-testid="days-separator-input"
              />
              <p className="text-xs text-slate-500">Days after hatching to put separator/start new clutch</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#9C27B0]" />
                Days to Wean (after hatch)
              </Label>
              <Input
                type="number"
                min="1"
                max="60"
                value={settings.days_weaning}
                onChange={(e) => setSettings({ ...settings, days_weaning: parseInt(e.target.value) || 35 })}
                className="bg-[#1A2035] border-white/10 text-white"
                data-testid="days-weaning-input"
              />
              <p className="text-xs text-slate-500">Days after hatching to separate from parents</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Colors Legend */}
      <Card className="bg-[#202940] border-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white font-['Barlow_Condensed'] uppercase tracking-wider">
            Stage Colors Legend
          </CardTitle>
          <p className="text-sm text-slate-400">
            Colors used to indicate breeding stages in the Zones view
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {STAGE_COLORS.map((stage) => (
              <div 
                key={stage.key}
                className="p-4 rounded-lg border"
                style={{ 
                  backgroundColor: `${stage.color}15`,
                  borderColor: `${stage.color}50`
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="font-medium text-white">{stage.label}</span>
                </div>
                <p className="text-xs text-slate-400">{stage.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline Preview */}
      <Card className="bg-[#202940] border-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white font-['Barlow_Condensed'] uppercase tracking-wider">
            Timeline Preview
          </CardTitle>
          <p className="text-sm text-slate-400">
            Visual timeline based on your settings (days from incubation start)
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="h-2 bg-[#1A2035] rounded-full overflow-hidden flex">
              <div 
                className="h-full"
                style={{ 
                  width: `${(settings.days_incubation / settings.days_weaning) * 100}%`,
                  backgroundColor: '#FF9800'
                }}
                title={`Incubation: Day 0-${settings.days_incubation}`}
              />
              <div 
                className="h-full"
                style={{ 
                  width: `${(settings.days_banding / settings.days_weaning) * 100}%`,
                  backgroundColor: '#00BFA6'
                }}
                title={`Hatching to Banding: Day ${settings.days_incubation}-${settings.days_incubation + settings.days_banding}`}
              />
              <div 
                className="h-full"
                style={{ 
                  width: `${((settings.days_separator - settings.days_banding) / settings.days_weaning) * 100}%`,
                  backgroundColor: '#E91E63'
                }}
                title={`Banding to Separator: Day ${settings.days_incubation + settings.days_banding}-${settings.days_incubation + settings.days_separator}`}
              />
              <div 
                className="h-full flex-1"
                style={{ backgroundColor: '#9C27B0' }}
                title={`Separator to Weaning: Day ${settings.days_incubation + settings.days_separator}-${settings.days_incubation + settings.days_weaning}`}
              />
            </div>
            <div className="flex justify-between mt-3 text-xs text-slate-400">
              <span>Day 0</span>
              <span>Hatch: Day {settings.days_incubation}</span>
              <span>Band: Day {settings.days_incubation + settings.days_banding}</span>
              <span>Separator: Day {settings.days_incubation + settings.days_separator}</span>
              <span>Wean: Day {settings.days_incubation + settings.days_weaning}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
