"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { adminAPI } from "@/lib/api";

export function AdminCharts() {
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await adminAPI.getAnalyticsHistory(7);
                if (res.status === 'success') {
                    setData(res.data);
                }
            } catch (error) {
                console.error("Failed to fetch chart data:", error);
            }
        };

        fetchAnalytics();
    }, []);

    if (!data) return <div className="h-[300px] w-full bg-white/5 animate-pulse rounded-2xl" />;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#0a0a0a]/50 border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-6 border-b border-white/5">
                    <CardTitle className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                        Volume Infrastructure Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="h-[300px] min-h-[300px] w-full min-w-0" style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorWagered" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorPayout" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="wagered" stroke="#8884d8" fillOpacity={1} fill="url(#colorWagered)" />
                                <Area type="monotone" dataKey="payout" stroke="#82ca9d" fillOpacity={1} fill="url(#colorPayout)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-[#0a0a0a]/50 border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-6 border-b border-white/5">
                    <CardTitle className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                        User Expansion Metrics
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="h-[300px] min-h-[300px] w-full min-w-0" style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
