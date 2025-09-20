'use client'

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Pencil } from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"

type PlanRow = { id?: number; year: number; month: number; week: number; tower: string; planned: number }
type ActualRow = { id?: number; year: number; month: number; week: number; tower: string; actual: number }

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const towers = ["T1","T2","T3","T4","POD/NTA","UGWT","STP"]

export default function ConcretePage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [tower, setTower] = useState("T1")
  const [planRows, setPlanRows] = useState<PlanRow[]>([])
  const [actualRows, setActualRows] = useState<ActualRow[]>([])
  const [allTotals, setAllTotals] = useState<{month:number, planned:number, actual:number, monthlyPlanned:number, monthlyActual:number}[]>([])
  const [form, setForm] = useState<{week:number, planned?:number, actual?:number}>({week:1})
  const [editingWeek, setEditingWeek] = useState<number|null>(null)
  const [viewMode, setViewMode] = useState<"monthly"|"yearly">("monthly")
  const [loading, setLoading] = useState(false)
  const [duplicateModal, setDuplicateModal] = useState<{week:number, type:"plan"|"actual"}|null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: planData } = await supabase.from("concrete_plan")
        .select("*")
        .eq("year", year)
        .eq("month", month)
        .eq("tower", tower)
        .order("week")
      const { data: actData } = await supabase.from("concrete_actual")
        .select("*")
        .eq("year", year)
        .eq("month", month)
        .eq("tower", tower)
        .order("week")
      setPlanRows(planData || [])
      setActualRows(actData || [])

      const { data: planYear } = await supabase.from("concrete_plan")
        .select("month, planned")
        .eq("year", year)
        .eq("tower", tower)
      const { data: actYear } = await supabase.from("concrete_actual")
        .select("month, actual")
        .eq("year", year)
        .eq("tower", tower)

      const monthlyTotals: Record<number, {planned:number, actual:number}> = {}
      ;(planYear||[]).forEach((p:any)=>{
        monthlyTotals[p.month] = monthlyTotals[p.month] || {planned:0, actual:0}
        monthlyTotals[p.month].planned += Number(p.planned || 0)
      })
      ;(actYear||[]).forEach((a:any)=>{
        monthlyTotals[a.month] = monthlyTotals[a.month] || {planned:0, actual:0}
        monthlyTotals[a.month].actual += Number(a.actual || 0)
      })

      const totalsArr: typeof allTotals = []
      let cumPlan = 0, cumAct = 0
      for(let m=1;m<=12;m++){
        const mt = monthlyTotals[m] || {planned:0, actual:0}
        cumPlan += mt.planned
        cumAct += mt.actual
        totalsArr.push({month:m, monthlyPlanned: mt.planned, monthlyActual: mt.actual, planned:cumPlan, actual:cumAct})
      }
      setAllTotals(totalsArr)
    } catch (err) {
      console.error(err)
      toast.error("Error fetching data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [year, month, tower])

  useEffect(() => {
    const channel = supabase.channel('concrete-data-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'concrete_plan', filter: `year=eq.${year}` }, async () => { await fetchData() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'concrete_actual', filter: `year=eq.${year}` }, async () => { await fetchData() })
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [year, tower])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Check for duplicates if adding new record
      if(!editingWeek){
        if(form.planned !== undefined){
          const { data: existingPlan } = await supabase.from("concrete_plan")
            .select("*")
            .eq("year", year)
            .eq("month", month)
            .eq("week", form.week)
            .eq("tower", tower)
            .limit(1)
          if(existingPlan && existingPlan.length>0){
            setDuplicateModal({week: form.week, type:"plan"})
            return
          }
        }
        if(form.actual !== undefined){
          const { data: existingActual } = await supabase.from("concrete_actual")
            .select("*")
            .eq("year", year)
            .eq("month", month)
            .eq("week", form.week)
            .eq("tower", tower)
            .limit(1)
          if(existingActual && existingActual.length>0){
            setDuplicateModal({week: form.week, type:"actual"})
            return
          }
        }
      }

      if(form.planned !== undefined){
        const { error } = await supabase.from("concrete_plan")
          .upsert(
            { year, month, week: form.week, tower, planned: form.planned },
            { onConflict: "year,month,week,tower" }
          )
        if(error) throw error
      }
      if(form.actual !== undefined){
        const { error } = await supabase.from("concrete_actual")
          .upsert(
            { year, month, week: form.week, tower, actual: form.actual },
            { onConflict: "year,month,week,tower" }
          )
        if(error) throw error
      }
      toast.success(editingWeek ? "Updated successfully" : "Saved successfully")
      setForm({week:1})
      setEditingWeek(null)
      fetchData()
    } catch(err){
      console.error("Supabase upsert error:", err)
      toast.error("Error saving data")
    }
  }

  const handleEdit = (week:number) => {
    const plan = planRows.find(r=>r.week===week)
    const act = actualRows.find(r=>r.week===week)
    setForm({week, planned:plan?.planned, actual:act?.actual})
    setEditingWeek(week)
  }

  const fmt = (v?: number|null) => v==null ? "0.000" : Number(v).toFixed(3)
  const monthlyPlanned = useMemo(()=>planRows.reduce((s,r)=>s+r.planned,0), [planRows])
  const monthlyActual = useMemo(()=>actualRows.reduce((s,r)=>s+r.actual,0), [actualRows])
  const cumulative = allTotals.find(t=>t.month===month)
  const yearlyChartData = allTotals.map(t=>({
    month: months[t.month-1],
    planned: Number((t.monthlyPlanned||0).toFixed(3)),
    actual: Number((t.monthlyActual||0).toFixed(3)),
    cumulativePlanned: Number((t.planned||0).toFixed(3)),
    cumulativeActual: Number((t.actual||0).toFixed(3)),
  }))

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Concrete Plan vs Actual (Tower-wise)</h1>

      <div className="flex flex-wrap items-center mb-4 justify-between">
        <div className="flex gap-4 items-center">
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium">Tower</label>
            <select className="border rounded px-2 py-1" value={tower} onChange={e=>setTower(e.target.value)}>
              {towers.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium">Year</label>
            <Input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} className="w-28"/>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium">Month</label>
            <select className="border rounded px-2 py-1" value={month} onChange={e=>setMonth(Number(e.target.value))}>
              {months.map((m,idx)=><option key={idx} value={idx+1}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <Button variant={viewMode==="monthly"?"default":"outline"} onClick={()=>setViewMode("monthly")}>Monthly</Button>
          <Button variant={viewMode==="yearly"?"default":"outline"} onClick={()=>setViewMode("yearly")}>Yearly</Button>
        </div>
      </div>

      {viewMode==="monthly" ? (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingWeek ? `Edit Week ${editingWeek}` : 'Add / Update Week'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex gap-4 flex-wrap items-end">
                <div>
                  <label className="block text-sm font-medium mb-1">Week</label>
                  <Input type="number" min={1} max={5} value={form.week} disabled={!!editingWeek} onChange={e=>setForm(f=>({...f, week:Number(e.target.value)}))} className="w-24"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Planned</label>
                  <Input type="number" step="0.001" value={form.planned??''} onChange={e=>setForm(f=>({...f, planned:Number(e.target.value)}))} className="w-36"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Actual</label>
                  <Input type="number" step="0.001" value={form.actual??''} onChange={e=>setForm(f=>({...f, actual:Number(e.target.value)}))} className="w-36"/>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">{editingWeek ? 'Update' : 'Save'}</Button>
                  {editingWeek && <Button variant="outline" onClick={()=>{setEditingWeek(null); setForm({week:1})}}>Cancel</Button>}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Week-wise table */}
          <Card>
            <CardHeader>
              <CardTitle>{months[month-1]} - {year} ({tower}) Week-wise</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead>Planned</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1,2,3,4,5].map(w=>{
                    const p = planRows.find(r=>r.week===w)
                    const a = actualRows.find(r=>r.week===w)
                    return (
                      <TableRow key={w}>
                        <TableCell>W{w}</TableCell>
                        <TableCell>{fmt(p?.planned)}</TableCell>
                        <TableCell>{fmt(a?.actual)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={()=>handleEdit(w)}>
                            <Pencil className="w-4 h-4 text-green-600"/>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="font-bold bg-gray-100">
                    <TableCell>Total (Month)</TableCell>
                    <TableCell>{monthlyPlanned.toFixed(3)}</TableCell>
                    <TableCell>{monthlyActual.toFixed(3)}</TableCell>
                    <TableCell/>
                  </TableRow>
                  <TableRow className="font-bold bg-yellow-100">
                    <TableCell>Cumulative</TableCell>
                    <TableCell>{fmt(cumulative?.planned)}</TableCell>
                    <TableCell>{fmt(cumulative?.actual)}</TableCell>
                    <TableCell/>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Yearly Planned vs Actual ({year}, {tower})</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyChartData} margin={{top:20, right:30, left:0, bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis dataKey="month"/>
                  <YAxis/>
                  <Tooltip/>
                  <Legend/>
                  <Bar dataKey="planned" fill="#8884d8"/>
                  <Bar dataKey="actual" fill="#82ca9d"/>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Yearly Summary Table ({year}, {tower})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Planned (Month)</TableHead>
                    <TableHead>Actual (Month)</TableHead>
                    <TableHead>Cumulative Planned</TableHead>
                    <TableHead>Cumulative Actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allTotals.map(t=>(
                    <TableRow key={t.month}>
                      <TableCell>{months[t.month-1]}</TableCell>
                      <TableCell>{fmt(t.monthlyPlanned)}</TableCell>
                      <TableCell>{fmt(t.monthlyActual)}</TableCell>
                      <TableCell>{fmt(t.planned)}</TableCell>
                      <TableCell>{fmt(t.actual)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Duplicate Modal */}
      {duplicateModal && (
        <Dialog open={true} onOpenChange={() => setDuplicateModal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Already Exists</DialogTitle>
            </DialogHeader>
            <div className="py-2 text-gray-700">
              A record for <strong>Week {duplicateModal.week}</strong> of <strong>{months[month-1]} {year}</strong> (Tower <strong>{tower}</strong>, {duplicateModal.type}) already exists.
            </div>
            <DialogFooter className="flex gap-2">
              <Button onClick={() => { handleEdit(duplicateModal.week); setDuplicateModal(null) }}>Edit Record</Button>
              <Button variant="outline" onClick={() => setDuplicateModal(null)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  )
}
