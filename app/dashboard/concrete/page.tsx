'use client'

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Pencil } from "lucide-react"
import { Hammer } from "lucide-react"
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
import { Label } from "@/components/ui/label"

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
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-6 text-gray-900  pb-2 tracking-tight flex items-center gap-3">
    Concrete Plan vs Actual (Tower-wise)
    <Hammer className="w-8 h-8 text-sky-600" /> {/* Added the Hammer icon */}
</h1>

      <div className="flex flex-wrap items-center mb-6 gap-4 justify-between bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Tower Selection */}
          <div className="flex flex-col space-y-1">
            <Label htmlFor="tower-select" className="text-xs font-medium text-gray-600">Tower</Label>
            <Select value={tower} onValueChange={setTower}>
              <SelectTrigger id="tower-select" className="w-[120px]">
                <SelectValue placeholder="Select Tower" />
              </SelectTrigger>
              <SelectContent>
                {towers.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Year Input */}
          <div className="flex flex-col space-y-1">
            <Label htmlFor="year-input" className="text-xs font-medium text-gray-600">Year</Label>
            <Input type="number" id="year-input" value={year} onChange={e=>setYear(Number(e.target.value))} className="w-28" min={2000}/>
          </div>
          
          {/* Month Selection */}
          <div className="flex flex-col space-y-1">
            <Label htmlFor="month-select" className="text-xs font-medium text-gray-600">Month</Label>
            <Select value={String(month)} onValueChange={v=>setMonth(Number(v))}>
              <SelectTrigger id="month-select" className="w-[120px]">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m,idx)=><SelectItem key={idx} value={String(idx+1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 items-center">
          <Button variant={viewMode==="monthly"?"default":"outline"} onClick={()=>setViewMode("monthly")} className={viewMode==="monthly" ? "bg-sky-600 hover:bg-sky-700" : "text-gray-700"}>Monthly View</Button>
          <Button variant={viewMode==="yearly"?"default":"outline"} onClick={()=>setViewMode("yearly")} className={viewMode==="yearly" ? "bg-sky-600 hover:bg-sky-700" : "text-gray-700"}>Yearly View</Button>
        </div>
      </div>

      {viewMode==="monthly" ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Data Input Card */}
          <Card className="shadow-lg border-t-4 border-sky-500">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800">
                {editingWeek ? `Edit Week ${editingWeek}` : 'Add / Update Weekly Data'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex gap-4 flex-wrap items-end">
                <div className="flex flex-col space-y-1">
                  <Label className="text-sm font-medium">Week</Label>
                  <Input type="number" min={1} max={5} value={form.week} disabled={!!editingWeek} onChange={e=>setForm(f=>({...f, week:Number(e.target.value)}))} className="w-24 text-center disabled:bg-gray-100"/>
                </div>
                <div className="flex flex-col space-y-1">
                  <Label className="text-sm font-medium">Planned ($m^3$)</Label>
                  <Input type="number" step="0.001" value={form.planned??''} placeholder="0.000" onChange={e=>setForm(f=>({...f, planned:Number(e.target.value)}))} className="w-36"/>
                </div>
                <div className="flex flex-col space-y-1">
                  <Label className="text-sm font-medium">Actual ($m^3$)</Label>
                  <Input type="number" step="0.001" value={form.actual??''} placeholder="0.000" onChange={e=>setForm(f=>({...f, actual:Number(e.target.value)}))} className="w-36"/>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="bg-sky-600 hover:bg-sky-700">
                    {editingWeek ? 'Update' : 'Save'}
                  </Button>
                  {editingWeek && <Button variant="outline" onClick={()=>{setEditingWeek(null); setForm({week:1})}}>Cancel</Button>}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Week-wise table Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800">
                {months[month-1]} - {year} ({tower}) Weekly Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="w-[100px] text-gray-700">Week</TableHead>
                    <TableHead className="text-right text-sky-600">Planned ($m^3$)</TableHead>
                    <TableHead className="text-right text-green-600">Actual ($m^3$)</TableHead>
                    <TableHead className="text-center text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1,2,3,4,5].map(w=>{
                    const p = planRows.find(r=>r.week===w)
                    const a = actualRows.find(r=>r.week===w)
                    return (
                      <TableRow key={w} className="hover:bg-sky-50/50">
                        <TableCell className="font-medium text-gray-700">W{w}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(p?.planned)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(a?.actual)}</TableCell>
                        <TableCell className="text-center">
                          <Button size="icon" variant="ghost" onClick={()=>handleEdit(w)} className="text-sky-600 hover:text-sky-700">
                            <Pencil className="w-4 h-4"/>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="font-bold bg-sky-50 border-t-2 border-sky-200">
                    <TableCell className="text-sky-700">Total (Month)</TableCell>
                    <TableCell className="text-right font-mono text-sky-700">{monthlyPlanned.toFixed(3)}</TableCell>
                    <TableCell className="text-right font-mono text-sky-700">{monthlyActual.toFixed(3)}</TableCell>
                    <TableCell/>
                  </TableRow>
                  <TableRow className="font-bold bg-yellow-50 border-t-2 border-yellow-200">
                    <TableCell className="text-yellow-800">Cumulative (YTD)</TableCell>
                    <TableCell className="text-right font-mono text-yellow-800">{fmt(cumulative?.planned)}</TableCell>
                    <TableCell className="text-right font-mono text-yellow-800">{fmt(cumulative?.actual)}</TableCell>
                    <TableCell/>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Yearly View
        <div className="space-y-6">
          {/* Yearly Chart Card */}
          <Card className="shadow-lg border-t-4 border-sky-500">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800">Yearly Monthly Progress ({year}, {tower})</CardTitle>
            </CardHeader>
            <CardContent className="h-[450px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyChartData} margin={{top:20, right:10, left:0, bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                  <XAxis dataKey="month" stroke="#333"/>
                  <YAxis stroke="#333" axisLine={false} tickLine={false}/>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'white' }}
                    labelStyle={{ fontWeight: 'bold' }}
                    formatter={(value: number, name: string) => [`${value.toFixed(3)} m³`, name.includes('cumulative') ? name.replace('cumulative', 'Cum.') : name]}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }}/>
                  <Bar dataKey="planned" name="Monthly Planned" fill="#0ea5e9" radius={[4, 4, 0, 0]}/> {/* Sky-500 */}
                  <Bar dataKey="actual" name="Monthly Actual" fill="#10b981" radius={[4, 4, 0, 0]}/>   {/* Emerald-500 */}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Yearly Summary Table Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800">Cumulative Summary Table ({year}, {tower})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="w-[120px] text-gray-700">Month</TableHead>
                    <TableHead className="text-right text-sky-600">Planned (Month, $m^3$)</TableHead>
                    <TableHead className="text-right text-green-600">Actual (Month, $m^3$)</TableHead>
                    <TableHead className="text-right text-blue-800">Cumulative Planned ($m^3$)</TableHead>
                    <TableHead className="text-right text-blue-800">Cumulative Actual ($m^3$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allTotals.map(t=>(
                    <TableRow key={t.month} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-gray-700">{months[t.month-1]}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(t.monthlyPlanned)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(t.monthlyActual)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-blue-700">{fmt(t.planned)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-blue-700">{fmt(t.actual)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-sky-100 border-t-2 border-sky-300">
                    <TableCell className="text-sky-800">Year Total</TableCell>
                    <TableCell className="text-right font-mono">{fmt(allTotals.at(-1)?.monthlyPlanned)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(allTotals.at(-1)?.monthlyActual)}</TableCell>
                    <TableCell className="text-right font-mono text-sky-800">{fmt(allTotals.at(-1)?.planned)}</TableCell>
                    <TableCell className="text-right font-mono text-sky-800">{fmt(allTotals.at(-1)?.actual)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Duplicate Modal */}
      {duplicateModal && (
        <Dialog open={true} onOpenChange={() => setDuplicateModal(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-600">Warning: Record Already Exists</DialogTitle>
            </DialogHeader>
            <div className="py-4 text-gray-700 space-y-2">
              <p>A **{duplicateModal.type.toUpperCase()}** record already exists for:</p>
              <ul className="list-disc list-inside ml-2 font-semibold">
                <li>Week: {duplicateModal.week}</li>
                <li>Month: {months[month-1]} {year}</li>
                <li>Tower: {tower}</li>
              </ul>
              <p>Do you want to **Edit** the existing record instead?</p>
            </div>
            <DialogFooter className="flex gap-2">
              <Button onClick={() => { handleEdit(duplicateModal.week); setDuplicateModal(null) }} className="bg-sky-600 hover:bg-sky-700">Edit Existing Record</Button>
              <Button variant="outline" onClick={() => setDuplicateModal(null)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  )
}