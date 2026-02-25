"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ShoppingBag, UserCheck, MapPin } from "lucide-react";

function formatDate(dateString) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatCurrency(amount) {
  if (!amount) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(amount);
}

export function UserHistoryTimeline({ userId, enrollments = [], bookings = [] }) {
  // Combine enrollments and bookings into a single timeline
  const timelineItems = [
    ...enrollments.map(e => ({
      type: 'enrollment',
      date: e.created_at || e.enrolled_at,
      data: e
    })),
    ...bookings.map(b => ({
      type: 'booking',
      date: b.created_at,
      data: b
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (timelineItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No activity history yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Activity History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {timelineItems.map((item, index) => (
          <div key={index} className="relative pl-8 pb-4 border-l-2 border-muted last:border-l-0 last:pb-0">
            {/* Timeline dot */}
            <div className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-primary" />
            
            {item.type === 'enrollment' ? (
              <EnrollmentCard enrollment={item.data} />
            ) : (
              <BookingCard booking={item.data} />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EnrollmentCard({ enrollment }) {
  const partnerName = enrollment.partner?.name || "Unknown Partner";
  const partnerRole = enrollment.partner?.role || enrollment.partner?.type || "Partner";
  const planName = enrollment.plan?.name || enrollment.batch_plans?.duration || "N/A";
  
  const statusVariant = enrollment.status === 'active' ? 'default' : 
                       enrollment.status === 'cancelled' ? 'destructive' : 
                       'secondary';
  
  const paymentVariant = enrollment.payment_status === 'paid' ? 'default' :
                        enrollment.payment_status === 'complimentary' ? 'secondary' :
                        'outline';

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-green-600" />
          <p className="font-medium text-foreground">Enrolled in {partnerName}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={statusVariant} className="text-xs">
            {enrollment.status || 'active'}
          </Badge>
          {enrollment.enrolled_by === 'admin' && (
            <Badge variant="outline" className="text-xs">
              Admin
            </Badge>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Type</p>
          <p className="font-medium capitalize">{partnerRole}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Plan</p>
          <p className="font-medium">{planName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Payment</p>
          <Badge variant={paymentVariant} className="text-xs capitalize">
            {enrollment.payment_status || 'unpaid'}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Date</p>
          <p className="text-xs">{formatDate(enrollment.created_at || enrollment.enrolled_at)}</p>
        </div>
      </div>
      
      {enrollment.admin_notes && (
        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
          <p className="text-muted-foreground">Admin Note:</p>
          <p>{enrollment.admin_notes}</p>
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking }) {
  const partnerName = booking.partner?.name || "Unknown Turf";
  const courtName = booking.court?.name || booking.turf_courts?.name || "Court";
  const sport = booking.court?.sport || booking.turf_courts?.sport || "Sport";
  
  const statusVariant = booking.declined ? 'destructive' : 'default';

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-600" />
          <p className="font-medium text-foreground">Turf Booking - {partnerName}</p>
        </div>
        <Badge variant={statusVariant} className="text-xs">
          {booking.declined ? 'Declined' : 'Booked'}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Court</p>
          <p className="font-medium">{courtName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Sport</p>
          <p className="font-medium capitalize">{sport}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Date</p>
          <p className="text-xs">{formatDate(booking.date)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Time</p>
          <p className="text-xs">{booking.start_time} - {booking.end_time}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Amount</p>
          <p className="font-medium">{formatCurrency(booking.total_amount)}</p>
        </div>
        {booking.payment_id && (
          <div>
            <p className="text-xs text-muted-foreground">Payment ID</p>
            <p className="text-xs font-mono">{booking.payment_id.slice(0, 12)}...</p>
          </div>
        )}
      </div>
      
      {booking.declined && booking.decline_reason && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
          <p className="text-red-900 font-medium">Decline Reason:</p>
          <p className="text-red-800">{booking.decline_reason}</p>
        </div>
      )}
    </div>
  );
}
