import React, { useEffect, useRef, useState } from 'react';
import { PlayerState } from '../../types';

interface YouTubePlayerProps {
  source: string;
  isHost: boolean;
  playing: boolean;
  currentTime: number;
  onStateChange: (state: Partial<PlayerState>) => void;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  source,
  isHost,
  playing,
  currentTime,
  onStateChange,
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Extract ID from URL
  const videoId = source.includes('v=') 
    ? source.split('v=')[1]?.split('&')[0] 
    : source.split('/').pop();

  useEffect(() => {
    let tag: HTMLScriptElement | null = null;
    let isUnmounted = false;

    const initPlayer = () => {
      if (isUnmounted || !containerRef.current || !window.YT || !window.YT.Player) return;
      
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying player:', e);
        }
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: isHost ? 1 : 0,
          disablekb: isHost ? 0 : 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            if (!isUnmounted) setIsReady(true);
          },
          onStateChange: (event: any) => {
            if (!isHost || isUnmounted) return;
            
            if (event.data === window.YT.PlayerState.PLAYING) {
              onStateChange({ playing: true, currentTime: playerRef.current.getCurrentTime() });
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              onStateChange({ playing: false, currentTime: playerRef.current.getCurrentTime() });
            }
          },
        },
      });
    };

    if (!window.YT) {
      tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      
      // Existing scripts check
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }

      const prevOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevOnReady) prevOnReady();
        if (!isUnmounted) initPlayer();
      };
    } else if (window.YT && window.YT.Player) {
      initPlayer();
    }

    return () => {
      isUnmounted = true;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors on unmount
        }
      }
    };
  }, [videoId, isHost]);

  // Sync external changes
  useEffect(() => {
    if (!isReady || !playerRef.current) return;

    const currentPlayerState = playerRef.current.getPlayerState();
    
    // Play/Pause
    if (playing && currentPlayerState !== window.YT.PlayerState.PLAYING) {
      playerRef.current.playVideo();
    } else if (!playing && currentPlayerState === window.YT.PlayerState.PLAYING) {
      playerRef.current.pauseVideo();
    }

    // Seek (with simple threshold to avoid loops)
    const diff = Math.abs(playerRef.current.getCurrentTime() - currentTime);
    if (diff > 2) {
      playerRef.current.seekTo(currentTime, true);
    }
  }, [playing, currentTime, isReady]);

  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
