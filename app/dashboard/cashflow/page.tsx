'use client'

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Pencil, Loader2 } from "lucide-react" 
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" 

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
    const [isSubmitting, setIsSubmitting] = useState(false) 

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
            toast.error("Error fetching cashflow data.")
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
        setIsSubmitting(true)

        const planExists = planRows.some(r => r.month === form.month)
        const actualExists = actualRows.some(r => r.month === form.month)

        if (!editingMonth && (planExists || actualExists)) {
            setIsSubmitting(false)
            setDuplicateMonth(form.month)
            return
        }

        try {
            if (form.planned !== undefined && !isNaN(form.planned)) {
                const { error } = await supabase.from("cashflow_plan")
                    .upsert(
                        { year, month: form.month, planned: form.planned ?? null },
                        { onConflict: "year,month" }
                    )
                if (error) throw error
            }
            if (form.actual !== undefined && !isNaN(form.actual)) {
                const { error } = await supabase.from("cashflow_actual")
                    .upsert(
                        { year, month: form.month, actual: form.actual ?? null },
                        { onConflict: "year,month" }
                    )
                if (error) throw error
            }

            toast.success(editingMonth ? "Updated successfully" : "Saved successfully")
            setEditingMonth(null)
            setForm({ month: form.month, planned: undefined, actual: undefined }) // Reset planned/actual fields
            fetchData(year)
        } catch (err) {
            console.error(err)
            toast.error("Error saving cashflow")
        } finally {
            setIsSubmitting(false)
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
            
            // Only accumulate if the value is not null/undefined
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

    const fmt = (v: number | null | undefined, decimals: number = 2) => v === null || v === undefined || isNaN(v) ? "—" : Number(v).toFixed(decimals)

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-300 rounded shadow-lg text-sm">
                    <p className="font-bold text-base mb-1 text-gray-800">{label} {year}</p>
                    {payload.map((p: any) => (
                        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
                            {p.name}: **{fmt(p.value, 2)}** Cr.
                        </p>
                    ))}
                </div>
            )
        }
        return null
    }

    if(loading){
        return (
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-2" />
            <span className="text-lg font-semibold text-gray-700">Loading Cashflow Data...</span>
          </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen font-sans space-y-8">
            <header className="pb-4 border-b border-gray-200">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    Cashflow Plan vs Actual (₹ Cr.) 💰
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Visualize and manage monthly planned cashflow against actual billed amounts.
                </p>
            </header>

            {/* Year Filter */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-md">
                <label className="font-semibold text-gray-700">Financial Year:</label>
                <Input
                    type="number"
                    value={year}
                    onChange={e => setYear(Number(e.target.value))}
                    className="w-32 border-gray-300 focus:border-blue-500"
                    min={2000}
                />
            </div>

            {/* Input Card */}
            <Card className="shadow-lg border-t-4 border-t-blue-500">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-800">
                        {editingMonth ? `Edit Cashflow for ${months[editingMonth - 1]} ${year}` : "Add / Update Monthly Cashflow"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="flex flex-wrap gap-6 items-end">
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 mb-1">Month</label>
                            <Select 
                                value={String(form.month)}
                                disabled={!!editingMonth || isSubmitting}
                                onValueChange={v => setForm(f => ({ ...f, month: Number(v) }))}
                            >
                                <SelectTrigger className="w-[120px] border-gray-300">
                                    <SelectValue placeholder="Select Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 mb-1">Planned (Cr)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={form.planned ?? ""}
                                onChange={e => setForm(f => ({ ...f, planned: e.target.value === "" ? undefined : Number(e.target.value) }))}
                                className="w-40 border-gray-300"
                                placeholder="e.g. 15.00"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 mb-1">Actual (Cr)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={form.actual ?? ""}
                                onChange={e => setForm(f => ({ ...f, actual: e.target.value === "" ? undefined : Number(e.target.value) }))}
                                className="w-40 border-gray-300"
                                placeholder="e.g. 14.50"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="bg-blue-600 hover:bg-blue-700 shadow-md"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : editingMonth ? "Update" : "Save"}
                            </Button>
                            {editingMonth && (
                                <Button 
                                    variant="outline" 
                                    onClick={() => { setEditingMonth(null); setForm({ month: form.month, planned: undefined, actual: undefined }) }}
                                    disabled={isSubmitting}
                                    className="text-gray-600 border-gray-300 hover:bg-gray-100"
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Chart */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-800">Cashflow Trend Analysis</CardTitle>
                    <p className="text-sm text-gray-500">Monthly breakdown and cumulative progress (All figures in Cr)</p>
                </CardHeader>
                <CardContent className="h-[450px] p-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={rowData}
                            margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="monthName" tick={{ fill: "#4B5563", fontWeight: 500, fontSize: 12 }} tickLine={false} />
                            <YAxis domain={[0, 'auto']} label={{ value: 'Amount (Cr)', angle: -90, position: 'insideLeft', fill: '#4B5563' }} /> 
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
                            
                            {/* Monthly Bars */}
                            <Bar dataKey="planned" name="Monthly Planned" fill="#FFC300" barSize={20} />
                            <Bar dataKey="actual" name="Monthly Actual" fill="#3498DB" barSize={20} />
                            
                            {/* Cumulative Lines */}
                            <Line type="monotone" dataKey="cumulativePlanned" name="Cumulative Planned" stroke="#E74C3C" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="cumulativeActual" name="Cumulative Actual" stroke="#27AE60" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Row-wise Table */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-800">Cashflow Summary ({year})</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table className="min-w-[800px]">
                        <TableHeader>
                            <TableRow className="bg-gray-100 hover:bg-gray-100">
                                <TableHead className="font-bold text-gray-700">Month</TableHead>
                                <TableHead className="text-center font-bold text-gray-700">Planned (Cr)</TableHead>
                                <TableHead className="text-center font-bold text-gray-700">Cumulative Planned (Cr)</TableHead>
                                <TableHead className="text-center font-bold text-gray-700">Actual Billed (Cr)</TableHead>
                                <TableHead className="text-center font-bold text-gray-700">Cumulative Billed (Cr)</TableHead>
                                <TableHead className="text-center font-bold text-gray-700">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rowData.map(row => {
                                // Conditional formatting for Actual vs Planned
                                const isBehindPlan = row.actual !== null && row.planned !== null && row.actual < row.planned * 0.99; // check for small variance
                                const isAheadPlan = row.actual !== null && row.planned !== null && row.actual > row.planned * 1.01;
                                
                                const actualCellClass = row.actual !== null
                                    ? isBehindPlan 
                                        ? 'bg-red-50 text-red-700 font-semibold text-center'
                                        : isAheadPlan 
                                            ? 'bg-green-50 text-green-700 font-semibold text-center'
                                            : 'text-gray-900 font-medium text-center' // On track
                                    : 'text-gray-500 text-center'
                                
                                // Conditional formatting for Cumulative Actual vs Cumulative Planned
                                const isCumBehindPlan = row.cumulativeActual < row.cumulativePlanned * 0.99;
                                const isCumAheadPlan = row.cumulativeActual > row.cumulativePlanned * 1.01;
                                
                                const cumulativeCellClass = isCumBehindPlan
                                    ? 'bg-red-100 text-red-800 font-bold text-center'
                                    : isCumAheadPlan
                                        ? 'bg-green-100 text-green-800 font-bold text-center'
                                        : 'text-gray-900 font-bold text-center'

                                return (
                                    <TableRow key={row.month} className="odd:bg-white even:bg-gray-50 hover:bg-blue-50 transition-colors">
                                        <TableCell className="font-semibold text-gray-800">{months[row.month - 1]}</TableCell>
                                        <TableCell className="text-center text-orange-600">{fmt(row.planned)}</TableCell>
                                        <TableCell className="text-center text-purple-600 font-bold">{fmt(row.cumulativePlanned)}</TableCell>
                                        <TableCell className={actualCellClass}>{fmt(row.actual)}</TableCell>
                                        <TableCell className={cumulativeCellClass}>{fmt(row.cumulativeActual)}</TableCell>
                                        <TableCell className="text-center">
                                            <Button size="sm" variant="ghost" onClick={() => handleEdit(row.month)} className="text-blue-600 hover:bg-blue-100 p-2">
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {/* FIX: Removed line breaks/whitespace between TableCell components for the final row to prevent hydration error */}
                            <TableRow className="bg-blue-50 border-t-2 border-blue-200">
                                <TableCell className="font-extrabold text-lg text-gray-900">YTD Total</TableCell><TableCell className="text-center font-extrabold text-orange-700 text-lg">
                                    {fmt(rowData.reduce((sum, r) => sum + (r.planned ?? 0), 0))}
                                </TableCell><TableCell/>
                                <TableCell className="text-center font-extrabold text-blue-700 text-lg">
                                    {fmt(rowData.reduce((sum, r) => sum + (r.actual ?? 0), 0))}
                                </TableCell><TableCell className={`text-center font-extrabold text-lg ${
                                    rowData[11].cumulativeActual < rowData[11].cumulativePlanned * 0.99 ? 'text-red-800' : 'text-green-800'
                                }`}>
                                    {fmt(rowData[11].cumulativeActual)}
                                </TableCell><TableCell/>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Duplicate Month Modal */}
            <Dialog open={!!duplicateMonth} onOpenChange={() => setDuplicateMonth(null)}>
                <DialogContent className="sm:max-w-[425px] rounded-lg shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-red-600">Record Already Exists ⚠️</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-gray-700">
                        A cashflow record for **{duplicateMonth !== null ? months[duplicateMonth - 1] : ""}** {year} already exists.
                        <p className="mt-2 text-sm text-gray-500">Would you like to edit the existing record?</p>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
                        <Button 
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                                if (duplicateMonth !== null) handleEdit(duplicateMonth)
                            }}
                        >
                            Edit Existing Record
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => setDuplicateMonth(null)}
                            className="text-gray-600 border-gray-300 hover:bg-gray-100"
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}