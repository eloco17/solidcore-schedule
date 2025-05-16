import React from "react";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="border rounded px-2 py-1" {...props} />;
} 