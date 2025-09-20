'use client'

import { useState, useEffect } from "react"
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

const towers = ["T1","T2","T3","T4","POD/NTA","UGWT","STP"]
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

type ManpowerRow = {
  week: number
  planned?: number
  actual?: number
  tower: string
}

export default function ManpowerPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [tower, setTower] = useState("T1")
  const [planRows, setPlanRows] = useState<ManpowerRow[]>([])
  const [actualRows, setActualRows] = useState<ManpowerRow[]>([])
  const [allTotals, setAllTotals] = useState<{month:number, planned:number, actual:number, avgPlanned:number, avgActual:number}[]>([])
  const [monthlyTotals, setMonthlyTotals] = useState<Record<number, {planned:number[], actual:number[]}>>({})
  const [form, setForm] = useState<ManpowerRow>({week:1, tower:"T1"})
  const [editingWeek, setEditingWeek] = useState<number|null>(null)
  const [viewMode, setViewMode] = useState<"monthly"|"yearly">("monthly")
  const [loading, setLoading] = useState(false)
  const [duplicateWeek, setDuplicateWeek] = useState<number|null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: planData } = await supabase.from("manpower_plan")
        .select("*")
        .eq("year", year)
        .eq("month", month)
        .eq("tower", tower)
        .order("week")

      const { data: actData } = await supabase.from("manpower_actual")
        .select("*")
        .eq("year", year)
        .eq("month", month)
        .eq("tower", tower)
        .order("week")

      setPlanRows(planData || [])
      setActualRows(actData || [])

      // Yearly totals
      const { data: planYear } = await supabase.from("manpower_plan")
        .select("month, planned")
        .eq("year", year)
        .eq("tower", tower)
      const { data: actYear } = await supabase.from("manpower_actual")
        .select("month, actual")
        .eq("year", year)
        .eq("tower", tower)

      const monthly: Record<number, {planned:number[], actual:number[]}> = {}
      ;(planYear||[]).forEach((p:any)=>{
        monthly[p.month] = monthly[p.month] || {planned:[], actual:[]}
        monthly[p.month].planned.push(Number(p.planned||0))
      })
      ;(actYear||[]).forEach((a:any)=>{
        monthly[a.month] = monthly[a.month] || {planned:[], actual:[]}
        monthly[a.month].actual.push(Number(a.actual||0))
      })
      setMonthlyTotals(monthly)

      const totalsArr: typeof allTotals = []
      for(let m=1;m<=12;m++){
        const mt = monthly[m] || {planned:[], actual:[]}
        const sumPlanned = mt.planned.reduce((s,v)=>s+v,0)
        const sumActual = mt.actual.reduce((s,v)=>s+v,0)
        totalsArr.push({
          month: m,
          planned: sumPlanned,
          actual: sumActual,
          avgPlanned: mt.planned.length ? sumPlanned/mt.planned.length : 0,
          avgActual: mt.actual.length ? sumActual/mt.actual.length : 0
        })
      }
      setAllTotals(totalsArr)

    } catch(err){
      console.error(err)
      toast.error("Error fetching data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ fetchData() }, [year, month, tower])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const currentTower = tower

    if(!editingWeek){
      const exists = planRows.some(r=>r.week===form.week) || actualRows.some(r=>r.week===form.week)
      if(exists){
        setDuplicateWeek(form.week)
        return
      }
    }

    try {
      if(form.planned !== undefined){
        const { error } = await supabase.from("manpower_plan")
          .upsert({ year, month, week: form.week, tower: currentTower, planned: form.planned }, { onConflict: "year,month,week,tower" })
        if(error) throw error
      }
      if(form.actual !== undefined){
        const { error } = await supabase.from("manpower_actual")
          .upsert({ year, month, week: form.week, tower: currentTower, actual: form.actual }, { onConflict: "year,month,week,tower" })
        if(error) throw error
      }
      toast.success(editingWeek ? "Updated successfully" : "Saved successfully")
      setForm({week:1, tower: currentTower})
      setEditingWeek(null)
      fetchData()
    } catch(err){
      console.error(err)
      toast.error("Error saving data")
    }
  }

  const handleEdit = (week:number) => {
    const plan = planRows.find(r=>r.week===week)
    const act = actualRows.find(r=>r.week===week)
    setForm({week, tower, planned:plan?.planned, actual:act?.actual})
    setEditingWeek(week)
    setDuplicateWeek(null)
  }

  const fmt = (v?: number|null) => v==null ? "0.00" : Number(v).toFixed(2)
  const monthlyPlanned = planRows.reduce((s,r)=>s+(r.planned||0),0)
  const monthlyActual = actualRows.reduce((s,r)=>s+(r.actual||0),0)

  const yearlyChartData = allTotals.map(t=>{
    const mt = monthlyTotals[t.month] || {planned:[1], actual:[1]}
    const plannedWeeks = mt.planned.length || 1
    const actualWeeks = mt.actual.length || 1
    return {
      month: months[t.month-1],
      planned: Number((t.planned / plannedWeeks).toFixed(2)),
      actual: Number((t.actual / actualWeeks).toFixed(2))
    }
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Manpower Plan vs Actual (Tower-wise)</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center mb-4 justify-between">
        <div className="flex gap-4 items-center">
          <div className="flex gap-2 items-center">
            <label>Tower</label>
            <select value={tower} onChange={e=>setTower(e.target.value)}>{towers.map(t=><option key={t} value={t}>{t}</option>)}</select>
          </div>
          <div className="flex gap-2 items-center">
            <label>Year</label>
            <Input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} className="w-28"/>
          </div>
          <div className="flex gap-2 items-center">
            <label>Month</label>
            <select value={month} onChange={e=>setMonth(Number(e.target.value))}>{months.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant={viewMode==="monthly"?"default":"outline"} onClick={()=>setViewMode("monthly")}>Monthly</Button>
          <Button variant={viewMode==="yearly"?"default":"outline"} onClick={()=>setViewMode("yearly")}>Yearly</Button>
        </div>
      </div>

      {/* Monthly View */}
      {viewMode==="monthly" ? (
        <>
          {/* Add / Edit Form */}
          <Card className="mb-6">
  <CardHeader>
    <CardTitle>{editingWeek ? `Edit Week ${editingWeek}` : 'Add / Update Week'}</CardTitle>
  </CardHeader>
  <CardContent>
    <form onSubmit={handleSubmit} className="flex gap-4 flex-wrap items-end">
      <div>
        <label className="block text-sm font-medium mb-1">Week</label>
        <Input
          type="number"
          min={1}
          max={5}
          value={form.week}
          onChange={e => setForm(f => ({ ...f, week: Number(e.target.value) }))}
          className="w-24"
          disabled={!!editingWeek}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Planned</label>
        <Input
          type="number"
          step="0.01"
          value={form.planned ?? ''}
          onChange={e => setForm(f => ({ ...f, planned: Number(e.target.value) }))}
          className="w-36"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Actual</label>
        <Input
          type="number"
          step="0.01"
          value={form.actual ?? ''}
          onChange={e => setForm(f => ({ ...f, actual: Number(e.target.value) }))}
          className="w-36"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit">{editingWeek ? 'Update' : 'Save'}</Button>
        {editingWeek && (
          <Button variant="outline" onClick={() => { setEditingWeek(null); setForm({ week: 1, tower }); }}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  </CardContent>
</Card>


          {/* Week-wise Table */}
          <Card>
            <CardHeader><CardTitle>Week-wise Table ({months[month-1]} {year})</CardTitle></CardHeader>
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
                    <TableCell>Total</TableCell>
                    <TableCell>{monthlyPlanned.toFixed(2)}</TableCell>
                    <TableCell>{monthlyActual.toFixed(2)}</TableCell>
                    <TableCell/>
                  </TableRow>
                  <TableRow className="font-semibold bg-gray-50">
                    <TableCell>Avg per Week</TableCell>
                    <TableCell>{(monthlyPlanned/5).toFixed(2)}</TableCell>
                    <TableCell>{(monthlyActual/5).toFixed(2)}</TableCell>
                    <TableCell/>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Yearly Chart */}
          <Card className="mb-6">
            <CardHeader><CardTitle>Yearly Planned vs Actual ({year}, {tower})</CardTitle></CardHeader>
            <CardContent className="h-96">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyChartData} margin={{top:20, right:30, left:0, bottom:5}}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="month"/>
                <YAxis/>
                <Tooltip formatter={(value:number, name:string) => [`${value.toFixed(2)}`, `Average ${name} per Week`]} />
                <Legend/>
                <Bar dataKey="planned" fill="#8884d8"/>
                <Bar dataKey="actual" fill="#82ca9d"/>
              </BarChart>
             </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Yearly Table */}
          <Card>
            <CardHeader><CardTitle>Yearly Summary Table ({year}, {tower})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Total Planned</TableHead>
                    <TableHead>Total Actual</TableHead>
                    <TableHead>Average Planned</TableHead>
                    <TableHead>Average Actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allTotals.map(t=>(
                    <TableRow key={t.month}>
                      <TableCell>{months[t.month-1]}</TableCell>
                      <TableCell>{fmt(t.planned)}</TableCell>
                      <TableCell>{fmt(t.actual)}</TableCell>
                      <TableCell>{fmt(t.avgPlanned)}</TableCell>
                      <TableCell>{fmt(t.avgActual)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Duplicate Week Modal */}
      <Dialog open={!!duplicateWeek} onOpenChange={()=>setDuplicateWeek(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Already Exists</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-gray-700">
            A record for <strong>Week {duplicateWeek}</strong>, {months[month-1]} {year}, {tower} already exists.
          </div>
          <DialogFooter className="flex gap-2">
            <Button onClick={()=>duplicateWeek!==null && handleEdit(duplicateWeek)}>Edit Record</Button>
            <Button variant="outline" onClick={()=>setDuplicateWeek(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
