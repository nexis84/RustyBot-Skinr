import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SkinCard } from './components/SkinCard';
import SkinUpload from './components/SkinUpload';
import { LayoutGrid, Plus, LogIn, LogOut, Shield, Info, Loader2, ExternalLink, User as UserIcon, Trash2, AlertTriangle, X } from 'lucide-react';
import { ImageModal } from './components/ImageModal';
import { UserProfile, UserSearch } from './components/UserProfile';
import { AddImageModal } from './components/AddImageModal';

interface UserProfile {
  characterName: string;
  characterId: number;
  characterPortrait: string;
  uid: string;
  createdAt: any;
}

export default function App() {
  const [user, setUser] = useState<any>(null); // Represents the EVE character session
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [skins, setSkins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isEveAuthLoading, setIsEveAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkin, setSelectedSkin] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const [addImageSkin, setAddImageSkin] = useState<any>(null);
  const [isAddImageModalOpen, setIsAddImageModalOpen] = useState(false);

  // Fetch skins from API
  const fetchSkins = async () => {
    try {
      const response = await fetch('/api/skins', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSkins(data);
      }
    } catch (err) {
      console.error('Error fetching skins:', err);
    }
  };

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const { character } = await response.json();
          if (character) {
            setUser(character);
            setUserProfile({
              characterName: character.name,
              characterId: parseInt(character.id),
              characterPortrait: character.portraitUrl,
              uid: `eve_${character.id}`,
              createdAt: new Date()
            });
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
    fetchSkins();

    // Listen for EVE SSO success message
    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      // Allow postMessage from Render domain and localhost
      if (
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost') &&
        !origin.includes('render.com')
      ) return;

      if (event.data?.type === 'EVE_AUTH_SUCCESS') {
        const { character } = event.data;
        setUser(character);
        setUserProfile({
          characterName: character.name,
          characterId: parseInt(character.id),
          characterPortrait: character.portraitUrl,
          uid: `eve_${character.id}`,
          createdAt: new Date()
        });
        fetchSkins();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleEveLogin = async () => {
    setIsEveAuthLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/eve/url?origin=${encodeURIComponent(window.location.origin)}`, { credentials: 'include' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get auth URL');
      }
      const { url } = await response.json();

      const authWindow = window.open(url, 'eve_sso_popup', 'width=600,height=700');
      if (!authWindow) setError('Popup blocked. Please allow popups.');
    } catch (err: any) {
      setError(err.message || 'EVE SSO initialization failed.');
    } finally {
      setIsEveAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      setUser(null);
      setUserProfile(null);
      setShowUpload(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleUpload = async (data: any) => {
    setIsUploading(true);
    try {
      const response = await fetch('/api/skins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Upload failed');
      }

      await fetchSkins();
      setShowUpload(false);
    } catch (err: any) {
      console.error('Upload error:', err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkinClick = (skin: any) => {
    setSelectedSkin(skin);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSkin(null);
  };

  const handleAddImageClick = (skin: any) => {
    setAddImageSkin(skin);
    setIsAddImageModalOpen(true);
  };

  const handleCloseAddImageModal = () => {
    setIsAddImageModalOpen(false);
    setAddImageSkin(null);
  };

  const handleAddImage = async (skinId: string, imageUrl: string) => {
    const response = await fetch(`/api/skins/${skinId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to add image');
    }
    
    await fetchSkins();
  };

  const handleSetMainImage = async (skinId: string, imageIndex: number) => {
    const response = await fetch(`/api/skins/${skinId}/set-main-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageIndex }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to set main image');
    }
    
    // Refresh skins to get updated data
    await fetchSkins();
    
    // Update selected skin with new data
    const updatedSkin = await response.json();
    setSelectedSkin(updatedSkin);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to purge this record?')) return;
    
    try {
      const response = await fetch(`/api/skins/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Delete failed');
      }
      await fetchSkins();
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#ffcc00]" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] bg-grid text-[#eeeeee] font-sans selection:bg-[#ffcc00] selection:text-black">
      {/* Header / Control Panel */}
      <header className="border-b border-[#1a1a1a] bg-[#050505]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="relative">
              <img 
                src="https://www.rustybot.co.uk/logo.png" 
                alt="Rusty Bot"
                className="w-12 h-12 object-contain"
              />
            </div>
            <div>
              <h1 className="header-rusty text-2xl leading-none">SKINR_GALLERY</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 rounded-full bg-[#ffcc00] animate-pulse" />
                <p className="text-[10px] text-[#666666] uppercase tracking-[0.2em] font-mono">System Status: Operational</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-1 max-w-xl mx-8">
            <UserSearch onSelectUser={(charId) => setViewingProfile(charId)} />
          </div>

          <div className="flex items-center gap-4">
            {user && userProfile ? (
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-[#666666] uppercase font-mono">Authorized_User</span>
                  <span className="text-xs font-mono text-[#ffcc00]">{userProfile.characterName.toUpperCase().replace(/ /g, '_')}</span>
                </div>
                <button 
                  onClick={() => setShowUpload(!showUpload)}
                  className={`
                    h-12 px-6 border font-mono text-xs uppercase tracking-widest transition-all flex items-center gap-2
                    ${showUpload 
                      ? 'bg-[#ffcc00] text-black border-[#ffcc00]' 
                      : 'bg-transparent text-[#ffcc00] border-[#1a1a1a] hover:border-[#ffcc00]'}
                  `}
                >
                  {showUpload ? <LayoutGrid size={14} /> : <Plus size={14} />}
                  {showUpload ? 'View_Database' : 'New_Submission'}
                </button>
                <div className="relative group">
                  <div className="h-12 px-4 border border-[#1a1a1a] font-mono text-xs uppercase tracking-widest transition-all flex items-center gap-3 text-[#666666] hover:border-[#333] hover:text-[#ffcc00] cursor-pointer">
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] opacity-50">Pilot_ID</span>
                      <span className="text-[10px] font-bold">{userProfile.characterName.toUpperCase().replace(/ /g, '_')}</span>
                    </div>
                    <img 
                      src={userProfile.characterPortrait} 
                      alt="Pilot" 
                      className="w-8 h-8 border border-[#ffcc00]/30 grayscale group-hover:grayscale-0 transition-all" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  {/* Dropdown */}
                  <div className="absolute right-0 mt-2 w-56 bg-[#0a0a0a] border border-[#1a1a1a] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <div className="p-3 border-b border-[#1a1a1a] bg-[#050505]">
                      <p className="text-[9px] font-mono text-[#444] uppercase tracking-widest mb-1">Authenticated_As</p>
                      <p className="text-[10px] font-mono text-[#ffcc00] truncate">{userProfile.characterName}</p>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-[#888] hover:bg-[#ffcc00] hover:text-black transition-all font-mono text-[10px] uppercase tracking-widest"
                    >
                      <LogOut size={14} />
                      Terminate_Session
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleEveLogin}
                disabled={isEveAuthLoading}
                className="h-12 px-8 bg-transparent border border-[#ffcc00] text-[#ffcc00] font-mono text-xs uppercase tracking-widest hover:bg-[#ffcc00] hover:text-black transition-all flex items-center gap-2"
              >
                {isEveAuthLoading ? <Loader2 className="animate-spin" size={14} /> : <LogIn size={14} />}
                Initialize_Session
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {error && (
          <div className="mb-10 p-4 bg-red-900/10 border border-red-500/50 text-red-500 font-mono text-xs uppercase tracking-widest flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={16} />
              <p>Critical_Error: {error}</p>
            </div>
            <button onClick={() => setError(null)} className="underline">Dismiss</button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {viewingProfile ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <UserProfile 
                characterId={viewingProfile}
                onBack={() => setViewingProfile(null)}
                onSkinClick={handleSkinClick}
              />
            </motion.div>
          ) : !user ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto mt-20"
            >
              <div className="bg-[#050505] border border-[#1a1a1a] p-12 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ffcc00] to-transparent opacity-20" />
                
                <div className="w-20 h-20 border border-[#ffcc00] flex items-center justify-center text-[#ffcc00] mx-auto mb-8 crt-flicker">
                  <Shield size={40} />
                </div>
                
                <h1 className="header-rusty text-2xl mb-4">TERMINAL_ACCESS</h1>
                <p className="text-[#666666] text-[10px] font-mono uppercase tracking-[0.3em] mb-12 leading-relaxed">
                  Authorized_Personnel_Only<br/>
                  Identity_Verification_Required
                </p>

                <div className="space-y-4">
                  <button
                    onClick={handleEveLogin}
                    disabled={isEveAuthLoading}
                    className="w-full h-16 bg-[#ffcc00] text-black font-mono text-xs uppercase tracking-[0.4em] hover:bg-[#ffcc00]/80 transition-all flex items-center justify-center gap-4 group"
                  >
                    {isEveAuthLoading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <ExternalLink size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        Login_With_EVE_SSO
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-8 flex justify-center gap-2">
                  <div className="w-1 h-1 bg-[#ffcc00]/10" />
                  <div className="w-1 h-1 bg-[#ffcc00]/20" />
                  <div className="w-1 h-1 bg-[#ffcc00]/30" />
                </div>
              </div>
            </motion.div>
          ) : !userProfile ? (
            <motion.div
              key="linking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-20"
            >
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-[#ffcc00]" size={40} />
                <p className="font-mono text-[10px] text-[#444] uppercase tracking-widest">Synchronizing_Identity...</p>
              </div>
            </motion.div>
          ) : showUpload ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto"
            >
              <SkinUpload 
                onUpload={handleUpload} 
                isUploading={isUploading} 
                userProfile={userProfile}
              />
            </motion.div>
          ) : (
            <motion.div
              key="gallery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-end justify-between mb-12 border-b border-[#1a1a1a] pb-6">
                <div>
                  <h2 className="header-rusty text-4xl">Archive_Data</h2>
                  <p className="text-[#666666] text-xs mt-2 font-mono uppercase tracking-widest">
                    Total_Entries: <span className="text-[#ffcc00]">{skins.length.toString().padStart(3, '0')}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 font-mono text-[10px] text-[#444]">
                  <div className="flex items-center gap-2">
                    <span>ESI_LINK</span>
                    <span className="w-2 h-2 bg-green-500/50 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span>DB_SYNC</span>
                    <span className="w-2 h-2 bg-green-500/50 rounded-full" />
                  </div>
                </div>
              </div>

              {skins.length === 0 ? (
                <div className="text-center py-32 border border-dashed border-[#1a1a1a] bg-[#0a0a0a]/50">
                  <LayoutGrid className="mx-auto mb-6 text-[#1a1a1a]" size={48} />
                  <p className="text-[#666666] font-mono text-xs uppercase tracking-widest">Database_Empty // No_Records_Found</p>
                  {!user && (
                    <button onClick={handleEveLogin} className="mt-6 text-[#ffcc00] hover:underline font-mono text-[10px] uppercase tracking-widest">
                      [ Authenticate_With_EVE_SSO ]
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#1a1a1a] border border-[#1a1a1a]">
                  {skins.map(skin => (
                    <div key={skin.id} className="bg-[#050505]">
                      <SkinCard 
                        skin={skin} 
                        isOwner={user?.id?.toString() === skin.characterId?.toString()}
                        onDelete={handleDelete}
                        onClick={handleSkinClick}
                        onAddImage={handleAddImageClick}
                      />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ImageModal
        skin={selectedSkin}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isOwner={user?.id?.toString() === selectedSkin?.characterId?.toString()}
        onSetMainImage={handleSetMainImage}
      />

      <AddImageModal
        skin={addImageSkin}
        isOpen={isAddImageModalOpen}
        onClose={handleCloseAddImageModal}
        onAddImage={handleAddImage}
      />

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] mt-24 py-12 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border border-[#ffcc00] flex items-center justify-center text-[#ffcc00] font-black text-[10px]">S</div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#666666]">SKINR_Terminal_v2.6.0</p>
            </div>
            <p className="text-[9px] text-[#333] uppercase leading-relaxed max-w-xs font-mono">
              All_Data_Encrypted // Unauthorized_Access_Prohibited // EVE_Online_Assets_Property_Of_CCP_Games
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-x-16 gap-y-4">
            <div className="space-y-2">
              <h4 className="font-mono text-[10px] text-[#444] uppercase tracking-widest">External_Links</h4>
              <ul className="space-y-1">
                <li><a href="https://www.eveonline.com" target="_blank" className="text-[10px] font-mono text-[#666666] hover:text-[#ffcc00] transition-colors">EVE_OFFICIAL</a></li>
                <li><a href="https://developers.eveonline.com" target="_blank" className="text-[10px] font-mono text-[#666666] hover:text-[#ffcc00] transition-colors">ESI_DOCUMENTATION</a></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-mono text-[10px] text-[#444] uppercase tracking-widest">System_Nodes</h4>
              <ul className="space-y-1">
                <li><span className="text-[10px] font-mono text-[#666666]">NODE_LONDON_01</span></li>
                <li><span className="text-[10px] font-mono text-[#666666]">SYNC_STABLE</span></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
