"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  XCircle,
  Camera,
  ImageOff,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
  const [expandedPhoto, setExpandedPhoto] = useState<number | null>(null);

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
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!timesheet) return <div>Timesheet not found</div>;

  const hasPhotos = timesheet.photos.length > 0;

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/timesheets">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">
            {timesheet.carer.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {timesheet.client.name} &middot;{" "}
            {monthNames[timesheet.month - 1]} {timesheet.year}
          </p>
        </div>
        <Badge className={statusColors[timesheet.status]}>
          {timesheet.status}
        </Badge>
      </div>

      {/* Review comment */}
      {timesheet.reviewComment && (
        <div className="text-sm bg-muted p-3 rounded-lg">
          <span className="font-medium">Review note: </span>
          {timesheet.reviewComment}
        </div>
      )}

      {/* Photos — Primary content */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">
              Uploaded Timesheet Photos
            </h2>
            {hasPhotos && (
              <Badge variant="secondary" className="text-xs">
                {timesheet.photos.length}
              </Badge>
            )}
          </div>

          {hasPhotos ? (
            <div className="grid grid-cols-2 gap-3">
              {timesheet.photos.map((photo, idx) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setExpandedPhoto(idx)}
                  className="cursor-pointer group"
                >
                  <div className="aspect-[3/4] rounded-lg border bg-muted overflow-hidden">
                    <img
                      src={`/api/uploads/${photo.path}`}
                      alt={photo.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageOff className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No photos uploaded yet</p>
              <p className="text-xs mt-1">
                The carer hasn&apos;t uploaded any timesheet photos
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full-size photo viewer with navigation */}
      {expandedPhoto !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setExpandedPhoto(null)}
        >
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img
              src={`/api/uploads/${timesheet.photos[expandedPhoto].path}`}
              alt="Paper timesheet"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Nav arrows */}
            {timesheet.photos.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedPhoto(
                      (expandedPhoto - 1 + timesheet.photos.length) %
                        timesheet.photos.length
                    );
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedPhoto(
                      (expandedPhoto + 1) % timesheet.photos.length
                    );
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
              {expandedPhoto + 1} / {timesheet.photos.length}
            </div>

            {/* Close */}
            <button
              type="button"
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
              onClick={() => setExpandedPhoto(null)}
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* Carer details */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Carer</span>
              <p className="font-medium">{timesheet.carer.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Client</span>
              <p className="font-medium">{timesheet.client.name}</p>
            </div>
            {timesheet.carer.idNumber && (
              <div>
                <span className="text-muted-foreground">ID Number</span>
                <p className="font-medium">{timesheet.carer.idNumber}</p>
              </div>
            )}
            {timesheet.carer.contactNumber && (
              <div>
                <span className="text-muted-foreground">Contact</span>
                <p className="font-medium">{timesheet.carer.contactNumber}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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

      {/* Status for already reviewed */}
      {(timesheet.status === "APPROVED" || timesheet.status === "REJECTED") && (
        <Card>
          <CardContent className="p-4 text-center">
            <Badge className={`${statusColors[timesheet.status]} text-sm px-3 py-1`}>
              {timesheet.status === "APPROVED"
                ? "This timesheet has been approved"
                : "This timesheet was rejected"}
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
