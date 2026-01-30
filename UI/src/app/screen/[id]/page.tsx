"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface MediaData {
    type: string;
    media_path: string;
    max_duration: string;
    volume: number;
    screen: string;
    action_id: string;
    skip_on_next_action: boolean;
    show_user_info: boolean;
    display_text: string;
}

export default function ScreenPage() {
    const params = useParams();
    const screenId = params.id as string;
    const [currentMedia, setCurrentMedia] = useState<MediaData | null>(null);
    const [queue, setQueue] = useState<MediaData[]>([]);
    const [isExiting, setIsExiting] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const startNextMedia = useCallback((nextItem: MediaData) => {
        setIsExiting(false);
        setCurrentMedia(nextItem);
    }, []);

    const handleMediaEnd = useCallback(() => {
        setIsExiting(true);

        // Clear any existing exit timeout
        if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);

        exitTimeoutRef.current = setTimeout(() => {
            setQueue((prev) => {
                if (prev.length > 0) {
                    const next = prev[0];
                    startNextMedia(next);
                    return prev.slice(1);
                } else {
                    setCurrentMedia(null);
                    setIsExiting(false);
                    return [];
                }
            });
        }, 800); // Matches animate-fade-out duration
    }, [startNextMedia]);

    // Polling Logic
    useEffect(() => {
        const pollData = async () => {
            try {
                const response = await fetch(`http://localhost:3000/data/${screenId}`);
                const data = await response.json();

                if (data && !data.error) {
                    // Critical logic: If skip_on_next_action is true, interrupt IMMEDIATELY
                    if (data.skip_on_next_action) {
                        if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
                        setCurrentMedia(null); // Force reset to re-trigger pop-in
                        setTimeout(() => startNextMedia(data), 10);
                        return;
                    }

                    // Otherwise, handle normal flow
                    if (!currentMedia || isExiting) {
                        startNextMedia(data);
                    } else {
                        setQueue((prev) => [...prev, data]);
                    }
                }
            } catch (err) {
                // Silent error
            }
        };

        const interval = setInterval(pollData, 1000);
        return () => clearInterval(interval);
    }, [screenId, currentMedia, isExiting, startNextMedia]);

    // Duration limit / End detection
    useEffect(() => {
        if (!currentMedia || isExiting) return;

        let timer: NodeJS.Timeout;
        const duration = parseFloat(currentMedia.max_duration);

        if (currentMedia.type === "image" || currentMedia.type === "none") {
            const seconds = duration || 5;
            timer = setTimeout(() => handleMediaEnd(), seconds * 1000);
        } else if (currentMedia.type === "video" && !isNaN(duration) && duration > 0) {
            timer = setTimeout(() => handleMediaEnd(), duration * 1000);
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [currentMedia, isExiting, handleMediaEnd]);

    // Video Audio/Playback Sync
    useEffect(() => {
        if (currentMedia && videoRef.current && !isExiting) {
            videoRef.current.volume = currentMedia.volume ?? 0.5;
            videoRef.current.play().catch(() => { });
        }
    }, [currentMedia, isExiting]);

    if (!currentMedia) {
        return <div className="h-screen w-screen bg-transparent" />;
    }

    return (
        <div className={cn(
            "relative h-screen w-screen overflow-hidden bg-transparent transition-all",
            isExiting ? "animate-fade-out" : "animate-pop-in"
        )}>
            {currentMedia.type === "video" && (
                <video
                    ref={videoRef}
                    src={currentMedia.media_path}
                    className="h-full w-full object-cover"
                    onEnded={handleMediaEnd}
                    autoPlay
                    muted={false}
                />
            )}

            {currentMedia.type === "image" && (
                <img
                    src={currentMedia.media_path}
                    className="h-full w-full object-contain drop-shadow-[0_0_80px_rgba(0,0,0,0.8)]"
                    alt="Media"
                />
            )}

            {currentMedia.show_user_info && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center space-y-8">
                    <div className="tiktok-gradient h-32 w-32 rounded-full flex items-center justify-center text-white text-5xl font-black shadow-[0_0_50px_rgba(255,0,80,0.5)] border-4 border-white/20 animate-pop-in">
                        {currentMedia.display_text ? currentMedia.display_text[0] : "L"}
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-6xl font-black text-white text-glow italic uppercase tracking-tighter">
                            {currentMedia.display_text || "LIVE EVENT"}
                        </h2>
                        <div className="inline-block px-4 py-1 rounded-full bg-secondary/20 border border-secondary/30">
                            <p className="text-secondary font-black text-xs tracking-[0.4em] uppercase">Interaction Received</p>
                        </div>
                    </div>
                </div>
            )}

            {currentMedia.display_text && !currentMedia.show_user_info && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full">
                    <h1 className="text-9xl font-black text-white text-glow uppercase tracking-tighter italic drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)]">
                        {currentMedia.display_text}
                    </h1>
                </div>
            )}
        </div>
    );
}
