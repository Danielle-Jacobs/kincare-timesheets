"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eraser } from "lucide-react";

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  title: string;
}

export function SignatureModal({
  open,
  onClose,
  onSave,
  title,
}: SignatureModalProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [typedName, setTypedName] = useState("");

  function handleDrawSave() {
    if (!sigRef.current || sigRef.current.isEmpty()) return;
    const dataUrl = sigRef.current.toDataURL("image/png");
    onSave(dataUrl);
  }

  function handleTypeSave() {
    if (!typedName.trim()) return;

    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "48px Caveat, cursive";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);

    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[85dvh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="draw" className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw">Draw</TabsTrigger>
            <TabsTrigger value="type">Type</TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="flex flex-col gap-4 mt-4">
            <div className="border rounded-lg bg-white flex-1 min-h-[200px] touch-none">
              <SignatureCanvas
                ref={sigRef}
                canvasProps={{
                  className: "w-full h-full min-h-[200px]",
                  style: { touchAction: "none" },
                }}
                penColor="#1a1a1a"
                backgroundColor="white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={() => sigRef.current?.clear()}
              >
                <Eraser className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button className="flex-1 h-12" onClick={handleDrawSave}>
                Save Signature
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="type" className="flex flex-col gap-4 mt-4">
            <Input
              placeholder="Type your name"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              className="h-12 text-lg"
              autoFocus
            />
            <div className="border rounded-lg bg-white p-8 flex items-center justify-center min-h-[150px]">
              <p
                className="text-4xl text-center"
                style={{ fontFamily: "var(--font-caveat), Caveat, cursive" }}
              >
                {typedName || "Your name here"}
              </p>
            </div>
            <Button className="h-12" onClick={handleTypeSave}>
              Save Signature
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
