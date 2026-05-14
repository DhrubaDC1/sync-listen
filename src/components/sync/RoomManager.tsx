import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Users, Link as LinkIcon, Radio, LogIn } from 'lucide-react';
import { cn, generateRoomId } from '../../lib/utils';

interface RoomManagerProps {
  peerId: string | null;
  connectedRoom: string | null;
  onHost: (id: string) => void;
  onJoin: (id: string) => void;
}

export const RoomManager: React.FC<RoomManagerProps> = ({
  peerId,
  connectedRoom,
  onHost,
  onJoin,
}) => {
  const [joinId, setJoinId] = useState('');
  const [copied, setCopied] = useState(false);

  const roomLink = peerId ? `${window.location.origin}?room=${peerId}` : '';

  const copyToClipboard = () => {
    if (!peerId) return;
    navigator.clipboard.writeText(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (connectedRoom) {
    return (
      <div className="bg-[#151619] border border-white/5 p-4 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest">Connected to Room</span>
            <span className="text-sm font-mono text-white">{connectedRoom}</span>
          </div>
        </div>
        <button 
          onClick={copyToClipboard}
          className="p-2 text-[#8E9299] hover:text-white transition-colors"
        >
          {copied ? <div className="text-[10px] font-mono">COPIED</div> : <Copy size={16} />}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Host Card */}
        <div className="bg-[#151619] border border-white/5 p-6 rounded-xl space-y-4 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2 text-white">
            <Radio size={20} className="text-red-500" />
            <h3 className="font-medium tracking-tight">Host a Session</h3>
          </div>
          <p className="text-sm text-[#8E9299]">Create a room and share the ID with your friends to listen together.</p>
          <button 
            onClick={() => onHost(peerId || '')}
            disabled={!peerId}
            className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Create Room
          </button>
        </div>

        {/* Join Card */}
        <div className="bg-[#151619] border border-white/5 p-6 rounded-xl space-y-4 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2 text-white">
            <LogIn size={20} className="text-blue-500" />
            <h3 className="font-medium tracking-tight">Join a Session</h3>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="ENTER ROOM ID"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value.toUpperCase())}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-white/30"
            />
            <button 
              onClick={() => onJoin(joinId)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/5"
            >
              Join
            </button>
          </div>
          <p className="text-[10px] font-mono text-[#8E9299]">Paste the Room ID or the full invite link.</p>
        </div>
      </div>

      {peerId && (
        <div className="flex flex-col items-center gap-4 py-8 border-t border-white/5">
          <div className="p-4 bg-white rounded-xl shadow-2xl">
            <QRCodeSVG value={roomLink} size={128} />
          </div>
          <div className="text-center">
            <div className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest mb-1">Your Device ID</div>
            <div className="text-xl font-mono text-white tracking-widest">{peerId}</div>
          </div>
        </div>
      )}
    </div>
  );
};
