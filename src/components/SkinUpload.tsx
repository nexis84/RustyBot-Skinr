import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Check, Loader2, User, Info, Database } from 'lucide-react';
import { getCharacterByName, CharacterInfo } from '../services/esi';

interface SkinUploadProps {
  onUpload: (data: { imageUrl: string; characterName: string; characterId: number; description?: string; name: string }) => Promise<void>;
  isUploading: boolean;
  userProfile: { characterName: string; characterId: number; characterPortrait: string } | null;
}

export default function SkinUpload({ onUpload, isUploading, userProfile }: SkinUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback((selectedFile: File) => {
    if (selectedFile) {
      if (selectedFile.size > 800000) { // ~800KB limit for Firestore base64
        setError('Image is too large (max 800KB). Please compress it.');
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
      setError(null);
    }
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    processFile(acceptedFiles[0]);
  }, [processFile]);

  // Handle Ctrl+V Paste
  React.useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processFile(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFile]);

  const dropzoneOptions: any = {
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneOptions);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview || !userProfile) return;

    try {
      await onUpload({
        imageUrl: preview,
        characterName: userProfile.characterName,
        characterId: userProfile.characterId,
        description: description.trim() || undefined,
        name: name.trim() || 'Unnamed Skin'
      });
      // Reset
      setFile(null);
      setPreview(null);
      setName('');
      setDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to upload skin. Please try again.');
    }
  };

  return (
    <div className="bg-[#050505] border border-[#1a1a1a] p-8 relative overflow-hidden">
      {/* Decorative Corner Elements */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#ffcc00]" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#ffcc00]" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#ffcc00]" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#ffcc00]" />

      <div className="flex items-center justify-between mb-8 border-b border-[#1a1a1a] pb-4">
        <h2 className="header-rusty text-xl flex items-center gap-3">
          <Upload size={18} />
          DATA_INGESTION_MODULE
        </h2>
        <div className="flex gap-1">
          <div className="w-1 h-4 bg-[#ffcc00]/20" />
          <div className="w-1 h-4 bg-[#ffcc00]/40" />
          <div className="w-1 h-4 bg-[#ffcc00]/60" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div
          {...getRootProps()}
          className={`
            relative aspect-video border border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group
            ${isDragActive ? 'border-[#ffcc00] bg-[#ffcc00]/5' : 'border-[#1a1a1a] hover:border-[#333]'}
            ${preview ? 'border-solid p-0' : 'p-12'}
          `}
        >
          <input {...getInputProps()} />
          {preview ? (
            <div className="relative w-full h-full">
              <img src={preview} alt="Preview" className="w-full h-full object-contain opacity-90" />
              <div className="absolute inset-0 border-4 border-[#ffcc00]/20 pointer-events-none" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setPreview(null);
                }}
                className="absolute top-4 right-4 p-2 bg-black/80 border border-[#ffcc00] text-[#ffcc00] hover:bg-[#ffcc00] hover:text-black transition-all"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border border-[#1a1a1a] group-hover:border-[#ffcc00] flex items-center justify-center mx-auto transition-colors">
                <Upload className="text-[#333] group-hover:text-[#ffcc00] transition-colors" size={32} />
              </div>
              <div>
                <p className="text-[#666666] font-mono text-xs uppercase tracking-[0.2em] group-hover:text-[#ffcc00] transition-colors">
                  Drop_Or_Paste_Visual_Data
                </p>
                <p className="text-[#333] text-[9px] mt-2 uppercase tracking-widest font-mono">
                  Format: IMG_FILE // Max_Payload: 800KB
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.3em] text-[#444] mb-3">Skin_Name (Required)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ENTER_SKIN_NAME..."
                className="w-full bg-[#050505] border border-[#1a1a1a] p-4 text-sm font-mono text-[#ffcc00] placeholder:text-[#222] focus:outline-none focus:border-[#ffcc00]/30"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.3em] text-[#444] mb-3">Identity_Verified</label>
              {userProfile && (
                <div className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-[#1a1a1a] relative group">
                  <div className="absolute top-0 right-0 p-1">
                    <div className="w-1 h-1 bg-green-500/50 animate-pulse" />
                  </div>
                  <img 
                    src={userProfile.characterPortrait} 
                    alt="Portrait" 
                    className="w-14 h-14 border border-[#ffcc00]/30 grayscale group-hover:grayscale-0 transition-all" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <p className="text-[#ffcc00] font-mono text-xs font-bold uppercase truncate">{userProfile.characterName}</p>
                    <p className="text-[#444] text-[9px] uppercase tracking-widest truncate mt-1">Character_ID: {userProfile.characterId}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.3em] text-[#444] mb-3">Transmission_Notes (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ADD_METADATA_HERE..."
              className="w-full bg-[#050505] border border-[#1a1a1a] p-4 text-sm font-mono text-[#888] placeholder:text-[#222] focus:outline-none focus:border-[#ffcc00]/30 h-full min-h-[140px] resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/10 border border-red-500/30 text-red-500 font-mono text-[10px] uppercase tracking-widest flex items-center gap-3">
            <Info size={14} />
            System_Alert: {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!preview || !userProfile || isUploading}
          className="w-full h-16 bg-transparent border border-[#ffcc00] text-[#ffcc00] hover:bg-[#ffcc00] hover:text-black font-mono text-xs uppercase tracking-[0.4em] transition-all disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
        >
          {isUploading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <Database size={16} className="group-hover:animate-pulse" />
              Commit_To_Database
            </>
          )}
        </button>
      </form>
    </div>
  );
}
