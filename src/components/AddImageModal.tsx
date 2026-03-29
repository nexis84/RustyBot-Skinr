import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Loader2, ImagePlus, ClipboardPaste } from 'lucide-react';

interface AddImageModalProps {
  skin: {
    id: string;
    name?: string;
    imageUrl: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onAddImage: (skinId: string, imageUrl: string) => Promise<void>;
}

export const AddImageModal: React.FC<AddImageModalProps> = ({ skin, isOpen, onClose, onAddImage }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle Ctrl+V paste
  useEffect(() => {
    if (!isOpen) return;
    
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            setFile(blob);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(blob);
            setError(null);
          }
          break;
        }
      }
    };
    
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(droppedFile);
      setError(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file || !preview || !skin) return;

    setIsUploading(true);
    setError(null);

    try {
      await onAddImage(skin.id, preview);
      // Reset and close
      setFile(null);
      setPreview(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    onClose();
  };

  if (!skin) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative max-w-lg w-full bg-[#050505] border border-[#1a1a1a] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="h-12 border-b border-[#1a1a1a] bg-[#0a0a0a] flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <ImagePlus size={16} className="text-[#ffcc00]" />
                <span className="text-[#ffcc00] font-mono text-xs uppercase tracking-widest">
                  Add_Image_To: {skin.name || 'Unnamed_Skin'}
                </span>
              </div>
              <button
                onClick={handleClose}
                className="text-[#666666] hover:text-[#ffcc00] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Current Preview */}
              <div className="border border-[#1a1a1a] p-2">
                <p className="text-[9px] text-[#444] uppercase font-mono mb-2">Current_Main_Image</p>
                <img
                  src={skin.imageUrl}
                  alt="Current"
                  className="w-full h-32 object-cover"
                />
              </div>

              {/* Drop Zone */}
              {!preview ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-[#1a1a1a] hover:border-[#ffcc00] transition-colors p-8 text-center cursor-pointer"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="add-image-input"
                  />
                  <label htmlFor="add-image-input" className="cursor-pointer block">
                    <Upload size={32} className="mx-auto mb-4 text-[#333]" />
                    <p className="text-[#666666] font-mono text-xs uppercase tracking-widest mb-2">
                      Drop_Image_Here
                    </p>
                    <p className="text-[#444] font-mono text-[10px] mb-1">
                      Or_Click_To_Select
                    </p>
                    <p className="text-[#ffcc00]/60 font-mono text-[10px]">
                      [Ctrl+V to Paste]
                    </p>
                  </label>
                </div>
              ) : (
                <div className="border border-[#1a1a1a] p-2">
                  <p className="text-[9px] text-[#444] uppercase font-mono mb-2">New_Image_Preview</p>
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                    }}
                    className="mt-2 text-[10px] text-red-500 hover:text-red-400 font-mono uppercase"
                  >
                    [ Remove ]
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-900/10 border border-red-500/50 text-red-500 font-mono text-xs">
                  Error: {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleClose}
                  className="flex-1 h-12 border border-[#1a1a1a] text-[#666666] hover:text-[#ffcc00] hover:border-[#ffcc00] font-mono text-xs uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!file || isUploading}
                  className="flex-1 h-12 bg-[#ffcc00] text-black font-mono text-xs uppercase tracking-widest hover:bg-[#ffcc00]/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ImagePlus size={14} />
                      Add_Image
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
