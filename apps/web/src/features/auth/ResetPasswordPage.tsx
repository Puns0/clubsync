import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../design-system/components/Button";
import { Input } from "../../design-system/components/Input";
import { resetPasswordSchema } from "./authSchemas";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
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

    setIsLoading(true);
    // Mock API call
    setTimeout(() => {
       setIsLoading(false);
       // Normally we'd show a success toast here
       navigate("/login");
    }, 800);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md rounded-3xl border-2 border-ink bg-paper-deep p-6 sm:p-8 shadow-stamp">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-display font-bold text-ink">Reset Password</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Please enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink">New Password</label>
            <Input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!errors.password}
            />
            {errors.password && <p className="text-xs font-semibold text-vermilion">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink">Confirm New Password</label>
            <Input 
              type="password" 
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={!!errors.confirmPassword}
            />
            {errors.confirmPassword && <p className="text-xs font-semibold text-vermilion">{errors.confirmPassword}</p>}
          </div>

          <Button type="submit" className="w-full h-12" isLoading={isLoading}>
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
