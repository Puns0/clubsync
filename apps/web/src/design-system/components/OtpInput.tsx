// ─── OTP Input Component ───
// 6-box OTP input with paste support and auto-advance.

import * as React from "react";
import { cn } from "../../lib/format";

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error = false,
  disabled = false,
}: OtpInputProps) {
  const [activeInput, setActiveInput] = React.useState(0);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handleFocus = (index: number) => {
    // If previous inputs are empty, focus the first empty one
    const firstEmptyIndex = value.length < length ? value.length : length - 1;
    if (index > firstEmptyIndex) {
      inputRefs.current[firstEmptyIndex]?.focus();
      setActiveInput(firstEmptyIndex);
    } else {
      setActiveInput(index);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) return;

    // Handle single character
    const char = val[val.length - 1];
    const newValue =
      value.substring(0, index) + char + value.substring(index + 1);
    
    onChange(newValue.slice(0, length));

    // Auto-advance
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setActiveInput(index + 1);
    } else if (newValue.length === length) {
      onComplete?.(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[index]) {
        // Delete current
        const newValue = value.substring(0, index) + value.substring(index + 1);
        onChange(newValue);
      } else if (index > 0) {
        // Move back and delete
        const newValue = value.substring(0, index - 1) + value.substring(index);
        onChange(newValue);
        inputRefs.current[index - 1]?.focus();
        setActiveInput(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      setActiveInput(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      setActiveInput(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").replace(/\D/g, "");
    if (pastedData) {
      const newValue = (value.substring(0, activeInput) + pastedData).slice(0, length);
      onChange(newValue);
      
      const nextIndex = Math.min(activeInput + pastedData.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      setActiveInput(nextIndex);
      
      if (newValue.length === length) {
        onComplete?.(newValue);
      }
    }
  };

  return (
    <div className="flex gap-2 justify-between">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={2} // Allow 2 to catch rapid typing before state updates
          value={value[i] || ""}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onFocus={() => handleFocus(i)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            "h-12 w-10 sm:h-14 sm:w-12 rounded-ticket border-2 bg-paper text-center text-lg font-display font-semibold text-ink transition-colors focus:outline-none focus:ring-2",
            error
              ? "border-vermilion focus:ring-vermilion"
              : "border-ink focus:ring-vermilion",
            value[i] && !error && "border-ink",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      ))}
    </div>
  );
}
