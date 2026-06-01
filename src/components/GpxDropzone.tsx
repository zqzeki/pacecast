import { useCallback, useRef, useState } from "react";
import { Upload, FileCheck2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onFile: (text: string, name: string) => void;
  fileName?: string | null;
  error?: string | null;
}

export function GpxDropzone({ onFile, fileName, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      const text = await file.text();
      onFile(text, file.name);
    },
    [onFile],
  );

  // After upload: compact inline bar
  if (fileName) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
        <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />
        <p className="flex-1 truncate text-sm font-medium text-foreground" title={fileName}>
          {fileName}
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="shrink-0 rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          Replace
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".gpx,application/gpx+xml,text/xml"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      </div>
    );
  }

  // Before upload: full dropzone
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card px-6 py-12 text-center transition-all hover:border-primary hover:bg-accent/40",
        dragging && "border-primary bg-accent/60",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".gpx,application/gpx+xml,text/xml"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <Upload className="mb-3 h-10 w-10 text-muted-foreground transition-colors group-hover:text-primary" />
      <p className="text-sm font-medium text-foreground">
        Drop your GPX file here, or click to browse
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Exported from Strava, Garmin, Komoot, etc.
      </p>
      {error && <p className="mt-3 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
