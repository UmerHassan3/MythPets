"use client";

import { upload } from "@imagekit/next";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/Components/ui/button";

interface ImageUploadResult {
  url: string;
  fileId: string;
  name: string;
  filePath: string;
}

interface ImageUploadProps {
  folder?: string;
  onUpload?: (image: ImageUploadResult) => void;
  onError?: (error: Error) => void;
  /** Called when the user clears the selection. */
  onClear?: () => void;
}

const ImageUpload = ({
  folder = "/uploads",
  onUpload,
  onError,
  onClear,
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear?.();
  };

  const handleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploading(true);

      // Local preview
      setPreview(URL.createObjectURL(file));

      // Get ImageKit authentication
      const response = await fetch("/api/imagekit/auth");

      if (!response.ok) {
        throw new Error("Failed to authenticate ImageKit upload");
      }

      const auth = await response.json();

      const result = await upload({
        file,
        fileName: file.name,

        token: auth.token,
        signature: auth.signature,
        expire: auth.expire,
        publicKey: auth.publicKey,

        folder,
        useUniqueFileName: true,
      });

      const image: ImageUploadResult = {
        url: result.url!,
        fileId: result.fileId!,
        name: result.name!,
        filePath: result.filePath!,
      };

      toast.success("Image uploaded successfully");

      // Send result to parent component
      onUpload?.(image);

    } catch (error) {
      const err =
        error instanceof Error
          ? error
          : new Error("Image upload failed");

      console.error(err);

      toast.error(err.message || "Image upload failed");

      onError?.(err);

      clear();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-start gap-3">
      {/* Fixed 80px box: the preview can never grow with the image it holds. */}
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border bg-muted">
        {preview ? (
          <img
            src={preview}
            alt="Selected image preview"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImagePlus className="size-5 text-muted-foreground" />
          </div>
        )}

        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </div>

      <div className="min-w-0 space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="block w-full max-w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80 disabled:opacity-50"
        />

        {uploading ? (
          <p className="text-xs text-muted-foreground">Uploading…</p>
        ) : null}

        {preview && !uploading ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="h-7 gap-1 px-2 text-xs text-muted-foreground"
          >
            <X className="size-3.5" />
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default ImageUpload;
