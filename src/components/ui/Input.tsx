"use client";

import * as React from "react";
import { cn } from "@/utils/cn";
import { Eye, EyeOff } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // If true, enables the toggle for password visibility
  isPassword?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, isPassword, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    
    // Determine the actual type based on the toggle state
    const actualType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="relative w-full">
        <input
          type={actualType}
          className={cn(
            "flex h-10 w-full rounded-md border border-default bg-background px-3 py-2 text-sm transition-colors",
            "file:border-none file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-0",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          style={{ paddingRight: isPassword ? '40px' : undefined }}
          ref={ref}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute text-muted hover:text-text transition-colors outline-none"
            style={{ right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none' }}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
