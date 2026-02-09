import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { WireMeshBg, GlowOrb } from '@/components/MarketingEffects';

const Signup = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(email, password);
      navigate('/complete-profile');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden" style={{ background: 'linear-gradient(170deg, #0a0f1a, #0d1b2a, #1b2838)' }}>
      <WireMeshBg />
      <GlowOrb className="w-96 h-96 -top-40 -right-40" color="#34d399" />
      <GlowOrb className="w-64 h-64 bottom-20 -left-40" color="#f59e0b" />

      <div className="w-full max-w-md flex flex-col items-center relative z-10">
        <Link to="/" className="mb-8 flex items-center gap-2.5 no-underline">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}>
            <span className="text-white font-black text-lg">4</span>
          </div>
          <span className="text-2xl font-serif text-warm tracking-tight">Find4th</span>
        </Link>

        <div
          className="w-full rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
          }}
          data-testid="signup-card"
        >
          <div className="text-center mb-6">
            <h1 className="text-2xl font-serif text-warm tracking-tight">Create Account</h1>
            <p className="text-sm text-warm-muted mt-1">Join the platform tennis community</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-frost text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="email-input"
                className="bg-white/5 border-white/6 text-warm placeholder:text-warm-muted/50 focus:border-emerald-400/40 focus:ring-emerald-400/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-frost text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 bg-white/5 border-white/6 text-warm placeholder:text-warm-muted/50 focus:border-emerald-400/40 focus:ring-emerald-400/20"
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-muted hover:text-warm"
                  data-testid="toggle-password-visibility"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-frost text-sm">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pr-10 bg-white/5 border-white/6 text-warm placeholder:text-warm-muted/50 focus:border-emerald-400/40 focus:ring-emerald-400/20"
                  data-testid="confirm-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-muted hover:text-warm"
                  data-testid="toggle-confirm-password-visibility"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full rounded-full text-night font-semibold hover:scale-105 transition-all"
              style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}
              disabled={loading}
              data-testid="signup-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <p className="text-sm text-warm-muted text-center">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-400 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
