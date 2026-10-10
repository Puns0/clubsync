import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../../design-system/components/Button";
import { Input } from "../../design-system/components/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../design-system/primitives/Select";
import { signupSchema, type SignupFormData } from "./authSchemas";

export function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Partial<SignupFormData>>({
     department: "",
     year: undefined
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: keyof SignupFormData, value: any) => {
     setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = signupSchema.safeParse(formData);
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
       navigate("/signup/verify");
    }, 800);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md rounded-3xl border-2 border-ink bg-paper-deep p-6 sm:p-8 shadow-stamp">
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">Create Account</h1>
          <p className="mt-2 text-sm text-ink-soft">Join ClubSync with your college ID</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink">Full Name</label>
            <Input 
              placeholder="e.g. Puneet Gangur"
              value={formData.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
              error={!!errors.name}
            />
            {errors.name && <p className="text-xs font-semibold text-vermilion">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink">College Email</label>
            <Input 
              type="email" 
              placeholder="usn.name@sjbit.edu.in"
              value={formData.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              error={!!errors.email}
            />
            {errors.email && <p className="text-xs font-semibold text-vermilion">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink">USN</label>
              <Input 
                placeholder="1SJ..."
                value={formData.usn || ""}
                onChange={(e) => handleChange("usn", e.target.value)}
                error={!!errors.usn}
              />
              {errors.usn && <p className="text-xs font-semibold text-vermilion">{errors.usn}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink">Phone</label>
              <Input 
                placeholder="10 digits"
                maxLength={10}
                value={formData.phone || ""}
                onChange={(e) => handleChange("phone", e.target.value)}
                error={!!errors.phone}
              />
              {errors.phone && <p className="text-xs font-semibold text-vermilion">{errors.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2 flex flex-col">
                <label className="text-sm font-semibold text-ink">Department</label>
                <Select value={formData.department} onValueChange={(v) => handleChange("department", v)}>
                   <SelectTrigger className={errors.department ? "border-vermilion" : ""}>
                      <SelectValue placeholder="Select" />
                   </SelectTrigger>
                   <SelectContent>
                      <SelectItem value="CSE">CSE</SelectItem>
                      <SelectItem value="ISE">ISE</SelectItem>
                      <SelectItem value="ECE">ECE</SelectItem>
                      <SelectItem value="EEE">EEE</SelectItem>
                      <SelectItem value="ME">ME</SelectItem>
                      <SelectItem value="CE">CE</SelectItem>
                   </SelectContent>
                </Select>
                {errors.department && <p className="text-xs font-semibold text-vermilion">{errors.department}</p>}
             </div>

             <div className="space-y-2 flex flex-col">
                <label className="text-sm font-semibold text-ink">Year</label>
                <Select value={formData.year?.toString() || ""} onValueChange={(v) => handleChange("year", parseInt(v))}>
                   <SelectTrigger className={errors.year ? "border-vermilion" : ""}>
                      <SelectValue placeholder="Select" />
                   </SelectTrigger>
                   <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                   </SelectContent>
                </Select>
                {errors.year && <p className="text-xs font-semibold text-vermilion">{errors.year}</p>}
             </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-sm font-semibold text-ink">Password</label>
            <Input 
              type="password" 
              placeholder="••••••••"
              value={formData.password || ""}
              onChange={(e) => handleChange("password", e.target.value)}
              error={!!errors.password}
            />
            {errors.password && <p className="text-xs font-semibold text-vermilion">{errors.password}</p>}
          </div>

          <Button type="submit" className="w-full h-12 mt-4" isLoading={isLoading}>
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center text-sm font-medium text-ink-soft">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-vermilion hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
