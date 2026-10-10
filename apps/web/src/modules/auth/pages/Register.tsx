import React, { useState, useEffect } from 'react';
import { api } from '../../core/api.js';
import { Button } from '@/design-system/Button.js';
import { Input } from '@/design-system/Input.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/design-system/Card.js';
import { Logo } from '@/design-system/Logo.js';
import { Link, useNavigate } from 'react-router-dom';

export function Register() {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', usn: '', department: 'CSE', year: 1, phone: '', role: 'STUDENT',
  });
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.call('meta.public', {}).then(setMeta).catch(console.error);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.call('auth.register', { body: { ...formData, role: formData.role as any } });
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.call('auth.verifyOtp', { body: { email: formData.email, code: otp, purpose: 'VERIFY_EMAIL' } });
      if (res.user.role === 'ADMIN') navigate('/admin');
      else navigate('/');
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="flex justify-center"><Logo /></div>
          <Card>
            <CardHeader>
              <CardTitle>Verify your email</CardTitle>
              <CardDescription>We sent a 6-digit code to {formData.email}</CardDescription>
            </CardHeader>
            <form onSubmit={handleVerify}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border-l-4 border-accent text-accent text-sm font-bold rounded-r-md">
                    {error}
                  </div>
                )}
                <Input
                  label="Verification Code"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center tracking-widest text-2xl font-bold"
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" isLoading={loading}>
                  Verify & Continue
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="flex justify-center"><Logo /></div>
        
        <Card>
          <CardHeader>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>Join ClubSync to register for events</CardDescription>
          </CardHeader>
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border-l-4 border-accent text-accent text-sm font-bold rounded-r-md">
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <Input label="Name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                <Input label="USN" required value={formData.usn} onChange={e => setFormData({ ...formData, usn: e.target.value })} placeholder={meta?.usnHint} />
              </div>

              <Input label="Email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-ink">Department</label>
                  <select 
                    className="flex h-12 w-full rounded-md border-2 border-outline bg-surface px-4 text-base text-ink focus-visible:outline-none focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink font-bold"
                    value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}
                  >
                    {meta?.departments?.map((d: string) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-ink">Year</label>
                  <select 
                    className="flex h-12 w-full rounded-md border-2 border-outline bg-surface px-4 text-base text-ink focus-visible:outline-none focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink font-bold"
                    value={formData.year} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  >
                    {meta?.years?.map((y: number) => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
              </div>

              <Input label="Phone" type="tel" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+91..." />
              <Input label="Password" type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" isLoading={loading}>
                Continue
              </Button>
              <p className="text-sm font-medium text-muted">
                Already have an account?{' '}
                <Link to="/login" className="text-ink hover:text-accent underline underline-offset-4 font-bold transition-colors">
                  Sign In
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
