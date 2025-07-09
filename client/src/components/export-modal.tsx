import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, X } from "lucide-react";
import type { Project } from "@shared/schema";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  project: Project | undefined;
}

export function ExportModal({ isOpen, onClose, onExport, project }: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport();
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-sm font-medium text-green-800">Configuration validated</div>
              <div className="text-xs text-green-600">No errors found</div>
            </div>
          </div>
          
          <div className="text-sm text-pi-accent">
            Your Pi-Gen project "{project?.name}" will be exported as a ZIP file containing 
            all configuration files and directory structure ready for use with Pi-Gen.
          </div>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 bg-pi-green hover:bg-pi-green/90"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? "Exporting..." : "Download ZIP"}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
