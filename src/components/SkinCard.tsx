import React from 'react';
import { motion } from 'motion/react';
import { Trash2, ExternalLink, Shield, Database, ImagePlus, Images } from 'lucide-react';
import { format } from 'date-fns';

interface SkinCardProps {
  skin: {
    id: string;
    imageUrl: string;
    additionalImages?: { url: string; cloudinaryId: string }[];
    characterName: string;
    characterId: number;
    createdAt: any;
    description?: string;
    name?: string;
    uid: string;
  };
  isOwner?: boolean;
  onDelete?: (id: string) => void;
  onClick?: (skin: any) => void;
  onAddImage?: (skin: any) => void;
}

export const SkinCard: React.FC<SkinCardProps> = ({ skin, isOwner, onDelete, onClick, onAddImage }) => {
  const date = skin.createdAt?.toDate ? skin.createdAt.toDate() : new Date(skin.createdAt);
  const imageCount = 1 + (skin.additionalImages?.length || 0);

  return (
    <div 
      onClick={() => onClick?.(skin)}
      className={`group relative border border-[#1a1a1a] hover:border-[#ffcc00] transition-all duration-300 bg-[#050505] ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Top Bar */}
      <div className="h-8 border-b border-[#1a1a1a] bg-[#0a0a0a] flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#ffcc00] rounded-full animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          {imageCount > 1 && (
            <div className="flex items-center gap-1 text-[#ffcc00]/70">
              <Images size={12} />
              <span className="text-[9px] font-mono">{imageCount}</span>
            </div>
          )}
          {isOwner && (
            <>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onAddImage?.(skin);
                }}
                className="text-[#333] hover:text-[#ffcc00] transition-colors mr-2"
                title="Add Images"
              >
                <ImagePlus size={12} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(skin.id);
                }}
                className="text-[#333] hover:text-red-500 transition-colors"
                title="Purge Record"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Image Container */}
      <div className="aspect-video relative overflow-hidden bg-[#050505]">
        <img 
          src={skin.imageUrl} 
          alt={`Design by ${skin.characterName}`}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent opacity-60" />
        
        {/* Overlay Info */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={`https://images.evetech.net/characters/${skin.characterId}/portrait?size=64`}
                alt={skin.characterName} 
                className="w-10 h-10 border border-[#ffcc00] grayscale group-hover:grayscale-0 transition-all"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 bg-[#ffcc00]" />
            </div>
            <div>
              <p className="text-[#ffcc00] font-mono text-xs font-bold uppercase tracking-tighter">{skin.characterName}</p>
              <p className="text-[9px] text-[#666666] font-mono uppercase truncate max-w-[120px]">
                Character_ID: {skin.characterId}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats / Metadata Grid */}
      <div className="grid grid-cols-2 border-t border-[#1a1a1a]">
        <div className="p-3 border-r border-[#1a1a1a] space-y-1">
          <span className="text-[8px] text-[#444] uppercase font-mono block">Timestamp</span>
          <span className="text-[10px] text-[#888] font-mono block">
            {format(date, 'yyyy.MM.dd HH:mm')}
          </span>
        </div>
        <div className="p-3 space-y-1">
          <span className="text-[8px] text-[#444] uppercase font-mono block">Status</span>
          <span className="text-[10px] text-green-500/70 font-mono block uppercase tracking-tighter">
            Verified_Sync
          </span>
        </div>
      </div>

      {/* Action Links */}
      <div className="p-3 bg-[#0a0a0a] flex items-center justify-between border-t border-[#1a1a1a]">
        <div className="flex gap-4">
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
        <div className="w-2 h-2 border border-[#1a1a1a] group-hover:border-[#ffcc00] transition-colors" />
      </div>
    </div>
  );
};
