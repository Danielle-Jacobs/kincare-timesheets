"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDaysInMonth, getDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Camera } from "lucide-react";
import { toast } from "sonner";

interface TimesheetEntry {
  day: number;
  clockIn: string | null;
  clockOut: string | null;
  carerSignature: string | null;
  clientSignature: string | null;
}

interface TimesheetPhoto {
  id: string;
  filename: string;
  path: string;
  createdAt: string;
}

interface Timesheet {
  id: string;
  month: number;
  year: number;
  status: string;
  reviewComment: string | null;
  carer: { name: string; idNumber: string | null; contactNumber: string | null };
  client: { name: string };
  entries: TimesheetEntry[];
  photos: TimesheetPhoto[];
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function AdminTimesheetReview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  const { data: timesheet, isLoading } = useQuery<Timesheet>({
    queryKey: ["timesheet", id],
    queryFn: () => fetch(`/api/timesheets/${id}`).then((r) => r.json()),
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/timesheets/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheet", id] });
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      toast.success("Timesheet approved");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/timesheets/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheet", id] });
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      toast.success("Timesheet rejected");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-3xl">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!timesheet) return <div>Timesheet not found</div>;

  const daysInMonth = getDaysInMonth(
    new Date(timesheet.year, timesheet.month - 1)
  );

  function calculateHours(clockIn: string | null, clockOut: string | null) {
    if (!clockIn || !clockOut) return null;
    const [inH, inM] = clockIn.split(":").map(Number);
    const [outH, outM] = clockOut.split(":").map(Number);
    const diff = outH * 60 + outM - (inH * 60 + inM);
    if (diff <= 0) return null;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ""}`;
  }

  const totalMinutes = timesheet.entries.reduce((acc, e) => {
    if (!e.clockIn || !e.clockOut) return acc;
    const [inH, inM] = e.clockIn.split(":").map(Number);
    const [outH, outM] = e.clockOut.split(":").map(Number);
    const diff = outH * 60 + outM - (inH * 60 + inM);
    return acc + (diff > 0 ? diff : 0);
  }, 0);

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">
              {monthNames[timesheet.month - 1]} {timesheet.year}
            </h1>
            <Badge className={statusColors[timesheet.status]}>
              {timesheet.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">Carer: </span>
              {timesheet.carer.name}
            </div>
            <div>
              <span className="font-medium">Client: </span>
              {timesheet.client.name}
            </div>
          </div>
          <div className="text-sm font-medium pt-2 border-t">
            Total: {Math.floor(totalMinutes / 60)}h{" "}
            {totalMinutes % 60 > 0 ? `${totalMinutes % 60}m` : ""} |{" "}
            {timesheet.entries.filter((e) => e.clockIn && e.clockOut).length}{" "}
            days worked
          </div>
          {timesheet.reviewComment && (
            <div className="text-sm bg-muted p-2 rounded mt-2">
              <span className="font-medium">Review note: </span>
              {timesheet.reviewComment}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entries table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 w-12">Day</th>
                  <th className="text-left p-2">In</th>
                  <th className="text-left p-2">Out</th>
                  <th className="text-left p-2">Hours</th>
                  <th className="text-center p-2">Carer Sig</th>
                  <th className="text-center p-2">Client Sig</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                  (day) => {
                    const entry = timesheet.entries.find(
                      (e) => e.day === day
                    );
                    if (!entry?.clockIn && !entry?.clockOut) return null;
                    const dow =
                      dayNames[
                        getDay(
                          new Date(timesheet.year, timesheet.month - 1, day)
                        )
                      ];
                    return (
                      <tr key={day} className="border-t">
                        <td className="p-2 font-medium">
                          {day}{" "}
                          <span className="text-muted-foreground text-xs">
                            {dow}
                          </span>
                        </td>
                        <td className="p-2">{entry?.clockIn || "—"}</td>
                        <td className="p-2">{entry?.clockOut || "—"}</td>
                        <td className="p-2">
                          {calculateHours(
                            entry?.clockIn ?? null,
                            entry?.clockOut ?? null
                          ) || "—"}
                        </td>
                        <td className="p-2 text-center">
                          {entry?.carerSignature ? (
                            <img
                              src={entry.carerSignature}
                              alt="Carer signature"
                              className="h-8 inline-block"
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {entry?.clientSignature ? (
                            <img
                              src={entry.clientSignature}
                              alt="Client signature"
                              className="h-8 inline-block"
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Photos */}
      {timesheet.photos.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">
                Paper Timesheet Photos
              </h2>
              <Badge variant="secondary" className="text-xs">
                {timesheet.photos.length}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {timesheet.photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setExpandedPhoto(photo.path)}
                  className="cursor-pointer"
                >
                  <img
                    src={`/api/uploads/${photo.path}`}
                    alt={photo.filename}
                    className="w-full aspect-square object-cover rounded-lg border hover:ring-2 hover:ring-primary transition-all"
                  />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full-size photo overlay */}
      {expandedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedPhoto(null)}
        >
          <img
            src={`/api/uploads/${expandedPhoto}`}
            alt="Paper timesheet"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}

      {/* Approve/Reject */}
      {timesheet.status === "SUBMITTED" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {showRejectForm && (
              <Textarea
                placeholder="Reason for rejection (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[80px]"
              />
            )}
            <div className="flex gap-3">
              <Button
                className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                onClick={() => approveMutation.mutate()}
                disabled={
                  approveMutation.isPending || rejectMutation.isPending
                }
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              {showRejectForm ? (
                <Button
                  variant="destructive"
                  className="flex-1 h-12"
                  onClick={() => rejectMutation.mutate()}
                  disabled={
                    approveMutation.isPending || rejectMutation.isPending
                  }
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Confirm Reject
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1 h-12 text-destructive border-destructive/20 hover:bg-destructive/10"
                  onClick={() => setShowRejectForm(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
