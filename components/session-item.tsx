"use client"

import type { Session } from "@/lib/types"

interface SessionItemProps {
  session: Session
  isScheduled: boolean
  onClick: () => void
}

export default function SessionItem({ session, isScheduled, onClick }: SessionItemProps) {
  return (
    <div
      className="border-b pb-2 last:border-b-0 last:pb-0 hover:bg-gray-50 cursor-pointer transition-colors p-2 rounded"
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium">{session.title}</p>
          <p className="text-sm">
            {session.startTime} - {session.endTime}
          </p>
          <p className="text-sm">{session.location}</p>
          {session.subtitle && <p className="text-xs text-gray-600 mt-1">{session.subtitle}</p>}
        </div>
        {isScheduled && <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Scheduled</div>}
      </div>
    </div>
  )
}

