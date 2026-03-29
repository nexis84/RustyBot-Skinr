import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, ImageIcon, Star } from 'lucide-react';
import { format } from 'date-fns';

interface ImageModalProps {
  skin: {
    id: string;
    imageUrl: string;
    additionalImages?: { url: string; cloudinaryId: string }[];
    characterName: string;
    characterId: number;
    createdAt: string;
    description?: string;
    name?: string;
    uid: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  isOwner?: boolean;
  onSetMainImage?: (skinId: string, imageIndex: number) => Promise<void>;
}

export const ImageModal: React.FC<ImageModalProps> = ({ skin, isOpen, onClose, isOwner, onSetMainImage }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSettingMain, setIsSettingMain] = useState(false);

  // Reset current index when skin changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [skin?.id]);

  if (!skin) return null;

  // Build array of all images
  const allImages = [
    { url: skin.imageUrl, cloudinaryId: '' },
    ...(skin.additionalImages || [])
  ];
  const totalImages = allImages.length;
  const currentImage = allImages[currentIndex];
  const date = new Date(skin.createdAt);
  const isCurrentMain = currentIndex === 0;

  const goToPrevious = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  };

  const goToNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
  };

  const handleSetMain = async () => {
    if (!onSetMainImage || isCurrentMain || isSettingMain) return;
    
    setIsSettingMain(true);
    try {
      await onSetMainImage(skin.id, currentIndex);
    } catch (err) {
      console.error('Failed to set main image:', err);
    } finally {
      setIsSettingMain(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative max-w-6xl w-full max-h-[90vh] bg-[#050505] border border-[#1a1a1a] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 bg-black/80 border border-[#ffcc00] text-[#ffcc00] hover:bg-[#ffcc00] hover:text-black transition-all"
            >
              <X size={20} />
            </button>

            {/* Image Container with Navigation */}
            <div className="relative aspect-video bg-[#0a0a0a]">
              <img
                src={currentImage.url}
                alt={skin.name || `Skin by ${skin.characterName}`}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />

              {/* Navigation Arrows */}
              {totalImages > 1 && (
                <>
                  <button
                    onClick={goToPrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 border border-[#ffcc00] text-[#ffcc00] hover:bg-[#ffcc00] hover:text-black transition-all"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={goToNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 border border-[#ffcc00] text-[#ffcc00] hover:bg-[#ffcc00] hover:text-black transition-all"
                  >
                    <ChevronRight size={24} />
                  </button>

                  {/* Image Counter */}
                  <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 border border-[#1a1a1a] text-[#ffcc00] font-mono text-xs">
                    <ImageIcon size={12} className="inline mr-2" />
                    {currentIndex + 1} / {totalImages}
                    {isCurrentMain && (
                      <span className="ml-2 text-[#ffcc00]">[MAIN]</span>
                    )}
                  </div>

                  {/* Set as Main Button (only for owners, not on main image) */}
                  {isOwner && !isCurrentMain && onSetMainImage && (
                    <button
                      onClick={handleSetMain}
                      disabled={isSettingMain}
                      className="absolute top-4 right-20 px-3 py-2 bg-black/80 border border-[#ffcc00] text-[#ffcc00] hover:bg-[#ffcc00] hover:text-black transition-all font-mono text-xs uppercase flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSettingMain ? (
                        <>
                          <div className="w-3 h-3 border-2 border-[#ffcc00] border-t-transparent rounded-full animate-spin" />
                          Setting...
                        </>
                      ) : (
                        <>
                          <Star size={12} />
                          Set as Main
                        </>
                      )}
                    </button>
                  )}

                  {/* Thumbnails */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {allImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentIndex(idx);
                        }}
                        className={`w-16 h-10 border-2 overflow-hidden transition-all relative ${
                          idx === currentIndex ? 'border-[#ffcc00]' : 'border-[#1a1a1a] opacity-50'
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {idx === 0 && (
                          <div className="absolute top-0 right-0 w-4 h-4 bg-[#ffcc00] flex items-center justify-center">
                            <Star size={8} className="text-black" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Info Panel */}
            <div className="p-6 border-t border-[#1a1a1a]">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-[#ffcc00] text-xl font-mono uppercase tracking-tight mb-2">
                    {skin.name || 'Unnamed_Skin'}
                  </h2>
                  {skin.description && (
                    <p className="text-[#888] text-sm font-mono mb-4">{skin.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-[10px] font-mono text-[#666666] uppercase tracking-widest">
                    <span>Uploaded: {format(date, 'yyyy.MM.dd HH:mm')}</span>
                    <span className="w-1 h-1 bg-[#333] rounded-full" />
                    <span>ID: {skin.id.slice(0, 8)}</span>
                    {totalImages > 1 && (
                      <>
                        <span className="w-1 h-1 bg-[#333] rounded-full" />
                        <span className="text-[#ffcc00]">{totalImages} Images</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Author Info */}
                <div className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-[#1a1a1a]">
                  <img
                    src={`https://images.evetech.net/characters/${skin.characterId}/portrait?size=128`}
                    alt={skin.characterName}
                    className="w-16 h-16 border border-[#ffcc00]"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="text-[#ffcc00] font-mono text-sm font-bold uppercase">{skin.characterName}</p>
                    <p className="text-[#666666] text-[10px] font-mono uppercase mt-1">Character_ID: {skin.characterId}</p>
                    <div className="flex gap-3 mt-2">
                      <a
                        href={`https://zkillboard.com/character/${skin.characterId}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] font-mono text-[#444] hover:text-[#ffcc00] transition-colors uppercase"
                      >
                        [ zKill ]
                      </a>
                      <a
                        href={`https://evewho.com/character/${skin.characterId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] font-mono text-[#444] hover:text-[#ffcc00] transition-colors uppercase"
                      >
                        [ EveWho ]
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
