import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ObjectUploaderProps {
  clientName: string;
  onUploadComplete?: (fileData: {
    fileName: string;
    fileType: string;
    fileSize: number;
    objectPath: string;
    description?: string;
  }) => void;
  buttonClassName?: string;
  className?: string;
  children: ReactNode;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file upload and management.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for file selection and description
 * - Handles direct upload to object storage using presigned URLs
 * - Shows upload progress and status
 */
export function ObjectUploader({
  clientName,
  onUploadComplete,
  buttonClassName,
  className,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    
    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('clientName', clientName);
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      // Upload file directly to server (which uploads to S3)
      const uploadResponse = await fetch('/api/client-documents', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload document');
      }

      const document = await uploadResponse.json();

      // Call completion callback with document data
      onUploadComplete?.({
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        objectPath: document.objectPath,
        description: document.description,
      });

      // Reset form
      setSelectedFile(null);
      setDescription("");
      setShowModal(false);

      toast({
        title: "Document Uploaded",
        description: `${selectedFile.name} has been uploaded successfully.`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  return (
    <div>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogTrigger asChild>
          <Button className={buttonClassName} data-testid="button-upload-document">
            {children}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document for {clientName}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* File Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Select File
              </label>
              {!selectedFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-2">
                    <Input
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                      data-testid="input-file-select"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Upload care plan revisions, assessments, or other documents
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      data-testid="button-remove-file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {selectedFile && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description (Optional)
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Care plan revision v2, Assessment update"
                  data-testid="input-document-description"
                />
              </div>
            )}

            {/* Upload Button */}
            {selectedFile && (
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={isUploading}
                  data-testid="button-cancel-upload"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="bg-primary text-primary-foreground"
                  data-testid="button-confirm-upload"
                >
                  {isUploading ? "Uploading..." : "Upload Document"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}