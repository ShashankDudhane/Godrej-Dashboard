'use client'

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Pencil } from "lucide-react"
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts"

// Import Shadcn Dialog
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog"

type CashflowPlanRow = { year: number; month: number; planned: number | null }
type CashflowActualRow = { year: number; month: number; actual: number | null }

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export default function CashflowPage() {
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [planRows, setPlanRows] = useState<CashflowPlanRow[]>([])
    const [actualRows, setActualRows] = useState<CashflowActualRow[]>([])
    const [form, setForm] = useState<{ month: number; planned?: number; actual?: number }>({
        month: now.getMonth() + 1,
    })
    const [editingMonth, setEditingMonth] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)

    // Modal state for duplicate month
    const [duplicateMonth, setDuplicateMonth] = useState<number | null>(null)

    // Fetch Data
    const fetchData = async (currentYear: number) => {
        setLoading(true)
        try {
            const { data: planData } = await supabase.from("cashflow_plan")
                .select("*")
                .eq("year", currentYear)
                .order("month")
            setPlanRows(planData || [])

            const { data: actualData } = await supabase.from("cashflow_actual")
                .select("*")
                .eq("year", currentYear)
                .order("month")
            setActualRows(actualData || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData(year) }, [year])
    
    // Realtime subscription effect
    useEffect(() => {
        const planChannel = supabase.channel('cf-plan-ch')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'cashflow_plan', filter: `year=eq.${year}` }, 
                async () => { await fetchData(year) }
            )
            .subscribe()
            
        const actualChannel = supabase.channel('cf-actual-ch')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'cashflow_actual', filter: `year=eq.${year}` }, 
                async () => { await fetchData(year) }
            )
            .subscribe()
            
        return () => { 
            planChannel.unsubscribe()
            actualChannel.unsubscribe()
        }
    }, [year])

    // Submit handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const planExists = planRows.some(r => r.month === form.month)
        const actualExists = actualRows.some(r => r.month === form.month)

        if (!editingMonth && (planExists || actualExists)) {
            setDuplicateMonth(form.month)
            return
        }

        try {
            if (form.planned !== undefined) {
                const { error } = await supabase.from("cashflow_plan")
                    .upsert(
                        { year, month: form.month, planned: form.planned ?? null },
                        { onConflict: "year,month" }
                    )
                if (error) throw error
            }
            if (form.actual !== undefined) {
                const { error } = await supabase.from("cashflow_actual")
                    .upsert(
                        { year, month: form.month, actual: form.actual ?? null },
                        { onConflict: "year,month" }
                    )
                if (error) throw error
            }

            toast.success(editingMonth ? "Updated successfully" : "Saved successfully")
            setEditingMonth(null)
            setForm({ month: form.month })
            fetchData(year)
        } catch (err) {
            console.error(err)
            toast.error("Error saving cashflow")
        }
    }

    const handleEdit = (month: number) => {
        const plan = planRows.find(r => r.month === month)
        const actual = actualRows.find(r => r.month === month)
        setForm({ month, planned: plan?.planned ?? undefined, actual: actual?.actual ?? undefined })
        setEditingMonth(month)
        setDuplicateMonth(null)
    }

    // Prepare row-wise data AND chart data
    const rowData = useMemo(() => {
        let cumulativePlanned = 0
        let cumulativeActual = 0
        return Array.from({ length: 12 }, (_, i) => {
            const month = i + 1
            const plan = planRows.find(r => r.month === month)
            const actual = actualRows.find(r => r.month === month)
            const plannedVal = plan?.planned ?? null 
            const actualVal = actual?.actual ?? null
            cumulativePlanned += plannedVal ?? 0
            cumulativeActual += actualVal ?? 0
            return {
                month,
                monthName: months[i],
                planned: plannedVal,
                cumulativePlanned: cumulativePlanned,
                actual: actualVal,
                cumulativeActual: cumulativeActual
            }
        })
    }, [planRows, actualRows])

    const fmt = (v: number | null | undefined, decimals: number = 2) => v === null || v === undefined ? "—" : Number(v).toFixed(decimals)

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-300 rounded shadow-md text-sm">
                    <p className="font-bold text-base mb-1">{label} {year}</p>
                    {payload.map((p: any) => (
                        <p key={p.dataKey} style={{ color: p.color }}>
                            {p.name}: {fmt(p.value, 2)} Cr.
                        </p>
                    ))}
                </div>
            )
        }
        return null
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Cashflow Plan vs Actual (Cr.)</h1>

            <div className="flex items-center gap-4">
                <label className="font-medium text-gray-700">Year:</label>
                <Input
                    type="number"
                    value={year}
                    onChange={e => setYear(Number(e.target.value))}
                    className="w-32"
                />
            </div>

            {/* Input Card */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">
                        {editingMonth ? `Edit ${months[editingMonth - 1]} ${year}` : "Add / Update Monthly Cashflow"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
                        <div className="flex flex-col">
                            <label className="text-sm font-medium">Month</label>
                            <select
                                value={form.month}
                                disabled={!!editingMonth}
                                onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))}
                                className="border rounded px-2 py-1 w-32"
                            >
                                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-sm font-medium">Planned</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={form.planned ?? ""}
                                onChange={e => setForm(f => ({ ...f, planned: e.target.value === "" ? undefined : Number(e.target.value) }))}
                                className="w-40"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-sm font-medium">Actual</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={form.actual ?? ""}
                                onChange={e => setForm(f => ({ ...f, actual: e.target.value === "" ? undefined : Number(e.target.value) }))}
                                className="w-40"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={loading}>{editingMonth ? "Update" : "Save"}</Button>
                            {editingMonth && <Button variant="outline" onClick={() => { setEditingMonth(null); setForm({ month: form.month }) }}>Cancel</Button>}
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Chart */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Cost Updates Visualization (All figures in Cr)</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={rowData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="monthName" />
                            <YAxis domain={[0, 'auto']} /> 
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Bar dataKey="planned" name="Planned Cash Flow" fill="#ff8c4a" barSize={20} />
                            <Bar dataKey="actual" name="Actual Billed" fill="#4a90e2" barSize={20} />
                            <Line type="monotone" dataKey="cumulativePlanned" name="Cumulative Planned" stroke="#8e44ad" strokeWidth={2} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="cumulativeActual" name="Cumulative Billed" stroke="#007bff" strokeWidth={2} dot={{ r: 4 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Row-wise Table */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Cashflow Summary ({year})</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table className="min-w-[700px]">
                        <TableHeader>
                            <TableRow className="bg-gray-100">
                                <TableHead>Month</TableHead>
                                <TableHead>Planned</TableHead>
                                <TableHead>Cumulative Planned</TableHead>
                                <TableHead>Actual Billed</TableHead>
                                <TableHead>Cumulative Billed</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rowData.map(row => {
                                const actualCellClass = row.actual !== null
                                    ? row.actual < (row.planned ?? 0)
                                        ? 'bg-red-100 text-red-700 font-semibold'
                                        : 'bg-green-100 text-green-700 font-semibold'
                                    : ''
                                const cumulativeCellClass = row.cumulativeActual < row.cumulativePlanned
                                    ? 'bg-red-100 text-red-700 font-semibold'
                                    : 'bg-green-100 text-green-700 font-semibold'
                                return (
                                    <TableRow key={row.month} className="hover:bg-gray-50 transition">
                                        <TableCell>{months[row.month - 1]}</TableCell>
                                        <TableCell>{fmt(row.planned)}</TableCell>
                                        <TableCell>{fmt(row.cumulativePlanned)}</TableCell>
                                        <TableCell className={actualCellClass}>{fmt(row.actual)}</TableCell>
                                        <TableCell className={cumulativeCellClass}>{fmt(row.cumulativeActual)}</TableCell>
                                        <TableCell>
                                            <Button size="sm" variant="ghost" onClick={() => handleEdit(row.month)}>
                                                <Pencil className="w-4 h-4 text-blue-600" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Duplicate Month Modal */}
            <Dialog open={!!duplicateMonth} onOpenChange={() => setDuplicateMonth(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record Already Exists</DialogTitle>
                    </DialogHeader>
                    <div className="py-2 text-gray-700">
                        A record for <strong>{duplicateMonth !== null ? months[duplicateMonth - 1] : ""}</strong> {year} already exists.
                    </div>
                    <DialogFooter className="flex gap-2">
                        <Button onClick={() => {
                            if (duplicateMonth !== null) handleEdit(duplicateMonth)
                        }}>Edit Record</Button>
                        <Button variant="outline" onClick={() => setDuplicateMonth(null)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
