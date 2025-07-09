import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Upload, CloudUpload, File, X } from "lucide-react";

interface FileUploadProps {
  projectId: number;
}

export function FileUpload({ projectId }: FileUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [targetPath, setTargetPath] = useState("");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
    }
  };

  const uploadFiles = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      Array.from(selectedFiles).forEach((file) => {
        formData.append("files", file);
      });
      formData.append("targetPath", targetPath);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
          toast({
            title: "Success",
            description: `${selectedFiles.length} file(s) uploaded successfully`,
          });
          setSelectedFiles(null);
          setTargetPath("");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } else {
          throw new Error("Upload failed");
        }
        setUploading(false);
        setUploadProgress(0);
      };

      xhr.onerror = () => {
        toast({
          title: "Error",
          description: "Upload failed",
          variant: "destructive",
        });
        setUploading(false);
        setUploadProgress(0);
      };

      xhr.open("POST", `/api/projects/${projectId}/upload`);
      xhr.send(formData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Upload failed",
        variant: "destructive",
      });
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = (index: number) => {
    if (!selectedFiles) return;
    
    const dt = new DataTransfer();
    Array.from(selectedFiles).forEach((file, i) => {
      if (i !== index) dt.items.add(file);
    });
    
    setSelectedFiles(dt.files.length > 0 ? dt.files : null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-pi-green" />
            <span>File Upload</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="targetPath" className="text-sm font-medium text-pi-text mb-2 block">
              Target Directory (optional)
            </Label>
            <Input
              id="targetPath"
              placeholder="e.g., stage2/files"
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
            />
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? "border-pi-red bg-red-50"
                : "border-gray-300 hover:border-pi-red"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUpload className="w-12 h-12 text-pi-accent mb-4 mx-auto" />
            <div className="text-lg font-medium text-pi-text mb-2">
              Drop files here or click to browse
            </div>
            <div className="text-sm text-pi-accent">
              Upload custom scripts, configuration files, or assets
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {selectedFiles && selectedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-pi-text mb-3">Selected Files</h3>
                <div className="space-y-2">
                  {Array.from(selectedFiles).map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <File className="w-4 h-4 text-pi-accent" />
                        <span className="text-sm text-pi-text">{file.name}</span>
                        <span className="text-xs text-pi-accent">
                          ({Math.round(file.size / 1024)} KB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0 hover:bg-red-100"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading files...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              <Button
                onClick={uploadFiles}
                disabled={uploading}
                className="w-full bg-pi-green hover:bg-pi-green/90"
              >
                {uploading ? "Uploading..." : "Upload Files"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
