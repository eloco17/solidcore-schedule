"use client";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Welcome to Solidcore Schedule
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 rounded-lg border bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Schedule Release Information</h2>
            <p className="text-gray-600 mb-4">
              The schedule is released on the 24th of each month at 1am for members and on the 25th for non-members.
              Your selected classes will be automatically booked when the schedule becomes available.
            </p>
            <Button onClick={() => window.location.href = '/schedule'}>
              View Schedule
              </Button>
          </div>
          <div className="p-6 rounded-lg border bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Available Locations</h2>
            <ul className="space-y-2 text-gray-600">
              <li>• NY, Chelsea</li>
              <li>• NY, Downtown Brooklyn</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}