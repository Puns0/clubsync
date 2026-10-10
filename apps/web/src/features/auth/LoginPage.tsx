import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../../design-system/components/Button";
import { Input } from "../../design-system/components/Input";
import { useAuth } from "../../api/hooks/useAuth";
import { loginSchema } from "./authSchemas";

export function LoginPage() {
  const [email, setEmail] = useState("puneet.g@sjbit.edu.in");
  const [password, setPassword] = useState("password");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  
  const { login, isLoggingIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError("");

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        if (issue.path[0]) {
           fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await login(result.data);
      navigate("/");
    } catch (err: any) {
      setServerError(err?.error?.message || "Invalid credentials");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md rounded-3xl border-2 border-ink bg-paper-deep p-8 shadow-stamp">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-display font-bold text-ink">Welcome back</h1>
          <p className="mt-2 text-sm text-ink-soft">Sign in to your ClubSync account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {serverError && (
            <div className="rounded-lg bg-vermilion/10 p-3 text-sm font-semibold text-vermilion text-center border-2 border-vermilion/20">
              {serverError}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink">College Email</label>
            <Input 
              type="email" 
              placeholder="usn.name@sjbit.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!errors.email}
            />
            {errors.email && <p className="text-xs font-semibold text-vermilion">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-ink">Password</label>
              <Link to="/forgot-password" className="text-xs font-semibold text-vermilion hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!errors.password}
            />
            {errors.password && <p className="text-xs font-semibold text-vermilion">{errors.password}</p>}
          </div>

          <Button type="submit" className="w-full h-12" isLoading={isLoggingIn}>
            Sign in
          </Button>
        </form>

        <div className="mt-8 text-center text-sm font-medium text-ink-soft">
          Don't have an account?{" "}
          <Link to="/signup" className="font-bold text-vermilion hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
