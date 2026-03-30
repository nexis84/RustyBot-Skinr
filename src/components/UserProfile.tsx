import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { SkinCard } from './SkinCard';
import { Search, ArrowLeft, User, Loader2, ExternalLink } from 'lucide-react';

interface UserProfileProps {
  characterId?: string;
  onBack?: () => void;
  onSkinClick?: (skin: any) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ characterId, onBack, onSkinClick }) => {
  const [skins, setSkins] = useState<any[]>([]);
  const [character, setCharacter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSkin, setSelectedSkin] = useState<any>(null);

  useEffect(() => {
    if (characterId) {
      fetchProfile();
    }
  }, [characterId]);

  const fetchProfile = async () => {
    try {
      console.log('Fetching profile for characterId:', characterId);
      const response = await fetch(`/api/skins/character/${characterId}`);
      console.log('Profile response status:', response.status, 'ok:', response.ok);
      if (response.ok) {
        const data = await response.json();
        console.log('Profile data received:', data);
        setSkins(data.skins);
        setCharacter(data.character);
        console.log('Character set to:', data.character);
      } else {
        console.error('Profile response not ok:', response.statusText);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyProfileLink = () => {
    const url = `${window.location.origin}/pilot/${characterId}`;
    navigator.clipboard.writeText(url);
    alert('Profile link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#ffcc00]" size={40} />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="text-center py-20">
        <p className="text-[#666666] font-mono text-xs uppercase tracking-widest">Pilot_Not_Found</p>
        {onBack && (
          <button 
            onClick={onBack}
            className="mt-4 text-[#ffcc00] hover:underline font-mono text-[10px] uppercase tracking-widest"
          >
            [ Return_To_Gallery ]
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Profile Header */}
      <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-2 border border-[#1a1a1a] hover:border-[#ffcc00] text-[#666666] hover:text-[#ffcc00] transition-all"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            
            <div className="flex items-center gap-4">
              <img 
                src={`https://images.evetech.net/characters/${character.characterId}/portrait?size=128`}
                alt={character.characterName}
                className="w-20 h-20 border-2 border-[#ffcc00]"
                referrerPolicy="no-referrer"
              />
              <div>
                <h2 className="text-[#ffcc00] text-2xl font-mono uppercase tracking-tight">
                  {character.characterName}
                </h2>
                <p className="text-[#666666] text-[10px] font-mono uppercase tracking-widest mt-1">
                  Character_ID: {character.characterId}
                </p>
                <p className="text-[#444] text-[10px] font-mono uppercase tracking-widest mt-2">
                  Total_Skins: <span className="text-[#ffcc00]">{skins.length.toString().padStart(2, '0')}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <button
              onClick={handleCopyProfileLink}
              className="px-4 py-2 border border-[#1a1a1a] hover:border-[#ffcc00] text-[#666666] hover:text-[#ffcc00] font-mono text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <ExternalLink size={12} />
              Share_Profile
            </button>
            
            <div className="flex gap-2">
              <a 
                href={`https://zkillboard.com/character/${character.characterId}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-mono text-[#444] hover:text-[#ffcc00] transition-colors uppercase"
              >
                [ zKill ]
              </a>
              <a 
                href={`https://evewho.com/character/${character.characterId}`}
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

      {/* Skins Grid */}
      {skins.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#1a1a1a]">
          <p className="text-[#666666] font-mono text-xs uppercase tracking-widest">No_Skins_Found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skins.map(skin => (
            <div key={skin.id}>
              <SkinCard 
                skin={skin} 
                isOwner={false}
                onClick={onSkinClick}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface UserSearchProps {
  onSelectUser: (characterId: string) => void;
}

export const UserSearch: React.FC<UserSearchProps> = ({ onSelectUser }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length >= 2) {
      searchUsers();
    } else {
      setResults([]);
    }
  }, [query]);

  const searchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.users);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 border border-[#1a1a1a] bg-[#0a0a0a] px-4">
        <Search size={16} className="text-[#444]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search_Pilot_By_Name..."
          className="w-full bg-transparent py-3 text-sm font-mono text-[#ffcc00] placeholder:text-[#333] focus:outline-none"
        />
        {loading && <Loader2 size={14} className="animate-spin text-[#ffcc00]" />}
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 border border-[#1a1a1a] bg-[#0a0a0a] max-h-64 overflow-y-auto z-50">
          {results.map((user) => (
            <button
              key={user.characterId}
              onClick={() => {
                onSelectUser(user.characterId.toString());
                setQuery('');
                setResults([]);
              }}
              className="w-full flex items-center gap-3 p-3 hover:bg-[#1a1a1a] transition-colors border-b border-[#1a1a1a] last:border-0"
            >
              <img 
                src={`https://images.evetech.net/characters/${user.characterId}/portrait?size=64`}
                alt={user.characterName}
                className="w-10 h-10 border border-[#ffcc00]/30"
                referrerPolicy="no-referrer"
              />
              <div className="text-left flex-1">
                <p className="text-[#ffcc00] font-mono text-xs uppercase">{user.characterName}</p>
                <p className="text-[#444] text-[9px] font-mono uppercase mt-0.5">
                  {user.skinCount} {user.skinCount === 1 ? 'Skin' : 'Skins'}
                </p>
              </div>
              <User size={14} className="text-[#333]" />
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 border border-[#1a1a1a] bg-[#0a0a0a] p-3 z-50">
          <p className="text-[#444] font-mono text-[10px] uppercase text-center">No_Pilots_Found</p>
        </div>
      )}
    </div>
  );
};
