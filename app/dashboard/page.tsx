'use client'

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@supabase/supabase-js" // Assuming supabase is not globally imported
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// --- Supabase Client (Assuming this is how you create it, adjust path if needed) ---
// NOTE: You'll need to ensure your environment variables are available here.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)


// --- TYPES ---
type Tower = "T1" | "T2" | "T3" | "T4" | "POD/NTA" | "UGWT" | "STP"
const towers: Tower[] = ["T1", "T2", "T3", "T4", "POD/NTA", "UGWT", "STP"]
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

type ProgressRow = { tower: Tower; Planned: number; Actual: number }
type ManpowerRow = { monthName: string; avgPlanned: number; avgActual: number }
type ConcreteRow = { monthName: string; Planned: number; Actual: number }
type CashflowRow = { monthName: string; planned: number; actual: number; cumulativePlanned: number; cumulativeActual: number }
// Corrected Type: The database column is 'finish_variance_days', so we use that here.
type FinishDateRow = { tower: string; planned_finish: string; projected_finish: string; finish_variance_days: number } 

// --- RECHARTS CUSTOM COMPONENTS ---
// Updated CustomTooltip styling for a cleaner look
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-100 text-sm font-sans">
                <p className="font-bold text-gray-700 mb-1">{label}</p>
                {payload.map((p: any, i: number) => (
                    <p key={i} className="flex justify-between items-center text-gray-600" style={{ color: p.color }}>
                        <span className="mr-2">{`${p.name}:`}</span>
                        <span className="font-semibold">{p.value}</span>
                    </p>
                ))}
            </div>
        )
    }
    return null
}

// --- UTILITY ---
const formatDate = (dateString: string) => {
    try {
        if (!dateString) return '—';
        // Use a more modern date format for a professional look
        return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return '—';
    }
}

const getVarianceClass = (variance: number) => {
    // Enhanced variance classes for better visibility and modern design
    if (variance > 0) return "text-red-700 bg-red-100 font-bold px-2 py-1 rounded"; // Behind Schedule
    if (variance < 0) return "text-green-700 bg-green-100 font-bold px-2 py-1 rounded"; // Ahead of Schedule
    return "text-gray-700 bg-gray-100 font-medium px-2 py-1 rounded"; // On Schedule
}


