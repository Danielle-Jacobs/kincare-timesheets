"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  CheckCircle,
  Camera,
  ImageOff,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface TimesheetPhoto {
  id: string;
  path: string;
  createdAt: string;
}

interface TimesheetData {
  id: string;
  status: string;
  month: number;
  year: number;
  createdAt: string;
  carer: { name: string };
  client: { name: string };
  photos: TimesheetPhoto[];
  _count: { photos: number; entries: number };
}

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function AdminDashboard() {
  const { data: timesheets, isLoading } = useQuery<TimesheetData[]>({
    queryKey: ["timesheets"],
    queryFn: () => fetch("/api/timesheets").then((r) => r.json()),
  });

  const needsReview =
    timesheets?.filter((t) => t.status === "SUBMITTED") || [];
  const withPhotos =
    timesheets?.filter((t) => t._count.photos > 0) || [];
  const noPhotos =
    timesheets?.filter(
      (t) => t._count.photos === 0 && t.status === "DRAFT"
    ) || [];
  const approved =
    timesheets?.filter((t) => t.status === "APPROVED").length || 0;

  // Recent uploads: timesheets sorted by most recent photo
  const recentUploads = [...(withPhotos || [])]
    .sort((a, b) => {
      const aDate = a.photos[0]?.createdAt || a.createdAt;
      const bDate = b.photos[0]?.createdAt || b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    })
    .slice(0, 6);

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{needsReview.length}</p>
                    <p className="text-xs text-muted-foreground">
                      Needs Review
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50">
                    <Camera className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{withPhotos.length}</p>
                    <p className="text-xs text-muted-foreground">
                      With Photos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{approved}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{noPhotos.length}</p>
                    <p className="text-xs text-muted-foreground">
                      Awaiting Upload
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Needs Review */}
      {needsReview.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Needs Review</CardTitle>
              <Link
                href="/admin/timesheets"
                className="text-xs text-primary hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {needsReview.slice(0, 5).map((t) => (
              <Link
                key={t.id}
                href={`/admin/timesheets/${t.id}`}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="shrink-0 w-10 h-10 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
                  {t.photos.length > 0 ? (
                    <img
                      src={`/api/uploads/${t.photos[0].path}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageOff className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t.carer.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.client.name} &middot;{" "}
                    {monthNames[t.month - 1]} {t.year}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t._count.photos > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Camera className="h-3 w-3" />
                      {t._count.photos}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Uploads */}
      {recentUploads.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {recentUploads.map((t) => (
                <Link key={t.id} href={`/admin/timesheets/${t.id}`}>
                  <div className="group relative">
                    <div className="aspect-[3/4] rounded-lg border bg-muted overflow-hidden">
                      {t.photos[0] ? (
                        <img
                          src={`/api/uploads/${t.photos[0].path}`}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <p className="text-xs font-medium truncate">
                        {t.carer.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t.client.name.split(" ").slice(-1)[0]} &middot;{" "}
                        {monthNames[t.month - 1]} {t.year}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`absolute top-1.5 right-1.5 text-[10px] px-1.5 ${statusColors[t.status]}`}
                    >
                      {t.status}
                    </Badge>
                    {t._count.photos > 1 && (
                      <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                        +{t._count.photos - 1}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
