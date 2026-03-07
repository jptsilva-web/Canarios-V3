import React, { useState, useEffect } from 'react';
import { 
  Save,
  RotateCcw,
  Mail,
  Send,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { useLanguage } from '../lib/LanguageContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DEFAULT_BREEDING = {
  days_incubation: 13,
  days_hatching: 0,
  days_banding: 5,
  days_separator: 21,
  days_weaning: 35,
};

const DEFAULT_EMAIL = {
  notification_email: '',
  email_enabled: false,
  smtp_email: '',
  smtp_password: '',
};

const STAGE_COLORS = [
  { key: 'laying', label: 'Laying Eggs', color: '#FFC300', description: 'Female is laying eggs' },
  { key: 'incubating', label: 'Incubating', color: '#FF9800', description: 'Eggs being incubated' },
  { key: 'hatching', label: 'Hatching', color: '#00BFA6', description: 'Chicks hatching from eggs' },
  { key: 'banding', label: 'Banding', color: '#E91E63', description: 'Time to put rings on chicks' },
  { key: 'weaning', label: 'Weaning', color: '#9C27B0', description: 'Separate chicks from parents' },
];

export const Settings = () => {
  const { t } = useLanguage();
  const [breedingSettings, setBreedingSettings] = useState(DEFAULT_BREEDING);
  const [emailSettings, setEmailSettings] = useState(DEFAULT_EMAIL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.breeding) {
          setBreedingSettings({ ...DEFAULT_BREEDING, ...data.breeding });
        }
        if (data.email) {
          setEmailSettings({ ...DEFAULT_EMAIL, ...data.email });
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBreeding = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/breeding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(breedingSettings),
      });
      if (res.ok) {
        toast.success(t('messages.breedingSettingsSaved'));
      } else {
        toast.error(t('messages.settingsError'));
      }
    } catch (error) {
      toast.error(t('messages.settingsError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailSettings),
      });
      if (res.ok) {
        toast.success(t('messages.emailSettingsSaved'));
      } else {
        toast.error(t('messages.settingsError'));
      }
    } catch (error) {
      toast.error(t('messages.settingsError'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!emailSettings.notification_email) {
      toast.error(t('messages.emailRequired'));
      return;
    }
    
    // Save email settings first
    await handleSaveEmail();
    
    setTestingEmail(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/test-email`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success(t('messages.testEmailSent'));
      } else {
        const data = await res.json();
        toast.error(data.detail || t('messages.testEmailError'));
      }
    } catch (error) {
      toast.error(t('messages.testEmailError'));
    } finally {
      setTestingEmail(false);
    }
  };

  const handleReset = () => {
    setBreedingSettings(DEFAULT_BREEDING);
    toast.info(t('messages.settingsReset'));
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
      <div>
        <h1 className="text-3xl font-bold text-white font-['Barlow_Condensed'] tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="text-slate-400 mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Email Notifications */}
      <Card className="bg-[#202940] border-white/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white font-['Barlow_Condensed'] uppercase tracking-wider flex items-center gap-2">
              <Mail size={20} className="text-[#FFC300]" />
              {t('settings.emailNotifications')}
            </CardTitle>
            <p className="text-sm text-slate-400 mt-1">
              {t('settings.subtitle')}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-[#1A2035]">
            <div>
              <Label className="text-white">{t('settings.enableNotifications')}</Label>
              <p className="text-xs text-slate-400 mt-1">{t('settings.subtitle')}</p>
            </div>
            <Switch
              checked={emailSettings.email_enabled}
              onCheckedChange={(checked) => setEmailSettings({ ...emailSettings, email_enabled: checked })}
              data-testid="email-enabled-switch"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-slate-300">{t('settings.notificationEmail')}</Label>
            <div className="flex gap-3">
              <Input
                type="email"
                value={emailSettings.notification_email}
                onChange={(e) => setEmailSettings({ ...emailSettings, notification_email: e.target.value })}
                placeholder="your@email.com"
                className="bg-[#1A2035] border-white/10 text-white flex-1"
                data-testid="notification-email-input"
              />
              <Button
                onClick={handleTestEmail}
                disabled={testingEmail || !emailSettings.notification_email}
                variant="outline"
                className="border-[#FFC300]/50 text-[#FFC300] hover:bg-[#FFC300]/10"
                data-testid="test-email-btn"
              >
                <Send size={16} className="mr-2" />
                {testingEmail ? 'Sending...' : 'Test'}
              </Button>
            </div>
            <p className="text-xs text-slate-500">Email address to receive task notifications</p>
          </div>

          {/* Gmail App Password Info */}
          <div className="p-4 rounded-lg bg-[#FF9800]/10 border border-[#FF9800]/30">
            <p className="text-sm text-[#FF9800] font-medium mb-2">Gmail Setup Required</p>
            <p className="text-xs text-slate-300">
              To send emails via Gmail, you need to use an <strong>App Password</strong> instead of your regular password.
            </p>
            <ol className="text-xs text-slate-400 mt-2 space-y-1 list-decimal list-inside">
              <li>Go to your Google Account → Security → 2-Step Verification</li>
              <li>At the bottom, click "App passwords"</li>
              <li>Generate a new app password for "Mail"</li>
              <li>Enter your Gmail and App Password below</li>
            </ol>
          </div>

          {/* SMTP Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-[#1A2035]">
            <div className="space-y-2">
              <Label className="text-slate-300">Sender Gmail Address</Label>
              <Input
                type="email"
                value={emailSettings.smtp_email}
                onChange={(e) => setEmailSettings({ ...emailSettings, smtp_email: e.target.value })}
                placeholder="your-canary-app@gmail.com"
                className="bg-[#202940] border-white/10 text-white"
                data-testid="smtp-email-input"
              />
              <p className="text-xs text-slate-500">Gmail account to send from</p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Gmail App Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={emailSettings.smtp_password}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtp_password: e.target.value })}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="bg-[#202940] border-white/10 text-white pr-10"
                  data-testid="smtp-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-slate-500">16-character app password from Google</p>
            </div>
          </div>

          <Button
            onClick={handleSaveEmail}
            disabled={saving}
            className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
            data-testid="save-email-btn"
          >
            <Save size={16} className="mr-2" /> Save Email Settings
          </Button>
        </CardContent>
      </Card>

      {/* Breeding Cycle Configuration */}
      <Card className="bg-[#202940] border-white/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white font-['Barlow_Condensed'] uppercase tracking-wider">
              Breeding Cycle Days
            </CardTitle>
            <p className="text-sm text-slate-400 mt-1">
              Configure the number of days for each breeding stage
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleReset}
            className="border-white/10 text-white hover:bg-white/5"
            data-testid="reset-settings-btn"
          >
            <RotateCcw size={16} className="mr-2" /> Reset
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF9800]" />
                Days to Hatch
              </Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={breedingSettings.days_incubation}
                onChange={(e) => setBreedingSettings({ ...breedingSettings, days_incubation: parseInt(e.target.value) || 13 })}
                className="bg-[#1A2035] border-white/10 text-white"
                data-testid="days-incubation-input"
              />
              <p className="text-xs text-slate-500">Incubation period</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#E91E63]" />
                Days to Band
              </Label>
              <Input
                type="number"
                min="1"
                max="15"
                value={breedingSettings.days_banding}
                onChange={(e) => setBreedingSettings({ ...breedingSettings, days_banding: parseInt(e.target.value) || 5 })}
                className="bg-[#1A2035] border-white/10 text-white"
                data-testid="days-banding-input"
              />
              <p className="text-xs text-slate-500">After hatching</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#00BFA6]" />
                Days to Separator
              </Label>
              <Input
                type="number"
                min="1"
                max="40"
                value={breedingSettings.days_separator}
                onChange={(e) => setBreedingSettings({ ...breedingSettings, days_separator: parseInt(e.target.value) || 21 })}
                className="bg-[#1A2035] border-white/10 text-white"
                data-testid="days-separator-input"
              />
              <p className="text-xs text-slate-500">After hatching</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#9C27B0]" />
                Days to Wean
              </Label>
              <Input
                type="number"
                min="1"
                max="60"
                value={breedingSettings.days_weaning}
                onChange={(e) => setBreedingSettings({ ...breedingSettings, days_weaning: parseInt(e.target.value) || 35 })}
                className="bg-[#1A2035] border-white/10 text-white"
                data-testid="days-weaning-input"
              />
              <p className="text-xs text-slate-500">After hatching</p>
            </div>
          </div>

          <Button
            onClick={handleSaveBreeding}
            disabled={saving}
            className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
            data-testid="save-breeding-btn"
          >
            <Save size={16} className="mr-2" /> Save Breeding Settings
          </Button>
        </CardContent>
      </Card>

      {/* Stage Colors Legend */}
      <Card className="bg-[#202940] border-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white font-['Barlow_Condensed'] uppercase tracking-wider">
            Stage Colors Legend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {STAGE_COLORS.map((stage) => (
              <div 
                key={stage.key}
                className="p-3 rounded-lg border"
                style={{ 
                  backgroundColor: `${stage.color}15`,
                  borderColor: `${stage.color}50`
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="font-medium text-white text-sm">{stage.label}</span>
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
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="h-3 bg-[#1A2035] rounded-full overflow-hidden flex">
              <div 
                className="h-full"
                style={{ 
                  width: `${(breedingSettings.days_incubation / (breedingSettings.days_incubation + breedingSettings.days_weaning)) * 100}%`,
                  backgroundColor: '#FF9800'
                }}
              />
              <div 
                className="h-full"
                style={{ 
                  width: `${(breedingSettings.days_banding / (breedingSettings.days_incubation + breedingSettings.days_weaning)) * 100}%`,
                  backgroundColor: '#00BFA6'
                }}
              />
              <div 
                className="h-full"
                style={{ 
                  width: `${((breedingSettings.days_separator - breedingSettings.days_banding) / (breedingSettings.days_incubation + breedingSettings.days_weaning)) * 100}%`,
                  backgroundColor: '#E91E63'
                }}
              />
              <div 
                className="h-full flex-1"
                style={{ backgroundColor: '#9C27B0' }}
              />
            </div>
            <div className="flex justify-between mt-3 text-xs text-slate-400">
              <span>Day 0</span>
              <span>Hatch: {breedingSettings.days_incubation}</span>
              <span>Band: {breedingSettings.days_incubation + breedingSettings.days_banding}</span>
              <span>Wean: {breedingSettings.days_incubation + breedingSettings.days_weaning}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
