"use client";

import { use, useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDaysInMonth, getDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Pen, Send, Camera, Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { SignatureModal } from "@/components/timesheet/signature-modal";

interface TimesheetEntry {
  id?: string;
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

export default function TimesheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [signatureModal, setSignatureModal] = useState<{
    day: number;
    type: "carer" | "client";
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: timesheet, isLoading } = useQuery<Timesheet>({
    queryKey: ["timesheet", id],
    queryFn: () => fetch(`/api/timesheets/${id}`).then((r) => r.json()),
  });

  const saveMutation = useMutation({
    mutationFn: async (entry: Partial<TimesheetEntry> & { day: number }) => {
      const res = await fetch("/api/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timesheetId: id, entries: [entry] }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheet", id] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/timesheets/${id}/submit`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheet", id] });
      toast.success("Timesheet submitted for review");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleTimeChange = useCallback(
    (day: number, field: "clockIn" | "clockOut", value: string) => {
      saveMutation.mutate({ day, [field]: value || null });
    },
    [saveMutation]
  );

  const handleSignatureSave = useCallback(
    (dataUrl: string) => {
      if (!signatureModal) return;
      const field =
        signatureModal.type === "carer" ? "carerSignature" : "clientSignature";
      saveMutation.mutate({
        day: signatureModal.day,
        [field]: dataUrl,
      });
      setSignatureModal(null);
    },
    [signatureModal, saveMutation]
  );

  const handlePhotoUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append("photo", file);
          const res = await fetch(`/api/timesheets/${id}/photos`, {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Upload failed");
          }
        }
        queryClient.invalidateQueries({ queryKey: ["timesheet", id] });
        toast.success(
          files.length === 1
            ? "Photo uploaded"
            : `${files.length} photos uploaded`
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [id, queryClient]
  );

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const res = await fetch(
        `/api/timesheets/${id}/photos?photoId=${photoId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheet", id] });
      toast.success("Photo removed");
    },
    onError: () => {
      toast.error("Failed to remove photo");
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        <Skeleton className="h-24 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!timesheet) return <div className="p-4">Timesheet not found</div>;

  const daysInMonth = getDaysInMonth(
    new Date(timesheet.year, timesheet.month - 1)
  );
  const isLocked = timesheet.status !== "DRAFT" && timesheet.status !== "REJECTED";

  const getEntry = (day: number) =>
    timesheet.entries.find((e) => e.day === day);

  const getDayOfWeek = (day: number) => {
    const date = new Date(timesheet.year, timesheet.month - 1, day);
    return dayNames[getDay(date)];
  };

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

  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">
              {monthNames[timesheet.month - 1]} {timesheet.year}
            </h1>
            <Badge className={statusColors[timesheet.status]}>
              {timesheet.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Carer: </span>
              {timesheet.carer.name}
            </div>
            <div>
              <span className="font-medium text-foreground">Client: </span>
              {timesheet.client.name}
            </div>
            {timesheet.carer.idNumber && (
              <div>
                <span className="font-medium text-foreground">ID: </span>
                {timesheet.carer.idNumber}
              </div>
            )}
            {timesheet.carer.contactNumber && (
              <div>
                <span className="font-medium text-foreground">Tel: </span>
                {timesheet.carer.contactNumber}
              </div>
            )}
          </div>
          <div className="pt-2 border-t text-sm font-medium">
            Total: {totalHours}h {totalMins > 0 ? `${totalMins}m` : ""} |{" "}
            {timesheet.entries.filter((e) => e.clockIn && e.clockOut).length}{" "}
            days
          </div>
        </CardContent>
      </Card>

      {/* Photo Upload */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Paper Timesheet Photos</h2>
            {timesheet.photos.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {timesheet.photos.length}
              </Badge>
            )}
          </div>

          {/* Uploaded photos */}
          {timesheet.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {timesheet.photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={`/api/uploads/${photo.path}`}
                    alt={photo.filename}
                    className="w-full aspect-square object-cover rounded-lg border"
                  />
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => deletePhotoMutation.mutate(photo.id)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={deletePhotoMutation.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload area */}
          {!isLocked && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => handlePhotoUpload(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {uploading ? (
                  <div className="h-8 w-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="h-8 w-8" />
                )}
                <span className="text-sm font-medium">
                  {uploading ? "Uploading..." : "Take Photo or Upload"}
                </span>
                <span className="text-xs">
                  Tap to open camera or choose from gallery
                </span>
              </button>
            </>
          )}

          {isLocked && timesheet.photos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No photos attached
            </p>
          )}
        </CardContent>
      </Card>

      {/* Day Cards */}
      <div className="space-y-2">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const entry = getEntry(day);
          const dow = getDayOfWeek(day);
          const isWeekend = dow === "Sun" || dow === "Sat";
          const hours = calculateHours(
            entry?.clockIn ?? null,
            entry?.clockOut ?? null
          );

          return (
            <Card
              key={day}
              className={isWeekend ? "opacity-60" : undefined}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Day label */}
                  <div className="w-12 text-center shrink-0">
                    <div className="text-lg font-bold leading-tight">{day}</div>
                    <div className="text-xs text-muted-foreground">{dow}</div>
                  </div>

                  {/* Time inputs */}
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">
                        In
                      </label>
                      <Input
                        type="time"
                        className="h-10 text-base"
                        defaultValue={entry?.clockIn || ""}
                        disabled={isLocked}
                        onBlur={(e) =>
                          handleTimeChange(day, "clockIn", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">
                        Out
                      </label>
                      <Input
                        type="time"
                        className="h-10 text-base"
                        defaultValue={entry?.clockOut || ""}
                        disabled={isLocked}
                        onBlur={(e) =>
                          handleTimeChange(day, "clockOut", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="w-12 text-center text-xs text-muted-foreground shrink-0">
                    {hours || "—"}
                  </div>
                </div>

                {/* Signatures */}
                <div className="flex gap-2 mt-2 ml-15">
                  <button
                    type="button"
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
                      entry?.carerSignature
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                    disabled={isLocked}
                    onClick={() =>
                      setSignatureModal({ day, type: "carer" })
                    }
                  >
                    {entry?.carerSignature ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Pen className="h-3 w-3" />
                    )}
                    Carer
                  </button>
                  <button
                    type="button"
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
                      entry?.clientSignature
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                    disabled={isLocked}
                    onClick={() =>
                      setSignatureModal({ day, type: "client" })
                    }
                  >
                    {entry?.clientSignature ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Pen className="h-3 w-3" />
                    )}
                    Client
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit Button */}
      {(timesheet.status === "DRAFT" || timesheet.status === "REJECTED") && (
        <div className="sticky bottom-20 p-4 -mx-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
          <Button
            className="w-full h-12 text-base"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
          </Button>
        </div>
      )}

      {/* Signature Modal */}
      {signatureModal && (
        <SignatureModal
          open={true}
          onClose={() => setSignatureModal(null)}
          onSave={handleSignatureSave}
          title={`${signatureModal.type === "carer" ? "Carer" : "Client"} Signature — Day ${signatureModal.day}`}
        />
      )}
    </div>
  );
}
