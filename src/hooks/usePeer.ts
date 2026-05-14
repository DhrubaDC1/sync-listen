import { useEffect, useRef, useState, useCallback } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { SyncMessage, PlayerState } from '../types';

export function usePeer(onMessage: (msg: SyncMessage) => void) {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [connectedRoom, setConnectedRoom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);
  
  const peerRef = useRef<Peer | null>(null);

  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const initPeer = useCallback(() => {
    if (peerRef.current && !peerRef.current.destroyed) return peerRef.current;

    const peer = new Peer({
      debug: 1 // Only errors
    });
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      setIsSignalingConnected(true);
      setError(null);
    });

    peer.on('disconnected', () => {
      setIsSignalingConnected(false);
      // Attempt to reconnect to server
      peer.reconnect();
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      if (err.type === 'peer-unavailable') {
        setError('Room not found.');
      } else if (err.type === 'disconnected') {
        setIsSignalingConnected(false);
        setError('Lost connection to signaling server. Attempting to reconnect...');
        peer.reconnect();
      } else {
        setError(`Connection error: ${err.type}`);
      }
    });

    // Handle incoming connections if we are hosting
    peer.on('connection', (conn) => {
      setConnections(prev => [...prev, conn]);
      
      conn.on('data', (data) => {
        try {
          onMessageRef.current(data as SyncMessage);
        } catch (e) {
          console.error('Error handling incoming data:', e);
        }
      });

      conn.on('close', () => {
        setConnections(prev => prev.filter(c => c.peer !== conn.peer));
      });
      
      conn.on('error', (err) => {
        console.error('Connection error:', err);
        setConnections(prev => prev.filter(c => c.peer !== conn.peer));
      });
    });

    return peer;
  }, []);

  useEffect(() => {
    const peer = initPeer();
    return () => {
      if (peer) {
        try {
          peer.destroy();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [initPeer]);

  // Host: Start hosting session
  const startHosting = useCallback((id: string) => {
    setIsHost(true);
    setConnectedRoom(id);
  }, []);

  // Guest: Connect to host
  const joinRoom = useCallback((hostId: string) => {
    if (!peerRef.current || peerRef.current.destroyed) {
      setError('Peer network not initialized.');
      return;
    }
    
    setIsHost(false);
    
    const conn = peerRef.current.connect(hostId, {
      reliable: true
    });
    setConnectedRoom(hostId);

    conn.on('open', () => {
      setConnections([conn]);
      try {
        conn.send({ type: 'STATE_REQUEST' });
      } catch (e) {
        console.error('Failed to send initial state request:', e);
      }
    });

    conn.on('data', (data) => {
      try {
        onMessageRef.current(data as SyncMessage);
      } catch (e) {
        console.error('Error handling guest data:', e);
      }
    });

    conn.on('close', () => {
      setConnections([]);
      setConnectedRoom(null);
      setError('Disconnected from host.');
    });

    conn.on('error', (err) => {
      console.error('Connection error with host:', err);
      setError('Could not connect to host.');
      setConnectedRoom(null);
    });
  }, [onMessage]);

  // Broadcast message to all connected peers
  const broadcast = useCallback((msg: SyncMessage) => {
    setConnections(prev => {
      prev.forEach(conn => {
        if (conn.open) {
          try {
            conn.send(msg);
          } catch (e) {
            console.error('Broadcast failed for peer:', conn.peer, e);
          }
        }
      });
      return prev;
    });
  }, []);

  return {
    peerId,
    isHost,
    connections,
    connectedRoom,
    error,
    isSignalingConnected,
    startHosting,
    joinRoom,
    broadcast,
    clearError: () => setError(null),
    reconnect: () => peerRef.current?.reconnect()
  };
}
