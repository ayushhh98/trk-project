"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Edit2, Layout, Save, RefreshCw, Layers, CheckCircle, XCircle, Megaphone, Target, Image as ImageIcon } from "lucide-react";
import { adminAPI } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Poster {
    _id: string;
    type: 'promo' | 'launch';
    title: string;
    description: string;
    link: string;
    imageUrl?: string;
    stats?: { label: string; value: string }[];
    isActive: boolean;
}

export function AdminPosters() {
    const [posters, setPosters] = useState<Poster[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Poster>>({});
    const [createData, setCreateData] = useState<Partial<Poster>>({
        type: 'promo',
        title: '',
        description: '',
        link: '/dashboard',
        imageUrl: '',
        stats: [
            { label: 'Prize Pool', value: '' },
            { label: 'Tickets', value: '' },
            { label: 'Draw', value: '' }
        ],
        isActive: true
    });

    const fetchPosters = async () => {
        setIsLoading(true);
        try {
            const res = await adminAPI.getPosters();
            if (res.status === 'success') {
                setPosters(res.data);
            }
        } catch (error) {
            toast.error("Failed to fetch posters");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPosters();
    }, []);

    const handleEdit = (poster: Poster) => {
        setEditingId(poster._id);
        setEditData({ ...poster });
    };

    const handleSave = async () => {
        if (!editingId) return;
        setIsLoading(true);
        try {
            const res = await adminAPI.updatePoster(editingId, editData);
            if (res.status === 'success') {
                toast.success("Poster updated successfully");
                setEditingId(null);
                fetchPosters();
            }
        } catch (error) {
            toast.error("Failed to update poster");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!createData.type) {
            toast.error("Poster type is required");
            return;
        }
        if (!createData.title?.trim() || !createData.description?.trim()) {
            toast.error("Title and description are required");
            return;
        }

        setIsCreating(true);
        try {
            const payload: any = {
                type: createData.type,
                title: createData.title.trim(),
                description: createData.description.trim(),
                link: createData.link?.trim() || '/dashboard',
                imageUrl: createData.imageUrl?.trim() || '',
                isActive: createData.isActive ?? true
            };

            if (createData.type === 'launch') {
                const stats = (createData.stats || [])
                    .filter(stat => stat && (stat.label || stat.value))
                    .map(stat => ({
                        label: stat.label?.trim() || '',
                        value: stat.value?.trim() || ''
                    }));
                payload.stats = stats;
            }

            const res = await adminAPI.createPoster(payload);
            if (res.status === 'success') {
                toast.success("Poster created successfully");
                setCreateData({
                    type: 'promo',
                    title: '',
                    description: '',
                    link: '/dashboard',
                    imageUrl: '',
                    stats: [
                        { label: 'Prize Pool', value: '' },
                        { label: 'Tickets', value: '' },
                        { label: 'Draw', value: '' }
                    ],
                    isActive: true
                });
                fetchPosters();
            }
        } catch (error) {
            toast.error("Failed to create poster");
        } finally {
            setIsCreating(false);
        }
    };

    const handleCreateStatChange = (index: number, field: 'label' | 'value', value: string) => {
        const nextStats = [...(createData.stats || [])];
        nextStats[index] = { ...nextStats[index], [field]: value };
        setCreateData({ ...createData, stats: nextStats });
    };

    const addCreateStat = () => {
        const nextStats = [...(createData.stats || [])];
        nextStats.push({ label: '', value: '' });
        setCreateData({ ...createData, stats: nextStats });
    };

    const removeCreateStat = (index: number) => {
        const nextStats = [...(createData.stats || [])];
        nextStats.splice(index, 1);
        setCreateData({ ...createData, stats: nextStats });
    };

    const handleStatChange = (index: number, field: 'label' | 'value', value: string) => {
        const newStats = [...(editData.stats || [])];
        newStats[index] = { ...newStats[index], [field]: value };
        setEditData({ ...editData, stats: newStats });
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-purple-400" />
                        Poster Infrastructure
                    </h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold pl-6">
                        Interface Asset & Narrative Control
                    </p>
                </div>
                <Button
                    onClick={fetchPosters}
                    disabled={isLoading}
                    variant="outline"
                    className="bg-white/5 border-white/10 hover:bg-white/10 h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-3 transition-all hover:scale-105 active:scale-95"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    Sync Assets
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <Card className="xl:col-span-2 bg-[#0A0A0A] border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.01]">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
                                <Layout className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-[9px] font-black uppercase tracking-widest mb-1 text-emerald-400">
                                    NEW_ASSET
                                </div>
                                <CardTitle className="text-xs font-black text-white uppercase tracking-widest">
                                    Create Poster
                                </CardTitle>
                            </div>
                        </div>
                        <Button
                            onClick={handleCreate}
                            disabled={isCreating}
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95",
                                isCreating
                                    ? "bg-white/5 text-white/40"
                                    : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            )}
                        >
                            <Save className="h-3.5 w-3.5 mr-2" />
                            {isCreating ? "Creating..." : "Create Poster"}
                        </Button>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Type</label>
                                <select
                                    value={createData.type || 'promo'}
                                    onChange={(e) => setCreateData({ ...createData, type: e.target.value as Poster['type'] })}
                                    className="w-full bg-black/40 border border-white/5 text-xs font-mono h-11 rounded-xl px-3 focus:border-emerald-500/30 transition-colors"
                                >
                                    <option value="promo">Promo</option>
                                    <option value="launch">Launch</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Title</label>
                                <Input
                                    value={createData.title || ''}
                                    onChange={(e) => setCreateData({ ...createData, title: e.target.value })}
                                    className="bg-black/40 border-white/5 text-xs font-mono h-11 rounded-xl focus:border-emerald-500/30 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Target Link</label>
                                <Input
                                    value={createData.link || ''}
                                    onChange={(e) => setCreateData({ ...createData, link: e.target.value })}
                                    className="bg-black/40 border-white/5 text-xs font-mono h-11 rounded-xl focus:border-emerald-500/30 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Narrative</label>
                                <Textarea
                                    value={createData.description || ''}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCreateData({ ...createData, description: e.target.value })}
                                    className="bg-black/40 border-white/5 text-xs font-mono min-h-[120px] rounded-xl focus:border-emerald-500/30 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Image URL (Optional)</label>
                                <Input
                                    value={createData.imageUrl || ''}
                                    onChange={(e) => setCreateData({ ...createData, imageUrl: e.target.value })}
                                    placeholder="https://..."
                                    className="bg-black/40 border-white/5 text-xs font-mono h-11 rounded-xl focus:border-emerald-500/30 transition-colors"
                                />
                                <div className="text-[10px] text-white/30 font-mono">
                                    Tip: Use a landscape image for best results.
                                </div>
                            </div>
                        </div>

                        {createData.type === 'launch' && (
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Metric Parameters</label>
                                    <Button
                                        onClick={addCreateStat}
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
                                    >
                                        Add Stat
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {(createData.stats || []).map((stat, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <Input
                                                placeholder="Label"
                                                value={stat.label}
                                                onChange={(e) => handleCreateStatChange(idx, 'label', e.target.value)}
                                                className="bg-black/40 border-white/5 text-[10px] h-9 rounded-lg"
                                            />
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    placeholder="Value"
                                                    value={stat.value}
                                                    onChange={(e) => handleCreateStatChange(idx, 'value', e.target.value)}
                                                    className="bg-black/40 border-white/5 text-[10px] h-9 rounded-lg font-bold"
                                                />
                                                <Button
                                                    onClick={() => removeCreateStat(idx)}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-lg bg-white/5 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {posters.map((poster) => (
                    <Card key={poster._id} className="bg-[#0A0A0A] border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden group hover:border-white/10 transition-all duration-300 shadow-2xl">
                        <CardHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.01]">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300",
                                    poster.type === 'promo' ? "bg-purple-500/10 text-purple-400" : "bg-amber-500/10 text-amber-400"
                                )}>
                                    {poster.type === 'promo' ? <Megaphone className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                                </div>
                                <div>
                                    <div className={cn(
                                        "text-[9px] font-black uppercase tracking-widest mb-1",
                                        poster.type === 'promo' ? "text-purple-400" : "text-amber-400"
                                    )}>
                                        {poster.type === 'promo' ? 'PROTOCOL_ELITE' : 'FEATURED_DROP'}
                                    </div>
                                    <CardTitle className="text-xs font-black text-white uppercase tracking-widest">
                                        {poster.type} Poster
                                    </CardTitle>
                                </div>
                            </div>
                            <Button
                                onClick={() => editingId === poster._id ? handleSave() : handleEdit(poster)}
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95",
                                    editingId === poster._id
                                        ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                        : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                {editingId === poster._id ? (
                                    <>
                                        <Save className="h-3.5 w-3.5 mr-2" /> Save Changes
                                    </>
                                ) : (
                                    <>
                                        <Edit2 className="h-3.5 w-3.5 mr-2" /> Modify Asset
                                    </>
                                )}
                            </Button>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6 relative z-10">
                            {editingId === poster._id ? (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Title</label>
                                        <Input
                                            value={editData.title || ''}
                                            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                            className="bg-black/40 border-white/5 text-xs font-mono h-11 rounded-xl focus:border-purple-500/30 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Narrative</label>
                                        <Textarea
                                            value={editData.description || ''}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditData({ ...editData, description: e.target.value })}
                                            className="bg-black/40 border-white/5 text-xs font-mono min-h-[100px] rounded-xl focus:border-purple-500/30 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Target Link</label>
                                        <Input
                                            value={editData.link || ''}
                                            onChange={(e) => setEditData({ ...editData, link: e.target.value })}
                                            className="bg-black/40 border-white/5 text-xs font-mono h-11 rounded-xl focus:border-purple-500/30 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Image URL (Optional)</label>
                                        <Input
                                            value={editData.imageUrl || ''}
                                            onChange={(e) => setEditData({ ...editData, imageUrl: e.target.value })}
                                            className="bg-black/40 border-white/5 text-xs font-mono h-11 rounded-xl focus:border-purple-500/30 transition-colors"
                                        />
                                    </div>

                                    {poster.type === 'launch' && editData.stats && (
                                        <div className="space-y-4 pt-4 border-t border-white/5">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Metric Parameters</label>
                                            <div className="grid grid-cols-3 gap-4">
                                                {editData.stats.map((stat, idx) => (
                                                    <div key={idx} className="space-y-2">
                                                        <Input
                                                            placeholder="Label"
                                                            value={stat.label}
                                                            onChange={(e) => handleStatChange(idx, 'label', e.target.value)}
                                                            className="bg-black/40 border-white/5 text-[10px] h-9 rounded-lg"
                                                        />
                                                        <Input
                                                            placeholder="Value"
                                                            value={stat.value}
                                                            onChange={(e) => handleStatChange(idx, 'value', e.target.value)}
                                                            className="bg-black/40 border-white/5 text-[10px] h-9 rounded-lg font-bold"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 pt-4">
                                        <Button
                                            onClick={() => setEditingId(null)}
                                            variant="ghost"
                                            className="h-11 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            CANCEL_EDIT
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <div className="h-0.5 w-4 bg-white/20 rounded-full" /> Display Title
                                        </div>
                                        <div className="text-xl font-black text-white italic uppercase tracking-tight pl-6 border-l-2 border-white/10 py-1">{poster.title}</div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <div className="h-0.5 w-4 bg-white/20 rounded-full" /> Narrative
                                        </div>
                                        <div className="text-xs text-white/50 leading-relaxed font-medium pl-6 border-l-2 border-white/5 py-1">{poster.description}</div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <div className="h-0.5 w-4 bg-white/20 rounded-full" /> Navigation Sequence
                                        </div>
                                        <div className="text-xs text-emerald-500/80 font-mono bg-emerald-500/5 px-3 py-2 rounded-lg border border-emerald-500/10 inline-block">{poster.link}</div>
                                    </div>

                                    {poster.imageUrl && (
                                        <div className="space-y-2">
                                            <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                <div className="h-0.5 w-4 bg-white/20 rounded-full" /> Image Asset
                                            </div>
                                            <div className="text-xs text-white/50 font-mono break-all bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                                                {poster.imageUrl}
                                            </div>
                                        </div>
                                    )}

                                    {poster.type === 'launch' && poster.stats && (
                                        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5">
                                            {poster.stats.map((stat, idx) => (
                                                <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center hover:bg-white/[0.04] transition-colors relative group/stat">
                                                    <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">{stat.label}</div>
                                                    <div className="text-sm font-black text-white uppercase tracking-wide group-hover/stat:text-emerald-400 transition-colors">{stat.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 pt-2">
                                        {poster.isActive ? (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live_on_Grid
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-white/30 text-[10px] font-black uppercase tracking-widest border border-white/10">
                                                <XCircle className="h-3.5 w-3.5" /> Asset_Offline
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
