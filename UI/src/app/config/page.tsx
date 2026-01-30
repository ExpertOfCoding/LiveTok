"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, Upload, Play, Settings, Gift, Coins, UserPlus, Volume2, Monitor, MessageSquare, ChevronRight, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActionConfig {
    screen: string;
    commands: string[];
    play_media: {
        type: string;
        media_path: string;
        max_duration: string;
        volume: number;
    };
    skip_on_next_action: boolean;
    show_user_info: boolean;
    display_text: string;
}

interface EventConfig {
    gift_name?: string;
    gift_id?: number;
    action_id: string[];
    enabled: boolean;
    min_coin?: number;
    max_coin?: number;
}

interface Config {
    port: number;
    tiktok_username: string;
    volume: number;
    max_chars_tts: number;
    max_comment_que_length: number;
    max_media_que_length: number;
    events: {
        specifiedGift: EventConfig[];
        coinCount: EventConfig[];
        textToSpeech: {
            enabled: boolean;
            type: string;
            voice: { type: string };
        };
        follow: EventConfig;
    };
    actions: Record<string, ActionConfig>;
}

export default function ConfigPage() {
    const [config, setConfig] = useState<Config | null>(null);
    const [activeTab, setActiveTab] = useState("actions");
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [uploading, setUploading] = useState(false);

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch("http://localhost:3000/config");
            const data = await res.json();
            setConfig(data);
        } catch (err) {
            console.error("Failed to fetch config", err);
            setStatus({ type: "error", message: "Failed to connect to backend." });
        }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const saveConfig = async () => {
        if (!config) return;
        try {
            const res = await fetch("http://localhost:3000/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            if (res.ok) {
                setStatus({ type: "success", message: "Configuration saved successfully!" });
                setTimeout(() => setStatus(null), 3000);
            }
        } catch (err) {
            setStatus({ type: "error", message: "Failed to save configuration." });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, actionId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        // Detect type from file
        const detectedType = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "none";

        try {
            const res = await fetch("http://localhost:3000/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (data.status === "success") {
                // Update both path and type
                updateAction(actionId, "play_media.media_path", data.url);
                if (detectedType !== "none") {
                    updateAction(actionId, "play_media.type", detectedType);
                }

                setStatus({ type: "success", message: `File uploaded as ${detectedType}!` });
            }
        } catch (err) {
            setStatus({ type: "error", message: "Upload failed." });
        } finally {
            setUploading(false);
        }
    };

    const updateAction = (id: string, path: string, value: any) => {
        if (!config) return;
        const newActions = { ...config.actions };
        const action = { ...newActions[id] };

        if (path.includes(".")) {
            const [parent, child] = path.split(".");
            const parentObj = (action as any)[parent] || {};
            (action as any)[parent] = { ...parentObj, [child]: value };
        } else {
            (action as any)[path] = value;
        }

        newActions[id] = action;
        setConfig({ ...config, actions: newActions });
    };

    const addAction = () => {
        if (!config) return;
        const id = (Object.keys(config.actions).length + 1).toString();
        const newActions = {
            ...config.actions,
            [id]: {
                screen: "1",
                commands: [],
                play_media: { type: "video", media_path: "", max_duration: "10s", volume: 0.5 },
                skip_on_next_action: true,
                show_user_info: true,
                display_text: "",
            },
        };
        setConfig({ ...config, actions: newActions });
    };

    const removeAction = (id: string) => {
        if (!config) return;
        const newActions = { ...config.actions };
        delete newActions[id];
        setConfig({ ...config, actions: newActions });
    };

    if (!config) return <div className="p-10 text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-8 font-outfit">
            <div className="max-w-6xl mx-auto">
                <header className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary uppercase italic tracking-tighter">
                            LiveTok Control Center
                        </h1>
                        <p className="text-zinc-500 mt-2">Manage your TikTok Live interactions and overlays.</p>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={fetchConfig} className="bg-zinc-900 border-zinc-800">
                            Reload
                        </Button>
                        <Button onClick={saveConfig} className="bg-primary hover:bg-primary/90 text-white font-bold px-8">
                            <Save className="w-4 h-4 mr-2" />
                            Save Config
                        </Button>
                    </div>
                </header>

                {status && (
                    <div className={cn(
                        "mb-8 p-4 rounded-xl border animate-slide-in flex items-center gap-3",
                        status.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-500"
                    )}>
                        {status.type === "success" ? <Check className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                        {status.message}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
                    <aside className="space-y-2">
                        {[
                            { id: "actions", label: "Actions", icon: Play },
                            { id: "gifts", label: "Gift Events", icon: Gift },
                            { id: "coins", label: "Coin Events", icon: Coins },
                            { id: "global", label: "Global Settings", icon: Settings },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-300 group",
                                    activeTab === tab.id
                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                        : "hover:bg-white/5 text-zinc-400"
                                )}
                            >
                                <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "" : "group-hover:text-zinc-200")} />
                                <span className="font-bold uppercase tracking-widest text-sm">{tab.label}</span>
                                <ChevronRight className={cn("ml-auto w-4 h-4 transition-transform", activeTab === tab.id ? "rotate-90" : "opacity-0 group-hover:opacity-100")} />
                            </button>
                        ))}
                    </aside>

                    <main className="glass rounded-3xl p-8 border border-white/5 shadow-2xl relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Settings className="w-32 h-32" />
                        </div>

                        {activeTab === "actions" && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold flex items-center gap-3">
                                        <Play className="w-6 h-6 text-primary" />
                                        Action Definitons
                                    </h2>
                                    <Button onClick={addAction} className="glass border-primary/20 text-primary hover:bg-primary/10">
                                        <Plus className="w-4 h-4 mr-2" />
                                        New Action
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    {Object.entries(config.actions).map(([id, action]) => (
                                        <div key={id} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-zinc-900 rounded-lg px-3 py-1 font-mono text-primary text-sm border border-primary/20">
                                                        ID: {id}
                                                    </div>
                                                    <input
                                                        className="bg-transparent border-b border-zinc-800 focus:border-primary outline-none px-2 py-1 font-bold text-lg w-48"
                                                        value={action.display_text}
                                                        placeholder="Display Name"
                                                        onChange={(e) => updateAction(id, "display_text", e.target.value)}
                                                    />
                                                </div>
                                                <Button variant="ghost" onClick={() => removeAction(id)} className="text-zinc-500 hover:text-red-500">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                <div className="space-y-4">
                                                    <label className="text-xs font-black uppercase text-zinc-500 tracking-widest">Media Type</label>
                                                    <select
                                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-primary/20 appearance-none"
                                                        value={action.play_media?.type || "none"}
                                                        onChange={(e) => updateAction(id, "play_media.type", e.target.value)}
                                                    >
                                                        <option value="video">Video</option>
                                                        <option value="image">Image</option>
                                                        <option value="none">None</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-4">
                                                    <label className="text-xs font-black uppercase text-zinc-500 tracking-widest">Target Screen (ID)</label>
                                                    <input
                                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-secondary/20"
                                                        value={action.screen}
                                                        onChange={(e) => updateAction(id, "screen", e.target.value)}
                                                        placeholder="e.g. 1, 2, overlay..."
                                                    />
                                                </div>

                                                <div className="space-y-4">
                                                    <label className="text-xs font-black uppercase text-zinc-500 tracking-widest">Action Media</label>
                                                    <div className="relative">
                                                        <input
                                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none text-xs pr-12 truncate"
                                                            value={action.play_media?.media_path || ""}
                                                            onChange={(e) => updateAction(id, "play_media.media_path", e.target.value)}
                                                            placeholder="URL or Path"
                                                        />
                                                        <button className="absolute right-2 top-2 p-1.5 hover:bg-white/10 rounded-lg text-secondary transition-colors cursor-pointer" onClick={() => (document.getElementById(`upload-${id}`) as any)?.click()}>
                                                            <Upload className="w-4 h-4" />
                                                            <input
                                                                id={`upload-${id}`}
                                                                type="file"
                                                                className="hidden"
                                                                onChange={(e) => handleFileUpload(e, id)}
                                                            />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-8 space-y-4 border-t border-white/5 pt-6">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-black uppercase text-zinc-500 tracking-widest">Minecraft Commands</label>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            const newCommands = [...(action.commands || []), ""];
                                                            updateAction(id, "commands", newCommands);
                                                        }}
                                                        className="text-primary hover:bg-primary/10 h-7"
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" /> Add Command
                                                    </Button>
                                                </div>
                                                <div className="space-y-2">
                                                    {(action.commands || []).map((cmd, cmdIdx) => (
                                                        <div key={cmdIdx} className="flex gap-2">
                                                            <div className="bg-zinc-900 rounded-lg px-3 flex items-center text-zinc-600 font-mono text-xs">/</div>
                                                            <input
                                                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 outline-none text-sm focus:border-primary/50"
                                                                value={cmd}
                                                                onChange={(e) => {
                                                                    const newCmds = [...action.commands];
                                                                    newCmds[cmdIdx] = e.target.value;
                                                                    updateAction(id, "commands", newCmds);
                                                                }}
                                                                placeholder="e.g. give @p diamond 1"
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const newCmds = action.commands.filter((_, i) => i !== cmdIdx);
                                                                    updateAction(id, "commands", newCmds);
                                                                }}
                                                                className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {(!action.commands || action.commands.length === 0) && (
                                                        <p className="text-xs text-zinc-700 italic">No commands assigned to this action.</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-8 flex flex-wrap gap-6 items-center border-t border-white/5 pt-6">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={action.show_user_info}
                                                        onChange={(e) => updateAction(id, "show_user_info", e.target.checked)}
                                                        className="w-5 h-5 rounded accent-primary bg-zinc-900 border-zinc-800"
                                                    />
                                                    <span className="text-sm font-medium text-zinc-400">Show User Info Box</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={action.skip_on_next_action}
                                                        onChange={(e) => updateAction(id, "skip_on_next_action", e.target.checked)}
                                                        className="w-5 h-5 rounded accent-primary bg-zinc-900 border-zinc-800"
                                                    />
                                                    <span className="text-sm font-medium text-zinc-400">Skip Queue (Flash)</span>
                                                </div>
                                                <div className="ml-auto bg-zinc-900 rounded-xl p-2 flex items-center gap-3">
                                                    <Volume2 className="w-4 h-4 text-zinc-500" />
                                                    <input
                                                        type="range"
                                                        min="0" max="1" step="0.1"
                                                        value={action.play_media?.volume ?? 0.5}
                                                        onChange={(e) => updateAction(id, "play_media.volume", parseFloat(e.target.value))}
                                                        className="w-24 accent-primary"
                                                    />
                                                    <span className="text-xs font-mono text-zinc-500 w-8">{Math.round((action.play_media?.volume ?? 0.5) * 100)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === "gifts" && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold flex items-center gap-3">
                                        <Gift className="w-6 h-6 text-primary" />
                                        Gift Interactions
                                    </h2>
                                    <Button onClick={() => {
                                        const newGifts = [...config.events.specifiedGift, { gift_name: "rose", gift_id: 1, action_id: [], enabled: true }];
                                        setConfig({ ...config, events: { ...config.events, specifiedGift: newGifts } });
                                    }} className="glass border-primary/20 text-primary hover:bg-primary/10">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Monitor New Gift
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {config.events.specifiedGift.map((gift, idx) => (
                                        <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-6 group">
                                            <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-primary border border-primary/10">
                                                <Gift className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-zinc-600 tracking-tighter">Gift Name Mapping</label>
                                                    <input
                                                        className="w-full bg-transparent border-none outline-none text-lg font-bold placeholder:text-zinc-800"
                                                        value={gift.gift_name}
                                                        placeholder="e.g. rose"
                                                        onChange={(e) => {
                                                            const newGifts = [...config.events.specifiedGift];
                                                            newGifts[idx].gift_name = e.target.value;
                                                            setConfig({ ...config, events: { ...config.events, specifiedGift: newGifts } });
                                                        }}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-zinc-600 tracking-tighter">Trigger Actions (IDs separated by comma)</label>
                                                    <input
                                                        className="w-full bg-transparent border-none outline-none text-lg font-bold text-secondary placeholder:text-zinc-800"
                                                        value={gift.action_id.join(",")}
                                                        placeholder="1, 2"
                                                        onChange={(e) => {
                                                            const newGifts = [...config.events.specifiedGift];
                                                            newGifts[idx].action_id = e.target.value.split(",").map(i => i.trim()).filter(i => i);
                                                            setConfig({ ...config, events: { ...config.events, specifiedGift: newGifts } });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="checkbox"
                                                    checked={gift.enabled}
                                                    onChange={(e) => {
                                                        const newGifts = [...config.events.specifiedGift];
                                                        newGifts[idx].enabled = e.target.checked;
                                                        setConfig({ ...config, events: { ...config.events, specifiedGift: newGifts } });
                                                    }}
                                                    className="w-6 h-6 rounded accent-primary cursor-pointer"
                                                />
                                                <Button variant="ghost" onClick={() => {
                                                    const newGifts = config.events.specifiedGift.filter((_, i) => i !== idx);
                                                    setConfig({ ...config, events: { ...config.events, specifiedGift: newGifts } });
                                                }} className="text-zinc-700 hover:text-red-500">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === "coins" && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold flex items-center gap-3">
                                        <Coins className="w-6 h-6 text-yellow-500" />
                                        Coin Range Events
                                    </h2>
                                    <Button onClick={() => {
                                        const newCoins = [...config.events.coinCount, { min_coin: 1, max_coin: 10, action_id: [], enabled: true }];
                                        setConfig({ ...config, events: { ...config.events, coinCount: newCoins } });
                                    }} className="glass border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Range
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {config.events.coinCount.map((range, idx) => (
                                        <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-8 group">
                                            <div className="flex items-center gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-zinc-600 tracking-tighter">Min</label>
                                                    <input type="number" className="w-16 bg-zinc-900 border border-white/10 rounded-lg p-2 text-center" value={range.min_coin} onChange={(e) => {
                                                        const newCoins = [...config.events.coinCount];
                                                        newCoins[idx].min_coin = parseInt(e.target.value);
                                                        setConfig({ ...config, events: { ...config.events, coinCount: newCoins } });
                                                    }} />
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-zinc-800 mt-4" />
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-zinc-600 tracking-tighter">Max</label>
                                                    <input type="number" className="w-16 bg-zinc-900 border border-white/10 rounded-lg p-2 text-center" value={range.max_coin} onChange={(e) => {
                                                        const newCoins = [...config.events.coinCount];
                                                        newCoins[idx].max_coin = parseInt(e.target.value);
                                                        setConfig({ ...config, events: { ...config.events, coinCount: newCoins } });
                                                    }} />
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] font-black uppercase text-zinc-600 tracking-tighter">Assigned Actions</label>
                                                <input
                                                    className="w-full bg-transparent border-none outline-none font-bold text-yellow-500"
                                                    value={range.action_id.join(", ")}
                                                    placeholder="Action IDs..."
                                                    onChange={(e) => {
                                                        const newCoins = [...config.events.coinCount];
                                                        newCoins[idx].action_id = e.target.value.split(",").map(i => i.trim()).filter(i => i);
                                                        setConfig({ ...config, events: { ...config.events, coinCount: newCoins } });
                                                    }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <input type="checkbox" checked={range.enabled} onChange={(e) => {
                                                    const newCoins = [...config.events.coinCount];
                                                    newCoins[idx].enabled = e.target.checked;
                                                    setConfig({ ...config, events: { ...config.events, coinCount: newCoins } });
                                                }} className="w-6 h-6 rounded accent-yellow-500 cursor-pointer" />
                                                <Button variant="ghost" onClick={() => {
                                                    const newCoins = config.events.coinCount.filter((_, i) => i !== idx);
                                                    setConfig({ ...config, events: { ...config.events, coinCount: newCoins } });
                                                }} className="text-zinc-700 hover:text-red-500">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === "global" && (
                            <div className="space-y-12 animate-in fade-in duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <section className="space-y-6">
                                        <h3 className="text-xl font-bold flex items-center gap-3">
                                            <UserPlus className="w-5 h-5 text-secondary" />
                                            User Identity
                                        </h3>
                                        <div className="space-y-4 p-6 rounded-2xl bg-white/5 border border-white/10">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black uppercase text-zinc-600">TikTok Username</label>
                                                <input
                                                    className="w-full bg-zinc-900 border border-white/5 rounded-xl p-4 outline-none focus:ring-2 ring-primary/20"
                                                    value={config.tiktok_username}
                                                    onChange={(e) => setConfig({ ...config, tiktok_username: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black uppercase text-zinc-600">App Port</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-zinc-900 border border-white/5 rounded-xl p-4 outline-none"
                                                    value={config.port}
                                                    readOnly
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <h3 className="text-xl font-bold flex items-center gap-3">
                                            <MessageSquare className="w-5 h-5 text-primary" />
                                            Text To Speech
                                        </h3>
                                        <div className="space-y-4 p-6 rounded-2xl bg-white/5 border border-white/10">
                                            <div className="flex items-center justify-between">
                                                <span className="text-zinc-400 font-medium">Enable TTS</span>
                                                <input
                                                    type="checkbox"
                                                    checked={config.events.textToSpeech.enabled}
                                                    onChange={(e) => setConfig({ ...config, events: { ...config.events, textToSpeech: { ...config.events.textToSpeech, enabled: e.target.checked } } })}
                                                    className="w-6 h-6 rounded accent-primary"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black uppercase text-zinc-600">Voice Type (Python PIPER)</label>
                                                <select className="w-full bg-zinc-900 border border-white/5 rounded-xl p-4 outline-none">
                                                    <option>Natural Male</option>
                                                    <option>Robot</option>
                                                    <option>Whisper</option>
                                                </select>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <section className="space-y-6">
                                    <h3 className="text-xl font-bold flex items-center gap-3">
                                        <Monitor className="w-5 h-5 text-zinc-400" />
                                        Queue & Limits
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {[
                                            { id: "max_comment_que_length", label: "Max Comment Queue" },
                                            { id: "max_media_que_length", label: "Max Media Queue" },
                                            { id: "max_chars_tts", label: "Max TTS Characters" },
                                        ].map(opt => (
                                            <div key={opt.id} className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                                                <label className="text-xs font-black uppercase text-zinc-600">{opt.label}</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent text-2xl font-black outline-none"
                                                    value={(config as any)[opt.id]}
                                                    onChange={(e) => setConfig({ ...config, [opt.id]: parseInt(e.target.value) })}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
