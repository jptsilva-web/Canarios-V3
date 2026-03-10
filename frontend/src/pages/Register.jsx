import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bird, Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';

export const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error(t('auth.passwordMismatch') || 'As passwords não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      toast.error(t('auth.passwordTooShort') || 'A password deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      await register(formData.email, formData.name, formData.password);
      toast.success(t('auth.registerSuccess') || 'Conta criada com sucesso!');
      navigate('/');
    } catch (error) {
      console.error('Register error:', error);
      const message = error.response?.data?.detail || t('auth.registerError') || 'Erro ao criar conta';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1420] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFC300] to-[#FF9800] mb-4">
            <Bird size={32} className="text-[#0F1420]" />
          </div>
          <h1 className="text-3xl font-bold text-white font-['Barlow_Condensed'] tracking-wide">
            ORNITUGA
          </h1>
          <p className="text-slate-400 mt-1">Gestão de Criação de Canários</p>
        </div>

        <Card className="bg-[#202940] border-white/5">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-white">
              {t('auth.createAccount') || 'Criar Conta'}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t('auth.fillDetails') || 'Preencha os dados para criar a sua conta'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">
                  {t('auth.name') || 'Nome'}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input
                    id="name"
                    type="text"
                    placeholder="O seu nome"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10 bg-[#1A2035] border-white/10 text-white placeholder:text-slate-500"
                    required
                    data-testid="register-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  {t('auth.email') || 'Email'}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 bg-[#1A2035] border-white/10 text-white placeholder:text-slate-500"
                    required
                    data-testid="register-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  {t('auth.password') || 'Password'}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10 bg-[#1A2035] border-white/10 text-white placeholder:text-slate-500"
                    required
                    minLength={6}
                    data-testid="register-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  {t('auth.passwordMinLength') || 'Mínimo de 6 caracteres'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">
                  {t('auth.confirmPassword') || 'Confirmar Password'}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10 bg-[#1A2035] border-white/10 text-white placeholder:text-slate-500"
                    required
                    data-testid="register-confirm-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FFC300] text-[#0F1420] hover:bg-[#FFC300]/90 font-semibold"
                data-testid="register-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading') || 'A processar...'}
                  </>
                ) : (
                  t('auth.createAccount') || 'Criar Conta'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-slate-400">
                {t('auth.hasAccount') || 'Já tem conta?'}{' '}
                <Link to="/login" className="text-[#FFC300] hover:underline font-medium">
                  {t('auth.login') || 'Entrar'}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
