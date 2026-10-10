import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../design-system/components/Button";
import { OtpInput } from "../../design-system/components/OtpInput";
import { ArrowLeft } from "lucide-react";
import { IconButton } from "../../design-system/components/IconButton";

export function OtpPage() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length < 6) {
       setError("Please enter all 6 digits");
       return;
    }
    
    setIsLoading(true);
    setError("");

    // Mock API call
    setTimeout(() => {
       setIsLoading(false);
       if (otp === "123456") {
          navigate("/login");
       } else {
          setError("Invalid verification code");
       }
    }, 800);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md rounded-3xl border-2 border-ink bg-paper-deep p-6 sm:p-8 shadow-stamp relative">
        <IconButton 
           variant="ghost" 
           className="absolute left-4 top-4" 
           onClick={() => navigate(-1)}
        >
           <ArrowLeft className="h-5 w-5" />
        </IconButton>

        <div className="mt-4 mb-8 text-center">
          <h1 className="text-2xl font-display font-bold text-ink">Verify Email</h1>
          <p className="mt-2 text-sm text-ink-soft">
            We sent a 6-digit code to your college email. <br/>
            (Hint: try 123456)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 flex flex-col items-center">
          <div className="w-full">
            <OtpInput 
               value={otp} 
               onChange={(val) => { setOtp(val); setError(""); }} 
               onComplete={() => handleSubmit()}
               error={!!error}
               disabled={isLoading}
            />
            {error && <p className="text-xs font-semibold text-vermilion mt-3 text-center">{error}</p>}
          </div>

          <Button type="submit" className="w-full h-12" isLoading={isLoading}>
            Verify & Continue
          </Button>
        </form>

        <div className="mt-8 text-center text-sm font-medium text-ink-soft">
          Didn't receive the code?{" "}
          <button className="font-bold text-vermilion hover:underline">
            Resend
          </button>
        </div>
      </div>
    </div>
  );
}
