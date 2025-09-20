'use client'

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart
} from "recharts"

// --- TYPES ---
type Tower = "T1" | "T2" | "T3" | "T4" | "POD/NTA" | "UGWT" | "STP"
const towers: Tower[] = ["T1", "T2", "T3", "T4", "POD/NTA", "UGWT", "STP"]
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

type ProgressRow = { tower: Tower; Planned: number; Actual: number }
type ManpowerRow = { monthName: string; avgPlanned: number; avgActual: number }
type ConcreteRow = { monthName: string; Planned: number; Actual: number }
type CashflowRow = { monthName: string; planned: number; actual: number; cumulativePlanned: number; cumulativeActual: number }

// --- MOCK/HARDCODED TARGETS (Needed for Progress Percentage) ---
const PROJECT_TARGET_VOLUME_BY_TOWER: Record<Tower, number> = {
    "T1": 15000,
    "T2": 14500,
    "T3": 16000,
    "T4": 15500,
    "POD/NTA": 5000,
    "UGWT": 3000,
    "STP": 1500,
}
// const PROJECT_TOTAL_TARGET = Object.values(PROJECT_TARGET_VOLUME_BY_TOWER).reduce((a, b) => a + b, 0) // Not used directly in current charts

// --- COMPONENT ---
export default function DashboardPage() {
    // NOTE: This date logic is simplified. In a real scenario, the 'updated on' date
    // should be fetched from a dedicated status table or computed from the latest data entry.
    const today = new Date();
    const currentYear = today.getFullYear()

    const [progressData, setProgressData] = useState<ProgressRow[]>([])
    const [costData, setCostData] = useState<CashflowRow[]>([])
    const [manpowerData, setManpowerData] = useState<ManpowerRow[]>([])
    const [concreteData, setConcreteData] = useState<ConcreteRow[]>([])
    const [loading, setLoading] = useState(true)

    // Hardcoded data for sections B2, C, D based on the image.
    const finishDateData = [
        { tower: 'T1', finish: '25-02-2027', variance: 84 },
        { tower: 'T2', finish: '24-02-2027', variance: 74 },
        { tower: 'T3', finish: '23-04-2027', variance: 113 },
        { tower: 'T4', finish: '04-02-2027', variance: 158 },
        { tower: 'POD/NTA', finish: '02-02-2026', variance: 168 },
        { tower: 'UGWT', finish: '07-09-2026', variance: 116 },
        { tower: 'STP', finish: '09-05-2026', variance: 31 },
    ]
    const criticalIssues = [
        "WP and Filling work",
        "Balance Labour Mobilization"
    ]
    const nonNegotiables = [
        "Tower 1: 2F Balance Slab + Pour 3, Podium 1 Slab",
        "Tower 2: GF Slab, Tower 3 Podium 1 Slab",
        "Tower 4: 5W Completion fill GF, WP & backfilling",
        "UGWT FT wall",
    ]
    const steelStock = [
        { sr: 1, dia: '8 mm', total: 204.17, stock: 40.04, consume: 121.77 },
        { sr: 2, dia: '10 mm', total: 50.21, stock: 178.87, consume: 24.57 },
        { sr: 3, dia: '12 mm', total: 201.44, stock: 172.27, consume: 98.53 },
        { sr: 4, dia: '16 mm', total: 270.85, stock: 327.66, consume: 98.53 },
        { sr: 5, dia: '20 mm', total: 55.35, stock: 10.95, consume: 128.47 },
        { sr: 6, dia: '25 mm', total: 139.42, stock: 9.31, consume: 3.70 },
        { sr: 7, dia: '32 mm', total: 13.02, stock: 723.52, consume: 714.96 },
    ]

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            // 1. Fetch ALL data for Progress and Manpower Aggregation
            const { data: cPlan } = await supabase.from("concrete_plan").select("tower, planned, month, year")
            const { data: cActual } = await supabase.from("concrete_actual").select("tower, actual, month, year")
            
            // FIX: Added 'year' to the select queries to resolve the TypeScript error 2339.
            const { data: mPlan } = await supabase.from("manpower_plan").select("month, planned, week, year") 
            const { data: mActual } = await supabase.from("manpower_actual").select("month, actual, week, year")
            
            // 2. Fetch data for Cost (only current year)
            const { data: cfPlan } = await supabase.from("cashflow_plan").select("month, planned").eq("year", currentYear).order("month")
            const { data: cfActual } = await supabase.from("cashflow_actual").select("month, actual").eq("year", currentYear).order("month")

            // --- A. Project Progress Physical (RCC) Calculation ---
            const progressMap: Record<Tower, { plannedSum: number; actualSum: number }> = {} as any
            towers.forEach(t => progressMap[t] = { plannedSum: 0, actualSum: 0 })

            cPlan?.forEach(p => {
                const tower = p.tower as Tower
                if (progressMap[tower]) progressMap[tower].plannedSum += Number(p.planned || 0)
            })
            cActual?.forEach(a => {
                const tower = a.tower as Tower
                if (progressMap[tower]) progressMap[tower].actualSum += Number(a.actual || 0)
            })

            const calculatedProgress: ProgressRow[] = towers.map(tower => {
                const { plannedSum, actualSum } = progressMap[tower]
                const target = PROJECT_TARGET_VOLUME_BY_TOWER[tower] || 0
                return {
                    tower,
                    // Percentage Calculation: (Sum Volume / Target Volume) * 100, rounded to 1 decimal
                    Planned: target > 0 ? Number(((plannedSum / target) * 100).toFixed(1)) : 0,
                    Actual: target > 0 ? Number(((actualSum / target) * 100).toFixed(1)) : 0,
                }
            })
            setProgressData(calculatedProgress)

            // --- A1. Manpower (Avg Per Day) Calculation ---
            const manpowerTotals: Record<number, { plannedCount: number, actualCount: number, plannedSum: number, actualSum: number }> = {}
            for(let i=1; i<=12; i++) manpowerTotals[i] = { plannedCount: 0, actualCount: 0, plannedSum: 0, actualSum: 0 }

            // These lines now work because 'year' is included in mPlan/mActual
            mPlan?.filter(r => r.year === currentYear).forEach(p => {
                manpowerTotals[p.month].plannedSum += Number(p.planned || 0)
                manpowerTotals[p.month].plannedCount++ // Each weekly entry counts as one data point
            })
            mActual?.filter(r => r.year === currentYear).forEach(a => {
                manpowerTotals[a.month].actualSum += Number(a.actual || 0)
                manpowerTotals[a.month].actualCount++ // Each weekly entry counts as one data point
            })

            const calculatedManpower: ManpowerRow[] = Array.from({ length: 12 }, (_, i) => {
                const month = i + 1
                const { plannedSum, actualSum, plannedCount, actualCount } = manpowerTotals[month]
                return {
                    monthName: months[i],
                    // Average = Total Sum / Number of entries (weeks)
                    avgPlanned: plannedCount > 0 ? Number((plannedSum / plannedCount).toFixed(0)) : 0,
                    avgActual: actualCount > 0 ? Number((actualSum / actualCount).toFixed(0)) : 0,
                }
            })
            setManpowerData(calculatedManpower)


            // --- A2. Concrete (Monthly) Calculation ---
            const monthlyConcrete: Record<number, { planned: number; actual: number }> = {}
            for(let i=1; i<=12; i++) monthlyConcrete[i] = { planned: 0, actual: 0 }

            cPlan?.filter(r => r.year === currentYear).forEach(p => {
                monthlyConcrete[p.month].planned += Number(p.planned || 0)
            })
            cActual?.filter(r => r.year === currentYear).forEach(a => {
                monthlyConcrete[a.month].actual += Number(a.actual || 0)
            })
            
            const calculatedConcrete: ConcreteRow[] = Array.from({ length: 12 }, (_, i) => ({
                monthName: months[i],
                Planned: Number((monthlyConcrete[i+1].planned).toFixed(0)), // Round to nearest m3
                Actual: Number((monthlyConcrete[i+1].actual).toFixed(0)),
            })).filter(r => r.Planned > 0 || r.Actual > 0)
            setConcreteData(calculatedConcrete)

            // --- B. Cost Updates (Cashflow) Calculation ---
            const monthlyCosts: Record<number, { planned: number; actual: number }> = {}
            for(let i=1; i<=12; i++) monthlyCosts[i] = { planned: 0, actual: 0 }
            
            cfPlan?.forEach(p => monthlyCosts[p.month].planned = Number(p.planned || 0))
            cfActual?.forEach(a => monthlyCosts[a.month].actual = Number(a.actual || 0))

            let cumulativePlanned = 0
            let cumulativeActual = 0

            const calculatedCost: CashflowRow[] = Array.from({ length: 12 }, (_, i) => {
                const month = i + 1
                const planned = monthlyCosts[month].planned
                const actual = monthlyCosts[month].actual

                cumulativePlanned += planned
                cumulativeActual += actual
                
                return {
                    monthName: months[i],
                    planned: planned,
                    actual: actual,
                    cumulativePlanned: cumulativePlanned,
                    cumulativeActual: cumulativeActual,
                }
            })
            setCostData(calculatedCost.filter(r => r.planned > 0 || r.actual > 0)) // Filter out empty months
            
        } catch (err) {
            console.error("Error fetching dashboard data:", err)
        } finally {
            setLoading(false)
        }
    }, [currentYear])

    useEffect(() => { fetchData() }, [fetchData])

    const fmt = (v: number | null | undefined, decimals: number = 2) => v === null || v === undefined ? "—" : Number(v).toFixed(decimals)

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const planned = payload.find((p: any) => p.dataKey.toLowerCase().includes('planned'))
            const actual = payload.find((p: any) => p.dataKey.toLowerCase().includes('actual'))
            const unit = payload[0].dataKey.includes('avg') ? 'Men' : 'm³' // Simple heuristic for Manpower/Concrete
            
            return (
                <div className="bg-white p-3 border border-gray-300 rounded shadow-md text-sm">
                    <p className="font-bold text-base mb-1">{label}</p>
                    {planned && <p style={{ color: planned.color }}>Planned: {fmt(planned.value, 0)} {unit}</p>}
                    {actual && <p style={{ color: actual.color }}>Actual: {fmt(actual.value, 0)} {unit}</p>}
                </div>
            )
        }
        return null
    }

    if (loading) return <div className="p-8 text-center text-xl">Loading Dashboard...</div>

    // --- RENDER ---
    return (
        <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-screen">
            <header className="text-center mb-6">
                <h1 className="text-2xl font-extrabold text-blue-800">GODREJ EMERALD WATERS</h1>
                <h2 className="text-xl font-semibold text-gray-700">WEEKLY/MONTHLY PROGRESS REPORT</h2>
                <p className="text-sm text-gray-500 mt-1">UPDATED ON {today.toLocaleDateString('en-GB')}</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* A. Project Progress Physical (RCC) */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold border-b pb-2">A. PROJECT PROGRESS PHYSICAL (RCC)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] p-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={progressData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="tower" angle={-30} textAnchor="end" height={50} style={{fontSize: '10px'}}/>
                                <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 45]} style={{fontSize: '10px'}}/>
                                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                                <Legend wrapperStyle={{fontSize: '12px'}}/>
                                <Bar dataKey="Planned" fill="#f87171" name="Planned %" barSize={15} />
                                <Bar dataKey="Actual" fill="#60a5fa" name="Actual %" barSize={15} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* B. COST UPDATES (All figures in Cr) */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold border-b pb-2">B. COST UPDATES (All figures in Cr)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] p-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={costData} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="monthName" style={{fontSize: '10px'}}/>
                                <YAxis yAxisId="left" domain={[0, 'auto']} style={{fontSize: '10px'}}/>
                                <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} stroke="#007bff" style={{fontSize: '10px'}}/>
                                <Tooltip contentStyle={{fontSize: '12px'}} formatter={(value: number, name: string) => [`${name}: ${value.toFixed(2)} Cr`]} />
                                <Legend wrapperStyle={{fontSize: '12px', paddingTop: '5px'}}/>
                                <Bar yAxisId="left" dataKey="planned" name="Planned Cash Flow" fill="#ff8c4a" barSize={10} />
                                <Bar yAxisId="left" dataKey="actual" name="Actual Billed" fill="#4a90e2" barSize={10} />
                                <Line yAxisId="right" type="monotone" dataKey="cumulativePlanned" name="Cumulative Planned" stroke="#8e44ad" strokeWidth={2} dot={false} />
                                <Line yAxisId="right" type="monotone" dataKey="cumulativeActual" name="Cumulative Billed" stroke="#007bff" strokeWidth={2} dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* A1. MANPOWER */}
                <Card className="shadow-lg lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold border-b pb-2">A1. MANPOWER</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] p-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={manpowerData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="monthName" style={{fontSize: '10px'}}/>
                                <YAxis style={{fontSize: '10px'}}/>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{fontSize: '12px'}}/>
                                <Bar dataKey="avgPlanned" name="Planned Manpower" fill="#8884d8" barSize={10} />
                                <Bar dataKey="avgActual" name="Actual Manpower" fill="#82ca9d" barSize={10} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* B1. PROJECT COMPLETION DATE / B2. PLANNED AND PROJECTED FINISH DATES (TOWERWISE) */}
                <div className="space-y-6 lg:col-span-1">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold border-b pb-2">B1. PROJECT COMPLETION DATE</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 text-sm space-y-2">
                            <div className="flex justify-between p-2 bg-gray-100 font-semibold"><span>Baseline Finish Date:</span><span>08-12-2026</span></div>
                            <div className="flex justify-between p-2 bg-red-100 font-semibold text-red-700"><span>Projected Finish:</span><span>23-04-2027</span></div>
                            <div className="flex justify-between p-2 bg-yellow-100"><span>Finish Variance:</span><span>113 days</span></div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold border-b pb-2">B2. PLANNED AND PROJECTED FINISH DATES (TOWERWISE)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 text-xs">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 font-bold">
                                        <th className="border p-1">TOWER</th>
                                        <th className="border p-1">Planned Finish</th>
                                        <th className="border p-1">Projected Finish</th>
                                        <th className="border p-1">Variance (days)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {finishDateData.map((row, i) => (
                                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                            <td className="border p-1 font-semibold">{row.tower}</td>
                                            <td className="border p-1">18-11-2025</td>
                                            <td className="border p-1">{row.finish}</td>
                                            <td className="border p-1 text-red-600 font-medium">{row.variance} days</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>

                {/* C. STEEL STOCK REPORT */}
                <Card className="shadow-lg lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold border-b pb-2">C. STEEL STOCK REPORT</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 text-xs">
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr className="bg-gray-100 font-bold">
                                    <th className="border p-1">Sr. No.</th>
                                    <th className="border p-1">Dia.</th>
                                    <th className="border p-1">Total Receive</th>
                                    <th className="border p-1">Stock</th>
                                    <th className="border p-1">Consume</th>
                                </tr>
                            </thead>
                            <tbody>
                                {steelStock.map((row) => (
                                    <tr key={row.sr} className={row.sr % 2 !== 0 ? "bg-white" : "bg-gray-50"}>
                                        <td className="border p-1">{row.sr}</td>
                                        <td className="border p-1">{row.dia}</td>
                                        <td className="border p-1">{fmt(row.total, 2)}</td>
                                        <td className="border p-1">{fmt(row.stock, 2)}</td>
                                        <td className="border p-1">{fmt(row.consume, 2)}</td>
                                    </tr>
                                ))}
                                <tr className="font-bold bg-yellow-200">
                                    <td className="border p-1" colSpan={2}>TOTAL</td>
                                    <td className="border p-1">{fmt(steelStock.reduce((s, r) => s + r.total, 0), 3)}</td>
                                    <td className="border p-1">{fmt(steelStock.reduce((s, r) => s + r.stock, 0), 3)}</td>
                                    <td className="border p-1">{fmt(steelStock.reduce((s, r) => s + r.consume, 0), 3)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* A2. CONCRETE */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold border-b pb-2">A2. CONCRETE (m³)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] p-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={concreteData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="monthName" style={{fontSize: '10px'}}/>
                                <YAxis style={{fontSize: '10px'}}/>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{fontSize: '12px'}}/>
                                <Bar dataKey="Planned" fill="#00b0e5" name="Planned (m³)" barSize={10} />
                                <Bar dataKey="Actual" fill="#007bff" name="Actual (m³)" barSize={10} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* B3. TOP CRITICAL ISSUES */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold border-b pb-2">B3. TOP CRITICAL ISSUES OF THE PROJECT</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 text-sm space-y-2">
                        <ul className="list-disc list-inside space-y-1">
                            {criticalIssues.map((issue, i) => (
                                <li key={i} className="text-red-700 font-medium">{issue}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* B4. NON-NEGOTIABLES FOR THIS MONTH */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold border-b pb-2">B4. NON-NEGOTIABLES FOR THIS MONTH</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 text-sm space-y-2">
                        <ul className="list-decimal list-inside space-y-1">
                            {nonNegotiables.map((item, i) => (
                                <li key={i} className="font-medium text-gray-700">{item}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
            
            {/* D. CUMULATIVE SAFE MANHOURS (Simple text display) */}
            <div className="text-center py-4 bg-green-100 border border-green-500 rounded-lg shadow-md">
                <h3 className="text-lg font-bold text-green-700">D. CUMULATIVE SAFE MANHOURS</h3>
                <p className="text-3xl font-extrabold text-green-900">2,17,014</p>
            </div>

        </div>
    )
}