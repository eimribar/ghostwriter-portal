import * as React from "react";

interface ModeToggleProps {
  value: string;
  onValueChange: (value: string) => void;
  options: {
    value: string;
    label: string;
    icon?: React.ReactNode;
  }[];
  className?: string;
}

export function ModeToggle({ value, onValueChange, options, className }: ModeToggleProps) {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-lg bg-zinc-100 p-1 text-zinc-600 ${className || ''}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onValueChange(option.value)}
          className={`
            inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium 
            ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 
            focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
            ${value === option.value
              ? "bg-white text-zinc-900 shadow-sm"
              : "hover:bg-white/50"
            }
          `}
        >
          {option.icon && <span className="mr-2">{option.icon}</span>}
          {option.label}
        </button>
      ))}
    </div>
  );
}