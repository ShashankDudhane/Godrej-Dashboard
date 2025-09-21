'use client'

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Pencil, Loader2 } from "lucide-react" 
import { Users } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" 

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [duplicateWeek, setDuplicateWeek] = useState<number|null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      // Monthly Data Fetch
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
    setIsSubmitting(true)
    const currentTower = tower

    if(!editingWeek){
      const exists = planRows.some(r=>r.week===form.week) || actualRows.some(r=>r.week===form.week)
      if(exists){
        setIsSubmitting(false)
        setDuplicateWeek(form.week)
        return
      }
    }

    try {
      if(form.planned !== undefined && !isNaN(form.planned)){
        const { error } = await supabase.from("manpower_plan")
          .upsert({ year, month, week: form.week, tower: currentTower, planned: form.planned }, { onConflict: "year,month,week,tower" })
        if(error) throw error
      }
      if(form.actual !== undefined && !isNaN(form.actual)){
        const { error } = await supabase.from("manpower_actual")
          .upsert({ year, month, week: form.week, tower: currentTower, actual: form.actual }, { onConflict: "year,month,week,tower" })
        if(error) throw error
      }
      toast.success(editingWeek ? "Updated successfully" : "Saved successfully")
      setForm({week:1, tower: currentTower, planned: undefined, actual: undefined})
      setEditingWeek(null)
      fetchData()
    } catch(err){
      console.error(err)
      toast.error("Error saving data")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (week:number) => {
    const plan = planRows.find(r=>r.week===week)
    const act = actualRows.find(r=>r.week===week)
    setForm({week, tower, planned:plan?.planned, actual:act?.actual})
    setEditingWeek(week)
    setDuplicateWeek(null)
  }

  const fmt = (v?: number|null) => v==null || isNaN(v) ? "0.00" : Number(v).toFixed(2)
  const monthlyPlanned = planRows.reduce((s,r)=>s+(r.planned||0),0)
  const monthlyActual = actualRows.reduce((s,r)=>s+(r.actual||0),0)

  const yearlyChartData = allTotals.map(t=>{
    const mt = monthlyTotals[t.month] || {planned:[], actual:[]}
    const plannedWeeks = mt.planned.length || 1
    const actualWeeks = mt.actual.length || 1
    return {
      month: months[t.month-1],
      Planned_Avg: Number((t.planned / plannedWeeks).toFixed(2)),
      Actual_Avg: Number((t.actual / actualWeeks).toFixed(2))
    }
  })

  // Function to format dataKey for Tooltip and Legend
  const formatChartKey = (name: string) => {
    return name.replace('_Avg', ' Average').replace('Planned', 'Planned').replace('Actual', 'Actual');
  };


  // Loading Overlay
  if(loading){
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mr-2" />
        <span className="text-lg font-semibold text-gray-700">Loading Dashboard...</span>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen font-sans space-y-8">
      <header className="pb-4 border-b border-gray-200">
    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
        Manpower Plan vs Actual (Tower-wise)
        <Users className="w-8 h-8 text-blue-600" /> {/* Added the Users icon */}
    </h1>
    <p className="text-sm text-gray-500 mt-1">Track and update weekly manpower data for {tower}</p>
</header>

      {/* Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white rounded-xl shadow-md">
        <div className="flex flex-wrap gap-6 items-center">
          
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium text-gray-700">Tower:</label>
            <Select value={tower} onValueChange={setTower}>
              <SelectTrigger className="w-[100px] border-gray-300">
                <SelectValue placeholder="Tower" />
              </SelectTrigger>
              <SelectContent>
                {towers.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium text-gray-700">Year:</label>
            <Input 
                type="number" 
                value={year} 
                onChange={e=>setYear(Number(e.target.value))} 
                className="w-24 border-gray-300"
                min={2000}
            />
          </div>
          
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium text-gray-700">Month:</label>
            <Select value={String(month)} onValueChange={v=>setMonth(Number(v))}>
              <SelectTrigger className="w-[120px] border-gray-300">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m,i)=><SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex gap-2 p-1 border border-gray-200 rounded-lg bg-gray-50">
          <Button 
            variant={viewMode==="monthly"?"default":"ghost"} 
            onClick={()=>setViewMode("monthly")}
            className={viewMode === "monthly" ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" : "text-gray-600"}
          >
            Monthly View
          </Button>
          <Button 
            variant={viewMode==="yearly"?"default":"ghost"} 
            onClick={()=>setViewMode("yearly")}
            className={viewMode === "yearly" ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" : "text-gray-600"}
          >
            Yearly View
          </Button>
        </div>
      </div>

      {/* --- */}

      {/* Monthly View */}
      {viewMode==="monthly" ? (
        <div className="space-y-8">
          {/* Add / Edit Form */}
          <Card className="shadow-lg border-t-4 border-t-indigo-500">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800">
                {editingWeek ? `Edit Manpower Data for Week ${editingWeek}` : 'Add New Manpower Data'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-wrap gap-6 items-end">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Week</label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={form.week}
                    onChange={e => setForm(f => ({ ...f, week: Number(e.target.value) }))}
                    className="w-24 border-gray-300"
                    disabled={!!editingWeek || isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Planned</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.planned ?? ''}
                    onChange={e => setForm(f => ({ ...f, planned: Number(e.target.value) }))}
                    className="w-36 border-gray-300"
                    placeholder="e.g. 50.00"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Actual</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.actual ?? ''}
                    onChange={e => setForm(f => ({ ...f, actual: Number(e.target.value) }))}
                    className="w-36 border-gray-300"
                    placeholder="e.g. 48.50"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 shadow-md"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingWeek ? 'Update' : 'Save'}
                  </Button>
                  {editingWeek && (
                    <Button 
                      variant="outline" 
                      onClick={() => { setEditingWeek(null); setForm({ week: 1, tower, planned: undefined, actual: undefined }); }}
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

          {/* Week-wise Table */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800">
                Week-wise Manpower Data ({months[month-1]} {year})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-gray-100">
                  <TableRow className="hover:bg-gray-100">
                    <TableHead className="text-gray-700 font-bold">Week</TableHead>
                    <TableHead className="text-center text-gray-700 font-bold">Planned</TableHead>
                    <TableHead className="text-center text-gray-700 font-bold">Actual</TableHead>
                    <TableHead className="text-center text-gray-700 font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1,2,3,4,5].map(w=>{
                    const p = planRows.find(r=>r.week===w)
                    const a = actualRows.find(r=>r.week===w)
                    return (
                      <TableRow key={w} className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50 transition-colors">
                        <TableCell className="font-medium">W{w}</TableCell>
                        <TableCell className="text-center text-red-600 font-medium">{fmt(p?.planned)}</TableCell>
                        <TableCell className="text-center text-green-600 font-medium">{fmt(a?.actual)}</TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="ghost" onClick={()=>handleEdit(w)} className="text-indigo-600 hover:bg-indigo-100 p-2">
                            <Pencil className="w-4 h-4"/>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="font-bold bg-indigo-50 border-t-2 border-indigo-200 hover:bg-indigo-100">
                    <TableCell className="text-gray-900">Total Manpower</TableCell>
                    <TableCell className="text-center text-red-700">{monthlyPlanned.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-green-700">{monthlyActual.toFixed(2)}</TableCell>
                    <TableCell/>
                  </TableRow>
                  <TableRow className="font-semibold bg-indigo-100 hover:bg-indigo-200">
                    <TableCell className="text-gray-800">Avg per Week</TableCell>
                    <TableCell className="text-center text-red-600">{(monthlyPlanned/5).toFixed(2)}</TableCell>
                    <TableCell className="text-center text-green-600">{(monthlyActual/5).toFixed(2)}</TableCell>
                    <TableCell/>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Yearly View */
        <div className="space-y-8">
          {/* Yearly Chart */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800">
                Yearly Average Manpower ({year}, {tower})
              </CardTitle>
              <p className="text-sm text-gray-500">Average manpower per week for each month</p>
            </CardHeader>
            <CardContent className="h-[450px] p-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyChartData} margin={{top:20, right:10, left:0, bottom:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                  <XAxis 
                    dataKey="month" 
                    stroke="#333" 
                    tick={{ fill: "#4B5563", fontWeight: 500, fontSize: 12 }} 
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#333"
                    tick={{ fill: "#4B5563", fontWeight: 500, fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: "rgba(103, 110, 240, 0.1)" }}
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}
                    formatter={(value:number, name:string) => [`${value.toFixed(2)}`, formatChartKey(name)]} 
                  />
                  {/* FIX: Removed the custom payload prop to resolve the TypeScript error. 
                      Added a 'formatter' prop to Legend for cleaner labels. */}
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px' }}
                    iconType="circle"
                    formatter={(value: string) => <span className="text-gray-700 font-medium">{formatChartKey(value)}</span>}
                  />
                  <Bar dataKey="Planned_Avg" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={25} name="Planned Average"/>
                  <Bar dataKey="Actual_Avg" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={25} name="Actual Average"/>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Yearly Table */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800">
                Yearly Summary Table ({year}, {tower})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-gray-100">
                  <TableRow className="hover:bg-gray-100">
                    <TableHead className="text-gray-700 font-bold">Month</TableHead>
                    <TableHead className="text-center text-gray-700 font-bold">Total Planned</TableHead>
                    <TableHead className="text-center text-gray-700 font-bold">Total Actual</TableHead>
                    <TableHead className="text-center text-gray-700 font-bold">Average Planned</TableHead>
                    <TableHead className="text-center text-gray-700 font-bold">Average Actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allTotals.map(t=>(
                    <TableRow key={t.month} className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50 transition-colors">
                      <TableCell className="font-medium">{months[t.month-1]}</TableCell>
                      <TableCell className="text-center text-red-600">{fmt(t.planned)}</TableCell>
                      <TableCell className="text-center text-green-600">{fmt(t.actual)}</TableCell>
                      <TableCell className="text-center text-red-500">{fmt(t.avgPlanned)}</TableCell>
                      <TableCell className="text-center text-green-500">{fmt(t.avgActual)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Duplicate Week Modal */}
      <Dialog open={!!duplicateWeek} onOpenChange={()=>setDuplicateWeek(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-lg shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">Record Already Exists</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-gray-700">
            A record for **Week {duplicateWeek}**, {months[month-1]} {year}, **{tower}** already exists.
            <p className="mt-2 text-sm text-gray-500">Would you like to edit the existing record?</p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={()=>{
                if(duplicateWeek !== null) handleEdit(duplicateWeek);
                setDuplicateWeek(null); // Close modal after action
              }}
            >
              Edit Existing Record
            </Button>
            <Button 
              variant="outline" 
              onClick={()=>setDuplicateWeek(null)}
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