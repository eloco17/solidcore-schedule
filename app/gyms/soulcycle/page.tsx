'use client';

import { useRouter } from 'next/navigation';

export default function SolidcorePage() {
  const router = useRouter();

  // No auth check

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Solidcore</h1>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-gray-600">
            This page will be used for the AI agent to analyze and book Solidcore classes.
          </p>
        </div>
      </div>
    </div>
  );
} 