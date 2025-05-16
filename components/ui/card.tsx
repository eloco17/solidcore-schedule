import React from "react";

export function Card({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`rounded-lg border bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`p-6 border-b ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <h2 className={`text-xl font-semibold ${className}`}>{children}</h2>;
}

export function CardDescription({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <p className={`text-gray-500 text-sm mt-1 ${className}`}>{children}</p>;
}

export function CardContent({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`p-6 space-y-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`flex justify-between items-center px-6 pb-6 ${className}`}>{children}</div>;
} 