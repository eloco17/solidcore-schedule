'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectOption } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { FC } from 'react';

const LOCATIONS = [
  { value: 'chelsea', label: 'NY, Chelsea' },
  { value: 'downtown-brooklyn', label: 'NY, Downtown Brooklyn' },
];

const CLASS_TYPES = [
  { value: 'power50', label: 'Power50' },
  { value: 'power30', label: 'Power30: Core + Upper Body' },
  { value: 'starter50', label: 'Starter50: Intro To [solidcore]' },
  { value: 'foundation50', label: 'Foundation50: Build Your Basics' },
];

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export default function SchedulePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [scheduleData, setScheduleData] = useState<any[] | null>(null);
  const [currentWeekIdx, setCurrentWeekIdx] = useState(0);
  const [selectedClasses, setSelectedClasses] = useState<any[]>([]);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch('/predicted_next_month_schedule.json')
      .then((res) => res.json())
      .then((data) => setScheduleData(data))
      .catch(() => setScheduleData([]));
  }, []);

  // Helper to group classes by week (Sunday to Saturday)
  function groupByWeek(data: any[]) {
    // Parse dates and sort
    const sorted = [...data].sort((a, b) => {
      const [am, ad] = a.date.split('/').map(Number);
      const [bm, bd] = b.date.split('/').map(Number);
      return am !== bm ? am - bm : ad - bd;
    });
    const weeks: any[][] = [];
    let week: any[] = [];
    let currentWeekStart: Date | null = null;
    for (const entry of sorted) {
      const [month, day] = entry.date.split('/').map(Number);
      const dateObj = new Date(new Date().getFullYear(), month - 1, day);
      entry.dateObj = dateObj;
      // Find the Sunday for this date
      const sunday = new Date(dateObj);
      sunday.setDate(dateObj.getDate() - dateObj.getDay());
      if (!currentWeekStart || sunday.getTime() !== currentWeekStart.getTime()) {
        if (week.length) weeks.push(week);
        week = [];
        currentWeekStart = sunday;
      }
      week.push(entry);
    }
    if (week.length) weeks.push(week);
    return weeks;
  }

  if (status === "loading" || !scheduleData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const weeks = groupByWeek(scheduleData);
  const week = weeks[currentWeekIdx] || [];

  // Ensure every class has a dateObj property (robust to malformed dates)
  for (const c of week) {
    if (!c.dateObj) {
      let d = null;
      if (c.date) {
        // Try YYYY-MM-DD first
        d = new Date(c.date);
        if (isNaN(d.getTime())) {
          // Try MM/DD (assume current year)
          const parts = c.date.split('/');
          if (parts.length === 2) {
            d = new Date(new Date().getFullYear(), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
          }
        }
      }
      c.dateObj = d;
    }
  }
  // Group classes by day of week (0=Sunday, 6=Saturday), skip invalid dates
  const classesByDay: { [key: number]: any[] } = {};
  for (let i = 0; i < 7; i++) classesByDay[i] = [];
  for (const c of week) {
    if (c.dateObj && !isNaN(c.dateObj.getTime())) {
      classesByDay[c.dateObj.getDay()].push(c);
    }
  }

  // Find the date range for the current week (Sunday to Saturday)
  let weekStart: Date | null = null;
  let weekEnd: Date | null = null;
  const validDates = week
    .map(c => c.dateObj)
    .filter(d => d && !isNaN(d.getTime()))
    .sort((a, b) => a - b);

  if (validDates.length > 0) {
    weekStart = new Date(validDates[0]);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
  }

  // Compute the dates for each day in the current week (Sunday to Saturday)
  let weekDatesArr: (Date | null)[] = [];
  if (weekStart) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      weekDatesArr.push(d);
    }
  } else {
    weekDatesArr = Array(7).fill(null);
  }

  function formatDate(d: Date | null) {
    return d ? `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}` : '--/--';
  }

  // Helper to check if a class is selected
  function isSelected(c: any) {
    return selectedClasses.some(sel => sel.date === c.date && sel.time === c.time && sel.name === c.name);
  }

  // Toggle class selection
  function toggleClass(c: any) {
    if (isSelected(c)) {
      setSelectedClasses(selectedClasses.filter(sel => !(sel.date === c.date && sel.time === c.time && sel.name === c.name)));
    } else {
      setSelectedClasses([...selectedClasses, c]);
    }
  }

  // Schedule booking handler
  async function handleScheduleBooking() {
    setBookingStatus(null);
    if (selectedClasses.length === 0) {
      setBookingStatus('Please select at least one class.');
      return;
    }
    const payload = selectedClasses.map(c => ({
      date: c.date,
      time: c.time,
      class_name: c.name,
      user_id: 'testuser', // Hardcoded for now
      member_type: 'member', // Or 'non-member', can be made dynamic
    }));
    try {
      const res = await fetch('/api/schedule-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classes: payload }),
      });
      if (res.ok) {
        setBookingStatus('Booking scheduled!');
        setSelectedClasses([]);
      } else {
        setBookingStatus('Failed to schedule booking.');
      }
    } catch (e) {
      setBookingStatus('Failed to schedule booking.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="w-full mx-auto space-y-10 px-2 md:px-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-6 text-center">Solidcore Schedule</h1>
        <Card className="mb-6 p-6 bg-blue-50 border-blue-200">
          <h2 className="text-xl font-semibold mb-2">Schedule Release Information</h2>
          <p className="text-gray-600">
            The schedule is released on the 24th of each month at 1am for members and on the 25th for non-members.
            This is the current month's schedule, updated automatically.
          </p>
        </Card>
        {/* Schedule Booking Button */}
        <div className="flex justify-center mb-4">
          <button
            className="px-6 py-2 rounded bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 disabled:opacity-50"
            onClick={handleScheduleBooking}
            disabled={selectedClasses.length === 0}
          >
            Schedule Booking
          </button>
        </div>
        {bookingStatus && (
          <div className="text-center mb-4 text-lg font-semibold text-blue-700">{bookingStatus}</div>
        )}
        {/* Week navigation */}
        <div className="flex items-center justify-center mb-4 gap-4">
          <button
            className={`px-3 py-1 rounded bg-gray-200 text-gray-700 font-bold text-xl ${currentWeekIdx === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`}
            onClick={() => setCurrentWeekIdx(i => Math.max(0, i - 1))}
            disabled={currentWeekIdx === 0}
            aria-label="Previous week"
          >
            &#8592;
          </button>
          <span className="font-semibold text-lg">
            Week {currentWeekIdx + 1} ({formatDate(weekStart)} - {formatDate(weekEnd)})
          </span>
          <button
            className={`px-3 py-1 rounded bg-gray-200 text-gray-700 font-bold text-xl ${currentWeekIdx === weeks.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`}
            onClick={() => setCurrentWeekIdx(i => Math.min(weeks.length - 1, i + 1))}
            disabled={currentWeekIdx === weeks.length - 1}
            aria-label="Next week"
          >
            &#8594;
          </button>
        </div>
        {/* Week grid */}
        <Card className="p-12">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-12">
            {DAYS_OF_WEEK.map((day, idx) => {
              const dateObj = weekDatesArr[idx];
              const dateStr = dateObj ? `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}` : '';
              return (
                <div key={day} className="bg-gray-50 rounded p-2 min-h-[120px] border flex flex-col">
                  <div className="text-center text-xs text-gray-500 mb-1">{dateStr}</div>
                  <div className="font-semibold text-center mb-1">{day}</div>
                  {classesByDay[idx].length === 0 ? (
                    <div className="text-gray-400 text-sm text-center flex-1">No classes</div>
                  ) : (
                    classesByDay[idx].map((c, j) => (
                      <div
                        key={j}
                        className={`mb-2 p-2 bg-white rounded shadow-sm border cursor-pointer transition-all ${isSelected(c) ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50' : ''}`}
                        onClick={() => toggleClass(c)}
                      >
                        <div className="font-medium">{c.name}</div>
                        <div className="text-sm">{c.time}</div>
                        <div className="text-xs text-gray-500">{c.teacher}</div>
                        <div className="text-xs text-blue-700">{c.status}</div>
                        {isSelected(c) && <div className="text-xs text-indigo-700 font-bold mt-1">Selected</div>}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
} 