import React from "react";

export function Select({ value, onChange, children, className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`border rounded px-2 py-1 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function SelectOption({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>;
} 