"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Copy, Link, Users } from "lucide-react";

interface ClientInfo {
  id: string;
  name: string;
}

interface Carer {
  id: string;
  name: string;
  email: string;
  idNumber: string | null;
  contactNumber: string | null;
  uploadToken: string | null;
  active: boolean;
  clients: ClientInfo[];
}

export default function CarersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "carer123",
    idNumber: "",
    contactNumber: "",
  });

  const { data: carers, isLoading } = useQuery<Carer[]>({
    queryKey: ["carers"],
    queryFn: () => fetch("/api/carers").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/carers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["carers"] });
      setOpen(false);
      setForm({ name: "", email: "", password: "carer123", idNumber: "", contactNumber: "" });
      toast.success("Carer account created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: allClients } = useQuery<ClientInfo[]>({
    queryKey: ["clients"],
    queryFn: () => fetch("/api/clients").then((r) => r.json()),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ carerId, clientIds }: { carerId: string; clientIds: string[] }) => {
      const res = await fetch(`/api/carers/${carerId}/clients`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientIds }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["carers"] });
      setAssignOpen(null);
      toast.success("Client assignments updated");
    },
    onError: () => toast.error("Failed to update assignments"),
  });

  const openAssignDialog = (carer: Carer) => {
    setSelectedClients(carer.clients.map((c) => c.id));
    setAssignOpen(carer.id);
  };

  const toggleClient = (clientId: string) => {
    setSelectedClients((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Carers</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" /> Add Carer
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Carer Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Temporary Password</Label>
                <Input
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>ID Number</Label>
                <Input
                  value={form.idNumber}
                  onChange={(e) =>
                    setForm({ ...form, idNumber: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Contact Number</Label>
                <Input
                  value={form.contactNumber}
                  onChange={(e) =>
                    setForm({ ...form, contactNumber: e.target.value })
                  }
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {carers?.map((carer) => (
          <Card key={carer.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{carer.name}</p>
                  <p className="text-sm text-muted-foreground">{carer.email}</p>
                  {carer.idNumber && (
                    <p className="text-xs text-muted-foreground">
                      ID: {carer.idNumber}
                    </p>
                  )}
                </div>
                <Badge variant={carer.active ? "secondary" : "destructive"}>
                  {carer.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {/* Assigned clients */}
              <div className="flex items-center gap-2 pt-1 border-t">
                <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 flex flex-wrap gap-1">
                  {carer.clients.length > 0 ? (
                    carer.clients.map((c) => (
                      <Badge key={c.id} variant="secondary" className="text-xs">
                        {c.name.split(" ").slice(-1)[0]}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No clients assigned</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 shrink-0 text-xs"
                  onClick={() => openAssignDialog(carer)}
                >
                  Assign
                </Button>
              </div>
              {carer.uploadToken && (
                <div className="flex items-center gap-2 pt-1 border-t">
                  <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <code className="text-xs text-muted-foreground truncate flex-1">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/upload/${carer.uploadToken}`
                      : `/upload/${carer.uploadToken}`}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 shrink-0"
                    onClick={() => {
                      const url = `${window.location.origin}/upload/${carer.uploadToken}`;
                      navigator.clipboard.writeText(url);
                      toast.success("Upload link copied!");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assign Clients Dialog */}
      <Dialog
        open={!!assignOpen}
        onOpenChange={(open) => { if (!open) setAssignOpen(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign Clients to{" "}
              {carers?.find((c) => c.id === assignOpen)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allClients?.map((client) => (
              <label
                key={client.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedClients.includes(client.id)}
                  onChange={() => toggleClient(client.id)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span className="text-sm">{client.name}</span>
              </label>
            ))}
          </div>
          <Button
            className="w-full"
            onClick={() =>
              assignOpen &&
              assignMutation.mutate({
                carerId: assignOpen,
                clientIds: selectedClients,
              })
            }
            disabled={assignMutation.isPending}
          >
            {assignMutation.isPending ? "Saving..." : "Save Assignments"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