// --- COMPONENT ---
export default function DashboardPage() {
    const today = new Date()
    const currentYear = today.getFullYear()

    const [progressData, setProgressData] = useState<ProgressRow[]>([])
    const [costData, setCostData] = useState<CashflowRow[]>([])
    const [manpowerData, setManpowerData] = useState<ManpowerRow[]>([])
    const [concreteData, setConcreteData] = useState<ConcreteRow[]>([])
    const [finishDateData, setFinishDateData] = useState<FinishDateRow[]>([])
    const [criticalIssues, setCriticalIssues] = useState<string[]>([])
    const [nonNegotiables, setNonNegotiables] = useState<string[]>([])
    const [steelStock, setSteelStock] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            // --- Fetch RCC / Progress Data ---
            const { data: cPlan } = await supabase.from("concrete_plan").select("tower, planned, month, year")
            const { data: cActual } = await supabase.from("concrete_actual").select("tower, actual, month, year")

            
            const calculatedProgress: ProgressRow[] = towers.map(tower => {
                const plannedSum = cPlan?.filter(p => p.tower === tower).reduce((sum, p) => sum + Number(p.planned || 0), 0) || 0;
                const actualSum = cActual?.filter(a => a.tower === tower).reduce((sum, a) => sum + Number(a.actual || 0), 0) || 0;

                const Planned = plannedSum;
                const Actual = actualSum;

                return { tower, Planned, Actual };
            });
            setProgressData(calculatedProgress);


            // --- Manpower Data ---
            const { data: mPlan } = await supabase.from("manpower_plan").select("month, planned, week, year")
            const { data: mActual } = await supabase.from("manpower_actual").select("month, actual, week, year")

            const manpowerTotals: Record<number, { plannedCount: number, actualCount: number, plannedSum: number, actualSum: number }> = {}
            for (let i = 1; i <= 12; i++) manpowerTotals[i] = { plannedCount: 0, actualCount: 0, plannedSum: 0, actualSum: 0 }

            mPlan?.filter(r => r.year === currentYear).forEach(p => {
                manpowerTotals[p.month].plannedSum += Number(p.planned || 0)
                manpowerTotals[p.month].plannedCount++
            })
            mActual?.filter(r => r.year === currentYear).forEach(a => {
                manpowerTotals[a.month].actualSum += Number(a.actual || 0)
                manpowerTotals[a.month].actualCount++
            })

            setManpowerData(Array.from({ length: 12 }, (_, i) => {
                const month = i + 1
                const { plannedSum, actualSum, plannedCount, actualCount } = manpowerTotals[month]
                return {
                    monthName: months[i],
                    avgPlanned: plannedCount > 0 ? Number((plannedSum / plannedCount).toFixed(0)) : 0,
                    avgActual: actualCount > 0 ? Number((actualSum / actualCount).toFixed(0)) : 0,
                }
            }))

            // --- Concrete Data ---
            const monthlyConcrete: Record<number, { planned: number; actual: number }> = {}
            for (let i = 1; i <= 12; i++) monthlyConcrete[i] = { planned: 0, actual: 0 }
            cPlan?.filter(r => r.year === currentYear).forEach(p => monthlyConcrete[p.month].planned += Number(p.planned || 0))
            cActual?.filter(r => r.year === currentYear).forEach(a => monthlyConcrete[a.month].actual += Number(a.actual || 0))

            setConcreteData(Array.from({ length: 12 }, (_, i) => ({
                monthName: months[i],
                Planned: Number((monthlyConcrete[i + 1].planned).toFixed(0)),
                Actual: Number((monthlyConcrete[i + 1].actual).toFixed(0)),
            })).filter(r => r.Planned > 0 || r.Actual > 0))

            // --- Cashflow Data ---
            const { data: cfPlan } = await supabase.from("cashflow_plan").select("month, planned").eq("year", currentYear).order("month")
            const { data: cfActual } = await supabase.from("cashflow_actual").select("month, actual").eq("year", currentYear).order("month")

            let cumulativePlanned = 0, cumulativeActual = 0
            const monthlyCosts: Record<number, { planned: number; actual: number }> = {}
            for (let i = 1; i <= 12; i++) monthlyCosts[i] = { planned: 0, actual: 0 }
            cfPlan?.forEach(p => monthlyCosts[p.month].planned = Number(p.planned || 0))
            cfActual?.forEach(a => monthlyCosts[a.month].actual = Number(a.actual || 0))

            setCostData(Array.from({ length: 12 }, (_, i) => {
                const month = i + 1
                const planned = monthlyCosts[month].planned
                const actual = monthlyCosts[month].actual
                cumulativePlanned += planned
                cumulativeActual += actual
                return { monthName: months[i], planned, actual, cumulativePlanned, cumulativeActual }
            }).filter(r => r.planned > 0 || r.actual > 0))

            // --- Finish Dates (UPDATED FETCH AND MAPPING) ---
            const { data: towerFinish } = await supabase.from("tower_finish_dates").select("*")
            setFinishDateData(
                (towerFinish || []).map(t => ({
                    tower: t.tower,
                    planned_finish: t.planned_finish,
                    projected_finish: t.projected_finish,
                    // Use the correct column name from the database (now manually entered)
                    finish_variance_days: t.finish_variance_days, 
                }))
            )

            // --- Critical Issues ---
            const { data: critIssues } = await supabase.from("critical_issues").select("issue_description")
            setCriticalIssues(critIssues?.map(i => i.issue_description) || [])

            // --- Monthly Non-Negotiables ---
            const { data: nonNeg } = await supabase.from("monthly_non_negotiables").select("tower, task_description").order("id")
            setNonNegotiables(nonNeg?.map(i => `${i.tower}: ${i.task_description}`) || [])

            // --- Steel Stock ---
            const { data: steel } = await supabase.from("steel_stock_report").select("*").order("sr_no")
            setSteelStock(steel || [])

        } catch (err) {
            console.error("Error fetching dashboard data:", err)
        } finally {
            setLoading(false)
        }
    }, [currentYear])

    useEffect(() => {
        fetchData();

        // --- REALTIME SUBSCRIPTIONS ---
        const subscriptions = [
            "concrete_plan",
            "concrete_actual",
            "manpower_plan",
            "manpower_actual",
            "cashflow_plan",
            "cashflow_actual",
            "tower_finish_dates", // Ensure this table is subscribed for real-time updates
            "critical_issues",
            "monthly_non_negotiables",
            "steel_stock_report"
        ].map(table =>
            supabase
                .channel(`realtime-${table}`)
                .on("postgres_changes", { event: "*", schema: "public", table }, () => fetchData())
                .subscribe()
        );

        return () => subscriptions.forEach(sub => supabase.removeChannel(sub));
    }, [fetchData]);


    const fmt = (v: number | null | undefined, decimals: number = 2) => v == null ? "—" : Number(v).toFixed(decimals)

    if (loading) return <div className="p-8 text-center text-xl text-gray-700">Loading Dashboard...</div>

    return (
        <div className="p-4 md:p-8 space-y-8 bg-gray-50 min-h-screen font-sans">
            <header className="text-center mb-6 py-4 bg-white shadow-md rounded-lg">
                <h1 className="text-3xl font-extrabold text-blue-900 tracking-wider">GODREJ EMERALD WATERS</h1>
                <h2 className="text-xl font-semibold text-gray-700 mt-1">WEEKLY/MONTHLY PROGRESS REPORT</h2>
                <p className="text-sm text-gray-500 mt-2">UPDATED ON {today.toLocaleDateString('en-GB')}</p>
            </header>

            {/* Top Row: Progress and Cost */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* A. PROJECT PROGRESS PHYSICAL (RCC) */}
                <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-800">
                            A. PROJECT PROGRESS PHYSICAL (RCC)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        {progressData.length === 0 ? (
                            <div className="text-center text-sm text-gray-500 py-8">
                                No data available
                            </div>
                        ) : (
                            <>
                                {/* Table View */}
                                <div className="overflow-x-auto mb-6 border rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200 text-center">
                                        <thead className="bg-blue-600">
                                            <tr>
                                                <th className="py-3 px-3 text-left text-sm font-bold text-white sticky left-0 bg-blue-600 z-20 shadow-md">
                                                    Metric
                                                </th>
                                                {progressData.map((row) => (
                                                    <th key={row.tower} className="py-3 px-3 text-sm font-bold text-white uppercase">
                                                        {row.tower}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                                                <th className="py-2 px-3 text-left font-semibold text-red-700 sticky left-0 bg-white z-10">
                                                    Planned (%)
                                                </th>
                                                {progressData.map((row) => (
                                                    <td key={row.tower} className="py-2 px-3 text-red-600 font-medium text-sm">
                                                        {row.Planned}%
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                                                <th className="py-2 px-3 text-left font-semibold text-blue-700 sticky left-0 bg-white z-10">
                                                    Actual (%)
                                                </th>
                                                {progressData.map((row) => (
                                                    <td key={row.tower} className="py-2 px-3 text-blue-600 font-bold text-sm">
                                                        {row.Actual}%
                                                    </td>
                                                ))}
                                            </tr>
                                        </tbody>
                                        <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                                            <tr>
                                                <th className="py-3 px-3 text-left font-bold sticky left-0 bg-gray-100 z-10 text-gray-800">
                                                    Project Total
                                                </th>
                                                <td colSpan={progressData.length} className="py-3 px-3 text-center font-extrabold text-sm">
                                                    Planned: <span className="text-red-600">{progressData.reduce((sum, r) => sum + r.Planned, 0).toFixed(1)}%</span> 
                                                    &nbsp; / &nbsp; Actual: <span className="text-blue-600">{progressData.reduce((sum, r) => sum + r.Actual, 0).toFixed(1)}%</span>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Bar Chart */}
                                <div className="w-full h-[250px] bg-white p-2 border rounded-lg shadow-inner">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={progressData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                            <XAxis dataKey="tower" stroke="#374151" tick={{ fill: "#4B5563", fontWeight: 600, fontSize: 10 }} tickLine={false} />
                                            <YAxis stroke="#374151" tick={{ fill: "#4B5563", fontWeight: 500, fontSize: 10 }} tickLine={false} axisLine={false} unit="%" />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ paddingTop: 5, fontSize: 12 }} />
                                            <Bar dataKey="Planned" fill="#EF4444" radius={[4,4,0,0]} barSize={15} />
                                            <Bar dataKey="Actual" fill="#3B82F6" radius={[4,4,0,0]} barSize={15} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>




                {/* B. COST UPDATES */}
                <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-800">B. COST UPDATES (All figures in Cr)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px] p-2 pt-0">
                        <div className="w-full h-full bg-white p-2 border rounded-lg shadow-inner">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={costData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                    <XAxis dataKey="monthName" style={{fontSize: '10px'}} stroke="#4B5563"/>
                                    <YAxis yAxisId="left" domain={[0, 'auto']} style={{fontSize: '10px'}} stroke="#4B5563"/>
                                    {/* Using more professional colors for right axis */}
                                    <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} stroke="#22c55e" style={{fontSize: '10px'}}/>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{fontSize: '12px', paddingTop: '5px'}}/>
                                    <Bar yAxisId="left" dataKey="planned" name="Planned Monthly" fill="#f97316" barSize={12} />
                                    <Bar yAxisId="left" dataKey="actual" name="Actual Monthly" fill="#0ea5e9" barSize={12} />
                                    <Line yAxisId="right" type="monotone" dataKey="cumulativePlanned" name="Cumulative Planned" stroke="#8e44ad" strokeWidth={3} dot={false} />
                                    <Line yAxisId="right" type="monotone" dataKey="cumulativeActual" name="Cumulative Billed" stroke="#22c55e" strokeWidth={3} dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Row: Manpower, Finish Dates, Steel Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* A1. MANPOWER */}
                <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-800">A1. MANPOWER</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] p-2 pt-0">
                         <div className="w-full h-full bg-white p-2 border rounded-lg shadow-inner">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={manpowerData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                    <XAxis dataKey="monthName" style={{fontSize: '10px'}} stroke="#4B5563"/>
                                    <YAxis style={{fontSize: '10px'}} stroke="#4B5563"/>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{fontSize: '12px'}}/>
                                    <Bar dataKey="avgPlanned" name="Avg. Planned" fill="#6366f1" barSize={12} radius={[4,4,0,0]} />
                                    <Bar dataKey="avgActual" name="Avg. Actual" fill="#34d399" barSize={12} radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* B2. PLANNED AND PROJECTED FINISH DATES (TOWERWISE) */}
                <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-800">B2. PLANNED & PROJECTED FINISH DATES (TOWERWISE)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 text-xs">
                        <div className="max-h-[250px] overflow-y-auto border rounded-lg shadow-inner">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-700 text-white font-extrabold sticky top-0 shadow-lg z-10">
                                        <th className="border p-2">TOWER</th>
                                        <th className="border p-2">Planned Finish</th>
                                        <th className="border p-2">Projected Finish</th>
                                        <th className="border p-2 text-center">Variance (days)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {finishDateData.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-4 text-center text-gray-500">No finish date records found.</td>
                                        </tr>
                                    ) : (
                                        finishDateData.map((row, i) => (
                                            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50 hover:bg-gray-100 transition-colors"}>
                                                <td className="border p-2 font-semibold text-gray-800">{row.tower}</td>
                                                <td className="border p-2">{formatDate(row.planned_finish)}</td>
                                                <td className="border p-2">{formatDate(row.projected_finish)}</td>
                                                <td className="border p-2 text-center">
                                                    <span className={getVarianceClass(row.finish_variance_days)}>
                                                        {row.finish_variance_days >= 0 ? `+${row.finish_variance_days}` : row.finish_variance_days}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* C. STEEL STOCK REPORT */}
                <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-800">C. STEEL STOCK REPORT (MT)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 text-xs">
                        <div className="max-h-[250px] overflow-y-auto border rounded-lg shadow-inner">
                            <table className="w-full text-center border-collapse">
                                <thead>
                                    <tr className="bg-gray-700 text-white font-extrabold sticky top-0 shadow-lg z-10">
                                        <th className="border p-2">Sr. No.</th>
                                        <th className="border p-2">Dia. (mm)</th>
                                        <th className="border p-2">Total Receive</th>
                                        <th className="border p-2">Stock</th>
                                        <th className="border p-2">Consume</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {steelStock.map((row, i) => (
                                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50 hover:bg-gray-100 transition-colors"}>
                                            <td className="border p-2">{row.sr_no}</td>
                                            <td className="border p-2 font-semibold">{row.dia}</td>
                                            <td className="border p-2 text-blue-700">{fmt(row.total_received, 2)}</td>
                                            <td className="border p-2 text-green-700 font-bold">{fmt(row.stock_at_site, 2)}</td>
                                            <td className="border p-2 text-red-700">{fmt(row.consumed, 2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="font-extrabold bg-yellow-300 sticky bottom-0 text-gray-800 shadow-inner">
                                    <tr>
                                        <td className="border p-2" colSpan={2}>TOTAL (MT)</td>
                                        <td className="border p-2 text-blue-900">{fmt(steelStock.reduce((s, r) => s + (Number(r.total_received) || 0), 0), 3)}</td>
                                        <td className="border p-2 text-green-900">{fmt(steelStock.reduce((s, r) => s + (Number(r.stock_at_site) || 0), 0), 3)}</td>
                                        <td className="border p-2 text-red-900">{fmt(steelStock.reduce((s, r) => s + (Number(r.consumed) || 0), 0), 3)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row: Concrete, Critical Issues, Non-Negotiables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* A2. CONCRETE */}
                <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-800">A2. CONCRETE VOLUME (m³)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] p-2 pt-0">
                        <div className="w-full h-full bg-white p-2 border rounded-lg shadow-inner">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={concreteData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                    <XAxis dataKey="monthName" style={{fontSize: '10px'}} stroke="#4B5563"/>
                                    <YAxis style={{fontSize: '10px'}} stroke="#4B5563"/>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{fontSize: '12px'}}/>
                                    <Bar dataKey="Planned" fill="#00b0e5" name="Planned (m³)" barSize={12} radius={[4,4,0,0]} />
                                    <Bar dataKey="Actual" fill="#007bff" name="Actual (m³)" barSize={12} radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* B3. TOP CRITICAL ISSUES */}
                <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-800">B3. TOP CRITICAL ISSUES</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 text-sm max-h-[250px] overflow-y-auto">
                        <ul className="list-disc list-inside space-y-2 pl-4">
                            {criticalIssues.length === 0 ? <li className="text-gray-500">No critical issues reported.</li> :
                                criticalIssues.map((issue, i) => (
                                    <li key={i} className="text-red-700 font-semibold leading-relaxed">{issue}</li>
                                ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* B4. NON-NEGOTIABLES FOR THIS MONTH */}
                <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-800">B4. NON-NEGOTIABLES FOR THIS MONTH</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 text-sm max-h-[250px] overflow-y-auto">
                        <ul className="list-decimal list-inside space-y-2 pl-4">
                            {nonNegotiables.length === 0 ? <li className="text-gray-500">No non-negotiables set for this month.</li> :
                                nonNegotiables.map((item, i) => (
                                    <li key={i} className="font-medium text-gray-700 leading-relaxed">{item}</li>
                                ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {/* D. CUMULATIVE SAFE MANHOURS (Simple text display) */}
            <div className="text-center py-6 bg-green-50 border-2 border-green-300 rounded-xl shadow-lg mt-8">
                <h3 className="text-xl font-bold text-green-700 tracking-wider">D. CUMULATIVE SAFE MANHOURS</h3>
                <p className="text-5xl font-extrabold text-green-900 mt-2">2,17,014 👷‍♂️</p>
                <p className="text-sm text-green-600 mt-1">A project priority: Safety First.</p>
            </div>
        </div>
    )
}