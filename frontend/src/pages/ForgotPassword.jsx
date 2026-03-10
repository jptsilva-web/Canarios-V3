import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Bird, Mail, Lock, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { forgotPassword, resetPassword } = useAuth();
  const { t } = useLanguage();
  
  const [step, setStep] = useState(searchParams.get('token') ? 'reset' : 'email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tokenPreview, setTokenPreview] = useState('');

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await forgotPassword(email);
      setTokenPreview(response.token_preview);
      setStep('token');
      toast.success(t('auth.resetEmailSent') || 'Email de recuperação enviado!');
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error(t('auth.resetEmailError') || 'Erro ao enviar email');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(t('auth.passwordMismatch') || 'As passwords não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('auth.passwordTooShort') || 'A password deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, newPassword);
      setStep('success');
      toast.success(t('auth.passwordResetSuccess') || 'Password alterada com sucesso!');
    } catch (error) {
      console.error('Reset password error:', error);
      const message = error.response?.data?.detail || t('auth.resetPasswordError') || 'Erro ao alterar password';
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
        </div>

        <Card className="bg-[#202940] border-white/5">
          {step === 'email' && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-white">
                  {t('auth.forgotPassword') || 'Recuperar Password'}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {t('auth.enterEmailForReset') || 'Introduza o seu email para receber o código de recuperação'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendEmail} className="space-y-4">
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-[#1A2035] border-white/10 text-white placeholder:text-slate-500"
                        required
                        data-testid="forgot-email"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#FFC300] text-[#0F1420] hover:bg-[#FFC300]/90 font-semibold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('common.loading') || 'A processar...'}
                      </>
                    ) : (
                      t('auth.sendResetCode') || 'Enviar Código'
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link to="/login" className="text-slate-400 hover:text-white inline-flex items-center gap-2">
                    <ArrowLeft size={16} />
                    {t('auth.backToLogin') || 'Voltar ao login'}
                  </Link>
                </div>
              </CardContent>
            </>
          )}

          {step === 'token' && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-white">
                  {t('auth.enterResetCode') || 'Introduza o Código'}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {t('auth.checkEmailForCode') || 'Verifique o seu email e introduza o código de recuperação'}
                </CardDescription>
                {tokenPreview && (
                  <div className="mt-4 p-3 bg-[#FFC300]/10 rounded-lg border border-[#FFC300]/30">
                    <p className="text-sm text-slate-400">Código enviado:</p>
                    <p className="text-2xl font-mono font-bold text-[#FFC300]">{tokenPreview}</p>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="token" className="text-white">
                      {t('auth.resetCode') || 'Código de Recuperação'}
                    </Label>
                    <Input
                      id="token"
                      type="text"
                      placeholder="XXXXXXXX"
                      value={token}
                      onChange={(e) => setToken(e.target.value.toUpperCase())}
                      className="bg-[#1A2035] border-white/10 text-white placeholder:text-slate-500 text-center text-xl font-mono tracking-widest"
                      required
                      data-testid="reset-token"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-white">
                      {t('auth.newPassword') || 'Nova Password'}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10 bg-[#1A2035] border-white/10 text-white placeholder:text-slate-500"
                        required
                        data-testid="new-password"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-white">
                      {t('auth.confirmPassword') || 'Confirmar Password'}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 bg-[#1A2035] border-white/10 text-white placeholder:text-slate-500"
                        required
                        data-testid="confirm-new-password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#FFC300] text-[#0F1420] hover:bg-[#FFC300]/90 font-semibold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('common.loading') || 'A processar...'}
                      </>
                    ) : (
                      t('auth.resetPassword') || 'Alterar Password'
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <button 
                    onClick={() => setStep('email')} 
                    className="text-slate-400 hover:text-white inline-flex items-center gap-2"
                  >
                    <ArrowLeft size={16} />
                    {t('auth.tryAgain') || 'Tentar novamente'}
                  </button>
                </div>
              </CardContent>
            </>
          )}

          {step === 'success' && (
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <CheckCircle size={64} className="text-[#22C55E]" />
                </div>
                <CardTitle className="text-xl text-white">
                  {t('auth.passwordChanged') || 'Password Alterada!'}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {t('auth.canNowLogin') || 'Pode agora fazer login com a nova password'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-[#FFC300] text-[#0F1420] hover:bg-[#FFC300]/90 font-semibold"
                >
                  {t('auth.goToLogin') || 'Ir para Login'}
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};
