"use client";

import { use, useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Upload, X, CheckCircle } from "lucide-react";
import { toast, Toaster } from "sonner";

interface Photo {
  id: string;
  filename: string;
  path: string;
}

interface TimesheetInfo {
  id: string;
  month: number;
  year: number;
  status: string;
  client: { id: string; name: string };
  photos: Photo[];
}

interface UploadData {
  carer: { name: string };
  clients: { id: string; name: string }[];
  timesheets: TimesheetInfo[];
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PublicUploadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const now = new Date();
  const [clientId, setClientId] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<UploadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/upload/${token}`);
      if (!res.ok) {
        setError("This upload link is invalid or has expired.");
        return;
      }
      const json: UploadData = await res.json();
      setData(json);
      if (json.clients.length === 1) {
        setClientId(json.clients[0].id);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentPhotos =
    data?.timesheets.find(
      (t) => t.client.id === clientId && t.month === month && t.year === year
    )?.photos ?? [];

  const currentStatus = data?.timesheets.find(
    (t) => t.client.id === clientId && t.month === month && t.year === year
  )?.status;

  const isLocked = currentStatus === "SUBMITTED" || currentStatus === "APPROVED";

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !clientId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("photo", file);
        formData.append("clientId", clientId);
        formData.append("month", String(month));
        formData.append("year", String(year));
        const res = await fetch(`/api/upload/${token}`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Upload failed");
        }
      }
      toast.success(
        files.length === 1 ? "Photo uploaded!" : `${files.length} photos uploaded!`
      );
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      const res = await fetch(
        `/api/upload/${token}?photoId=${photoId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Photo removed");
      fetchData();
    } catch {
      toast.error("Failed to remove photo");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center space-y-2">
            <p className="text-lg font-semibold text-destructive">Link Invalid</p>
            <p className="text-sm text-muted-foreground">
              {error || "This upload link is not valid."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="text-center py-4">
          <h1 className="text-xl font-bold">KinCare Timesheet Upload</h1>
          <p className="text-muted-foreground mt-1">
            Hi <span className="font-medium text-foreground">{data.carer.name}</span>
          </p>
        </div>

        {/* Selection */}
        <Card>
          <CardContent className="p-4 space-y-3">
            {data.clients.length > 1 && (
              <div>
                <label className="text-sm font-medium mb-1 block">Client</label>
                <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Month</label>
                <Select
                  value={String(month)}
                  onValueChange={(v) => setMonth(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((name, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Year</label>
                <Select
                  value={String(year)}
                  onValueChange={(v) => setYear(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(
                      (y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status message for locked timesheets */}
        {isLocked && (
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
              <p className="font-medium">
                This timesheet has been {currentStatus?.toLowerCase()}
              </p>
              <p className="text-sm text-muted-foreground">
                You can&apos;t add or remove photos anymore.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Upload area */}
        {clientId && !isLocked && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Upload Timesheet Photo</h2>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex flex-col items-center gap-3 py-8 border-2 border-dashed rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors active:scale-[0.98]"
              >
                {uploading ? (
                  <div className="h-10 w-10 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-10 w-10" />
                )}
                <div className="text-center">
                  <span className="text-base font-medium block">
                    {uploading ? "Uploading..." : "Take Photo"}
                  </span>
                  <span className="text-xs">
                    or choose from gallery
                  </span>
                </div>
              </button>
            </CardContent>
          </Card>
        )}

        {!clientId && data.clients.length > 1 && (
          <p className="text-sm text-muted-foreground text-center">
            Select a client above to start uploading
          </p>
        )}

        {/* Uploaded photos */}
        {currentPhotos.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">
                  Uploaded Photos
                </h2>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {currentPhotos.length}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {currentPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={`/api/uploads/${photo.path}?token=${token}`}
                      alt={photo.filename}
                      className="w-full aspect-[3/4] object-cover rounded-lg border"
                    />
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => handleDelete(photo.id)}
                        className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
