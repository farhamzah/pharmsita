// components/ui/upload-file-input.tsx
interface UploadFileInputProps {
  onChange?: (file: File | null) => void;
}

export default function UploadFileInput({ onChange }: UploadFileInputProps) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-dashed p-4 cursor-pointer hover:bg-muted/50">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">☁</span>
        <span>Upload File</span>
      </div>

      <span className="text-xs text-muted-foreground hidden lg:block">
        Browse file
      </span>

      <input
        type="file"
        className="hidden"
        onChange={(e) => onChange?.(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
