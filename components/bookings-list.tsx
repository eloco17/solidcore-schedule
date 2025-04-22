// components/bookings-list.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin } from 'lucide-react';

interface Booking {
  id: string;
  sessionId: string;
  title: string;
  date: string;
  time: string;
  location: string;
  status: string;
  reference: string;
  bookedAt: Date;
}

interface BookingsListProps {
  bookings: Booking[];
}

export default function BookingsList({ bookings }: BookingsListProps) {
  if (bookings.length === 0) {
    return (
      <Card className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">No Bookings Found</h2>
        <p className="text-gray-500">
          You haven't booked any pickleball sessions yet.
        </p>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {bookings.map((booking) => (
        <Card key={booking.id}>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>{booking.title}</CardTitle>
              <p className="text-sm text-gray-500">
                Booked on {new Date(booking.bookedAt).toLocaleDateString()}
              </p>
            </div>
            <Badge
              className={
                booking.status === "booked"
                  ? "bg-green-500"
                  : booking.status === "waitlisted"
                    ? "bg-yellow-500"
                    : "bg-blue-500"
              }
            >
              {booking.status === "booked"
                ? "Booked"
                : booking.status === "waitlisted"
                  ? "Waitlisted"
                  : booking.status}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                <span>{booking.date}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                <span>{booking.time}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                <span>{booking.location}</span>
              </div>
              {booking.reference && (
                <div className="text-sm text-gray-500">
                  Reference: {booking.reference}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


