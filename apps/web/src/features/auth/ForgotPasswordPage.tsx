import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../design-system/components/Button";
import { Input } from "../../design-system/components/Input";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { IconButton } from "../../design-system/components/IconButton";
import { forgotPasswordSchema } from "./authSchemas";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    // Mock API call
    setTimeout(() => {
       setIsLoading(false);
       setIsSent(true);
    }, 800);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md rounded-3xl border-2 border-ink bg-paper-deep p-6 sm:p-8 shadow-stamp relative">
        <Link to="/login">
          <IconButton variant="ghost" className="absolute left-4 top-4" aria-label="Back to login">
             <ArrowLeft className="h-5 w-5" />
          </IconButton>
        </Link>

        {isSent ? (
          <div className="mt-8 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-vermilion/10 text-vermilion mb-4">
               <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-display font-bold text-ink">Check your email</h1>
            <p className="mt-2 text-sm text-ink-soft mb-8">
              We've sent a password reset link to <br/><span className="font-semibold text-ink">{email}</span>
            </p>
            <Link to="/login" className="w-full">
               <Button className="w-full">Return to login</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-4 mb-8 text-center">
              <h1 className="text-2xl font-display font-bold text-ink">Forgot Password?</h1>
              <p className="mt-2 text-sm text-ink-soft">
                Enter your college email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-ink">College Email</label>
                <Input 
                  type="email" 
                  placeholder="usn.name@sjbit.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={!!error}
                />
                {error && <p className="text-xs font-semibold text-vermilion">{error}</p>}
              </div>

              <Button type="submit" className="w-full h-12" isLoading={isLoading}>
                Send Reset Link
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
