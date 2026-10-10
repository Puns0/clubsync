import React, { useState } from 'react';
import { api } from '../../core/api.js';
import { Button } from '@/design-system/Button.js';
import { Input } from '@/design-system/Input.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/design-system/Card.js';
import { Logo } from '@/design-system/Logo.js';
import { Link, useNavigate } from 'react-router-dom';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.call('auth.login', { body: { email, password } });
      // On success, redirect to dashboard
      if (res.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        // In a real app we might redirect to an OTP verification page here
        setError('Please verify your email first.');
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="flex justify-center">
          <Logo />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border-l-4 border-accent text-accent text-sm font-bold rounded-r-md">
                  {error}
                </div>
              )}
              <Input
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@sjbit.edu.in"
              />
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" isLoading={loading}>
                Sign In
              </Button>
              <p className="text-sm font-medium text-muted">
                Don't have an account?{' '}
                <Link to="/register" className="text-ink hover:text-accent underline underline-offset-4 font-bold transition-colors">
                  Create one
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
