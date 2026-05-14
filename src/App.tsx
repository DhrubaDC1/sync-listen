import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music2, Youtube, Share2, Info, Github, ExternalLink } from 'lucide-react';
import { usePeer } from './hooks/usePeer';
import { AudioPlayer } from './components/player/AudioPlayer';
import { YouTubePlayer } from './components/player/YouTubePlayer';
import { RoomManager } from './components/sync/RoomManager';
import { PlayerState, SyncMessage } from './types';
import { cn } from './lib/utils';

export default function App() {
  const [playerState, setPlayerState] = useState<PlayerState>({
    playing: false,
    currentTime: 0,
    duration: 0,
    source: '',
    sourceType: 'AUDIO',
  });
  
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [ytUrl, setYtUrl] = useState('');
  
  const playerStateRef = useRef(playerState);
  useEffect(() => {
    playerStateRef.current = playerState;
  }, [playerState]);

  const broadcastRef = useRef<((msg: SyncMessage) => void) | null>(null);

  // Handle incoming P2P messages
  const onMessage = useCallback((msg: SyncMessage) => {
    switch (msg.type) {
      case 'PLAY':
        setPlayerState(prev => ({ ...prev, playing: true, currentTime: msg.time }));
        break;
      case 'PAUSE':
        setPlayerState(prev => ({ ...prev, playing: false, currentTime: msg.time }));
        break;
      case 'SEEK':
        setPlayerState(prev => ({ ...prev, currentTime: msg.time }));
        break;
      case 'SOURCE':
        setPlayerState(prev => ({ ...prev, source: msg.source, sourceType: msg.sourceType }));
        break;
      case 'STATE_REQUEST':
        // Host sends current state to new peer
        if (broadcastRef.current) {
          broadcastRef.current({
            type: 'STATE_SYNC',
            time: playerStateRef.current.currentTime,
            playing: playerStateRef.current.playing,
            source: playerStateRef.current.source,
            sourceType: playerStateRef.current.sourceType,
            timestamp: Date.now()
          });
        }
        break;
      case 'STATE_SYNC':
        // Client updates to match host
        setPlayerState(prev => ({
          ...prev,
          playing: msg.playing,
          currentTime: msg.time,
          source: msg.source,
          sourceType: msg.sourceType
        }));
        break;
    }
  }, []);

  const { 
    peerId, 
    isHost, 
    connectedRoom, 
    error, 
    startHosting, 
    joinRoom, 
    broadcast,
    clearError 
  } = usePeer(onMessage);

  useEffect(() => {
    broadcastRef.current = broadcast;
  }, [broadcast]);

  // Sync state broadcast (for Host)
  const syncPlayerLocalState = (newState: Partial<PlayerState>) => {
    if (!isHost) return;

    setPlayerState(prev => {
      const next = { ...prev, ...newState };
      
      if (newState.playing !== undefined && newState.playing !== prev.playing) {
        broadcast({ 
          type: newState.playing ? 'PLAY' : 'PAUSE', 
          time: next.currentTime, 
          timestamp: Date.now() 
        });
      } else if (newState.currentTime !== undefined && Math.abs(newState.currentTime - prev.currentTime) > 2) {
        broadcast({ 
          type: 'SEEK', 
          time: next.currentTime, 
          timestamp: Date.now() 
        });
      }

      if (newState.source !== undefined) {
        broadcast({
          type: 'SOURCE',
          source: next.source,
          sourceType: next.sourceType
        });
      }

      return next;
    });
  };

  // Auto-join if room in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && peerId && !connectedRoom) {
      joinRoom(room);
    }
  }, [peerId, joinRoom, connectedRoom]);

  const handleYtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytUrl) return;
    const source = ytUrl;
    setPlayerState(prev => ({ ...prev, source, sourceType: 'YOUTUBE' }));
    if (isHost) {
      broadcast({ type: 'SOURCE', source, sourceType: 'YOUTUBE' });
    }
  };

  return (
    <div className="min-h-screen bg-[#000] text-white selection:bg-white/20 selection:text-white font-sans overflow-x-hidden">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-red-500/20 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-16 space-y-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white text-black rounded-lg">
                <Music2 size={24} />
              </div>
              <h1 className="text-4xl font-bold tracking-tighter">SyncListen</h1>
            </div>
            <p className="text-[#8E9299] max-w-md text-sm leading-relaxed">
              Real-time serverless music sync. Perfect for remote listening parties or shared workspaces on the same network.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             <RoomManager 
                peerId={peerId}
                connectedRoom={connectedRoom}
                onHost={startHosting}
                onJoin={joinRoom}
             />
          </div>
        </header>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex justify-between items-center"
            >
              <div className="text-red-500 text-sm font-mono flex items-center gap-2">
                <Info size={16} /> {error}
              </div>
              <button onClick={clearError} className="text-white opacity-50 hover:opacity-100">&times;</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Interface */}
        <main className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Controls Sidebar */}
          <section className="md:col-span-1 space-y-8">
            <div className="bg-[#151619] border border-white/5 rounded-xl p-6 space-y-6">
              <div className="space-y-4">
                <h2 className="text-[10px] font-mono uppercase tracking-widest text-[#8E9299]">Select Source</h2>
                
                {/* Local File */}
                <label className="block p-4 border border-dashed border-white/10 rounded-lg hover:border-white/20 transition-all cursor-pointer group">
                  <input 
                    type="file" 
                    accept="audio/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLocalFile(file);
                        setPlayerState(prev => ({ ...prev, source: file.name, sourceType: 'AUDIO' }));
                        if (isHost) broadcast({ type: 'SOURCE', source: file.name, sourceType: 'AUDIO' });
                      }
                    }}
                  />
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded group-hover:bg-white/10 transition-colors">
                      <Music2 size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Local Audio</div>
                      <div className="text-[10px] font-mono text-[#8E9299] truncate w-32">
                        {localFile ? localFile.name : 'Choose File'}
                      </div>
                    </div>
                  </div>
                </label>

                {/* YouTube */}
                <form onSubmit={handleYtSubmit} className="space-y-2">
                  <div className="flex items-center gap-3 p-4 border border-white/5 rounded-lg bg-black/20 focus-within:border-white/20 transition-all">
                    <Youtube size={18} className="text-[#8E9299]" />
                    <input 
                      type="text" 
                      placeholder="YouTube URL" 
                      value={ytUrl}
                      onChange={(e) => setYtUrl(e.target.value)}
                      className="bg-transparent text-sm w-full outline-none"
                    />
                  </div>
                  <button type="submit" className="w-full py-2 bg-white/5 text-[10px] font-mono uppercase tracking-widest rounded hover:bg-white/10 transition-all">
                    Load Video
                  </button>
                </form>
              </div>

              {/* Status Info */}
              <div className="pt-6 border-t border-white/5 space-y-4">
                <h2 className="text-[10px] font-mono uppercase tracking-widest text-[#8E9299]">Session Info</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-[#8E9299]">Role</span>
                    <span className={cn(isHost ? "text-red-400" : "text-blue-400")}>
                      {connectedRoom ? (isHost ? 'HOST' : 'GUEST') : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-[#8E9299]">Peers</span>
                    <span>{isHost ? connectedRoom ? 1 : 0 : connectedRoom ? 1 : 0} Connected</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Player Main Area */}
          <section className="md:col-span-2 space-y-8">
             <AnimatePresence mode="wait">
                {playerState.sourceType === 'YOUTUBE' && playerState.source ? (
                  <motion.div 
                    key="yt"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                  >
                    <YouTubePlayer 
                      source={playerState.source}
                      isHost={isHost}
                      playing={playerState.playing}
                      currentTime={playerState.currentTime}
                      onStateChange={syncPlayerLocalState}
                    />
                  </motion.div>
                ) : (
                  <motion.div 
                    key="audio"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                  >
                    {localFile ? (
                      <AudioPlayer 
                        file={localFile}
                        isHost={isHost}
                        playing={playerState.playing}
                        currentTime={playerState.currentTime}
                        onStateChange={syncPlayerLocalState}
                      />
                    ) : (
                      <div className="bg-[#151619] border border-dashed border-white/10 aspect-video rounded-xl flex flex-col items-center justify-center space-y-4 text-[#8E9299]">
                        <Music2 size={48} strokeWidth={1} className="opacity-20" />
                        <p className="text-xs font-mono tracking-widest">Awaiting Audio Source</p>
                      </div>
                    )}
                  </motion.div>
                )}
             </AnimatePresence>

             {/* Footer Info */}
             <div className="flex items-center justify-between pt-12 border-t border-white/5 opacity-40">
                <div className="flex items-center gap-6">
                  <a href="#" className="hover:text-white transition-colors"><Github size={18} /></a>
                  <a href="#" className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest hover:text-white transition-colors">
                    Documentation <ExternalLink size={12} />
                  </a>
                </div>
                <div className="text-[10px] font-mono">v1.0.0-BETA</div>
             </div>
          </section>
        </main>
      </div>

      {/* Action Overlay for Guest joining via URL */}
       {!connectedRoom && !isHost && window.location.search.includes('room') && (
         <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-3 shadow-2xl animate-bounce">
           <Share2 size={18} /> Click to Join Session
         </div>
       )}
    </div>
  );
}
