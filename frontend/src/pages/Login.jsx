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

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      toast.success(t('auth.loginSuccess') || 'Login efetuado com sucesso!');
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.detail || t('auth.loginError') || 'Email ou password incorretos';
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
              {t('auth.welcomeBack') || 'Bem-vindo de volta'}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t('auth.enterCredentials') || 'Introduza as suas credenciais para aceder'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    data-testid="login-email"
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
                    data-testid="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-[#FFC300] hover:underline"
                >
                  {t('auth.forgotPassword') || 'Esqueceu a password?'}
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FFC300] text-[#0F1420] hover:bg-[#FFC300]/90 font-semibold"
                data-testid="login-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading') || 'A processar...'}
                  </>
                ) : (
                  t('auth.login') || 'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-slate-400">
                {t('auth.noAccount') || 'Não tem conta?'}{' '}
                <Link to="/register" className="text-[#FFC300] hover:underline font-medium">
                  {t('auth.createAccount') || 'Criar conta'}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
