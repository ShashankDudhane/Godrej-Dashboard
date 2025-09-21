'use client'

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// Using new Lucide icons for a cohesive look
import { Pencil, Trash2, ChevronLeft, ChevronRight, Ban, HardHat, ListPlus, LayoutGrid } from "lucide-react" 
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

// --- Type Definitions and Constants ---

const tabs = ["Tower1", "Tower2", "Tower3", "Tower4", "Other Inputs"] as const
type TowerTab = typeof tabs[number]

type Hindrance = {
  id?: number
  tower: string
  sr_no: number
  item_particulars: string
  start_from: string
  resolved_on: string
  period_in_days: number
  reason_shortfall: string
  remarks: string
}

type OtherInput = {
  id?: number
  sr_no: number
  content: string
}

type RowType = Hindrance | OtherInput

// --- Main Component ---

export default function HindrancesPage() {
  const [activeTab, setActiveTab] = useState<TowerTab>("Tower1")
  const [form, setForm] = useState<Partial<RowType>>({}) 
  const [rows, setRows] = useState<RowType[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [modalContent, setModalContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number | "all">(10)

  // --- Data Fetching ---
  useEffect(() => {
    fetchData()
    setEditingId(null)
    setForm({})
    setCurrentPage(1) // reset page on tab change
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === "Other Inputs") {
        const { data, error } = await supabase
          .from("other_inputs")
          .select("*")
          .order("sr_no", { ascending: true }) // Order by sr_no for Other Inputs
        if (error) throw error
        setRows(data ?? [])
      } else {
        const { data, error } = await supabase
          .from("hindrances")
          .select("*")
          .eq("tower", activeTab.toLowerCase())
          .order("sr_no", { ascending: true }) // Order by sr_no for Hindrances
        if (error) throw error
        setRows(data ?? [])
      }
    } catch (err) {
      console.error("Fetch Error:", err)
      toast.error("Error fetching data")
    } finally {
      setLoading(false)
    }
  }

  // --- Form Submission (Save/Update) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (activeTab === "Other Inputs") {
        // Type cast form to OtherInput for type safety
        const otherForm = form as Partial<OtherInput>;
        const payload: Omit<OtherInput, 'id'> = {
          sr_no: Number(otherForm.sr_no) || 0,
          content: otherForm.content || ""
        }

        if (editingId !== null) {
          const { error } = await supabase
            .from("other_inputs")
            .update(payload)
            .eq("id", editingId)
          if (error) throw error
          toast.success("Updated successfully! 🎉")
          setEditingId(null)
        } else {
          const { error } = await supabase
            .from("other_inputs")
            .insert([{...payload}])
          if (error) throw error
          toast.success("Saved successfully! ✅")
        }
      } else {
        // Type cast form to Hindrance for type safety
        const hindranceForm = form as Partial<Hindrance>;
        const payload: Omit<Hindrance, 'id'> = {
          tower: activeTab.toLowerCase(),
          sr_no: Number(hindranceForm.sr_no) || 0,
          item_particulars: hindranceForm.item_particulars || "",
          start_from: hindranceForm.start_from || "",
          resolved_on: hindranceForm.resolved_on || "",
          period_in_days: Number(hindranceForm.period_in_days) || 0,
          reason_shortfall: hindranceForm.reason_shortfall || "",
          remarks: hindranceForm.remarks || "",
        }

        if (editingId !== null) {
          const { error } = await supabase
            .from("hindrances")
            .update(payload)
            .eq("id", editingId)
          if (error) throw error
          toast.success("Updated successfully! 🎉")
          setEditingId(null)
        } else {
          const { error } = await supabase
            .from("hindrances")
            .insert([{...payload}])
          if (error) throw error
          toast.success("Saved successfully! ✅")
        }
      }

      setForm({})
      fetchData()
    } catch (err) {
      console.error("Submission Error:", err)
      toast.error("Error saving data 🙁")
    }
  }

  // --- Edit & Delete Handlers ---
  const handleEdit = (row: RowType) => {
    if (!row.id) return
    setEditingId(row.id)
    setForm(row)
  }

  const handleDelete = async () => {
    if (deleteId === null) return
    try {
      const table = activeTab === "Other Inputs" ? "other_inputs" : "hindrances"
      const { error } = await supabase.from(table).delete().eq("id", deleteId)
      if (error) throw error
      toast.success("Deleted successfully! 🗑️")
      setDeleteId(null)
      fetchData()
    } catch (err) {
      console.error("Delete Error:", err)
      toast.error("Error deleting data 🚫")
    }
  }

  // --- Column and Pagination Logic ---
  const columns = useMemo(() => {
    return activeTab === "Other Inputs"
      ? ["sr_no", "content"]
      : ["sr_no", "item_particulars", "start_from", "resolved_on", "period_in_days", "reason_shortfall", "remarks"]
  }, [activeTab])

  // Pagination calculations
  const totalPages = pageSize === "all" ? 1 : Math.ceil(rows.length / Number(pageSize))
  const paginatedRows = useMemo(() => {
    if (pageSize === "all") {
      return rows
    }
    const start = (currentPage - 1) * Number(pageSize)
    const end = currentPage * Number(pageSize)
    return rows.slice(start, end)
  }, [rows, currentPage, pageSize])

  // Helper for formatting date (optional, but good practice)
  const formatDate = (dateString: string) => {
      if (!dateString) return '—'
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // --- Rendering ---
  return (
    <div className="p-4 md:p-10 bg-slate-50 min-h-screen">
      
      {/* Header */}
      <h1 className="text-3xl lg:text-4xl font-extrabold mb-10 text-gray-900 pb-3 tracking-tight flex items-center gap-3 ">
        <HardHat className="w-8 h-8 text-sky-600" />
        Hindrances & Other Inputs Management
      </h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-2">
        {tabs.map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "ghost"}
            className={activeTab === tab 
              ? "bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-300/50 transition-all duration-200 ease-in-out" 
              : "text-gray-700 hover:bg-sky-100 hover:text-sky-700 transition-colors duration-200"
            }
            onClick={() => setActiveTab(tab)}
          >
            {tab === "Other Inputs" ? <ListPlus className="w-4 h-4 mr-2" /> : <LayoutGrid className="w-4 h-4 mr-2" />}
            {tab}
          </Button>
        ))}
      </div>

      {/* Form Card */}
      <Card className="mb-10 border-t-4 border-sky-600 shadow-xl transition-shadow duration-300 hover:shadow-2xl hover:shadow-sky-300/60">
        <CardHeader className="bg-sky-50/50 border-b border-sky-100">
          <CardTitle className="text-2xl font-bold text-sky-800 flex items-center">
            <Pencil className="w-5 h-5 mr-2" />
            {editingId ? `Edit ${activeTab} Record` : `Add New ${activeTab} Record`}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* SR No */}
            <div className="flex flex-col space-y-1">
              <label htmlFor="sr_no" className="font-semibold text-sm text-gray-700">Sr No <span className="text-red-500">*</span></label>
              <Input
                id="sr_no"
                placeholder="Serial Number"
                type="number"
                value={form.sr_no ?? ""}
                onChange={(e) => setForm({ ...form, sr_no: Number(e.target.value) })}
                required
                className="border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all duration-200"
              />
            </div>

            {activeTab === "Other Inputs" ? (
              /* Other Inputs Fields */
              <div className="flex flex-col space-y-1 md:col-span-2">
                <label htmlFor="content" className="font-semibold text-sm text-gray-700">Content <span className="text-red-500">*</span></label>
                <Input
                  id="content"
                  placeholder="Enter content details for other inputs"
                  value={(form as Partial<OtherInput>).content ?? ""} 
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  required
                  className="border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all duration-200"
                />
              </div>
            ) : (
              /* Hindrance Fields */
              <>
                <div className="flex flex-col space-y-1">
                  <label htmlFor="item_particulars" className="font-semibold text-sm text-gray-700">Item / Particulars <span className="text-red-500">*</span></label>
                  <Input
                    id="item_particulars"
                    placeholder="e.g. Concrete delay, Material issue"
                    value={(form as Partial<Hindrance>).item_particulars ?? ""}
                    onChange={(e) => setForm({ ...form, item_particulars: e.target.value })}
                    required
                    className="border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label htmlFor="start_from" className="font-semibold text-sm text-gray-700">Start From <span className="text-red-500">*</span></label>
                  <Input
                    id="start_from"
                    type="date"
                    value={(form as Partial<Hindrance>).start_from ?? ""}
                    onChange={(e) => setForm({ ...form, start_from: e.target.value })}
                    required
                    className="border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label htmlFor="resolved_on" className="font-semibold text-sm text-gray-700">Resolved On <span className="text-red-500">*</span></label>
                  <Input
                    id="resolved_on"
                    type="date"
                    value={(form as Partial<Hindrance>).resolved_on ?? ""}
                    onChange={(e) => setForm({ ...form, resolved_on: e.target.value })}
                    required
                    className="border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label htmlFor="period_in_days" className="font-semibold text-sm text-gray-700">Period (Days) <span className="text-red-500">*</span></label>
                  <Input
                    id="period_in_days"
                    type="number"
                    placeholder="Period in Days"
                    value={(form as Partial<Hindrance>).period_in_days ?? ""}
                    onChange={(e) => setForm({ ...form, period_in_days: Number(e.target.value) })}
                    required
                    className="border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label htmlFor="reason_shortfall" className="font-semibold text-sm text-gray-700">Reason for Shortfall <span className="text-red-500">*</span></label>
                  <Input
                    id="reason_shortfall"
                    placeholder="e.g. Labour shortage, Design change"
                    value={(form as Partial<Hindrance>).reason_shortfall ?? ""}
                    onChange={(e) => setForm({ ...form, reason_shortfall: e.target.value })}
                    required
                    className="border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label htmlFor="remarks" className="font-semibold text-sm text-gray-700">Remarks</label>
                  <Input
                    id="remarks"
                    placeholder="Additional notes"
                    value={(form as Partial<Hindrance>).remarks ?? ""}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                    className="border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all duration-200"
                  />
                </div>
              </>
            )}

            <div className="lg:col-span-3 pt-4 flex gap-4">
              <Button 
                type="submit" 
                className="flex-1 bg-sky-600 hover:bg-sky-700 transition-colors duration-200 shadow-lg hover:shadow-xl hover:shadow-sky-300/70"
              >
                {editingId ? "Update Entry" : "Save New Entry"}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-1/4 text-gray-600 border-gray-300 hover:bg-gray-100 transition-colors duration-200"
                  onClick={() => { setEditingId(null); setForm({}) }}
                >
                  <Ban className="w-4 h-4 mr-2" /> Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="shadow-2xl">
        <CardHeader className="bg-sky-50/50 border-b border-sky-100">
          <CardTitle className="text-2xl font-bold text-sky-800">
            {activeTab} Records List
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-inner">
            {loading ? (
              <div className="text-center p-12 text-sky-500 text-lg font-medium">Loading records... 🔄</div>
            ) : (
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-sky-100 hover:bg-sky-100/90 border-b-2 border-sky-200">
                    {columns.map((col) => (
                      <TableHead
                        key={col}
                        className="truncate max-w-[180px] text-sm font-extrabold text-sky-900 uppercase tracking-wider py-4"
                      >
                        {col.replaceAll("_", " ").toUpperCase()}
                      </TableHead>
                    ))}
                    <TableHead className="w-28 text-center text-sm font-extrabold text-sky-900 uppercase tracking-wider py-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.length > 0 ? (
                    paginatedRows.map((row) => (
                      <TableRow 
                        key={row.id} 
                        className="hover:bg-sky-50/50 transition-colors duration-150 border-b border-gray-100"
                      >
                        {columns.map((col) => {
                          const value = (row as any)[col] ?? ""
                          const isLong = typeof value === 'string' && value.length > 50
                          const isDate = col.includes('from') || col.includes('on');
                          const displayValue = isDate && value ? formatDate(value) : value;

                          return (
                            <TableCell key={col} className="max-w-[200px] text-sm text-gray-800 py-3 align-top font-medium">
                              {isLong ? (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="inline-block max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                                    {String(displayValue).slice(0, 50)}...
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-sky-300 text-sky-600 hover:bg-sky-100 rounded-full"
                                    onClick={() => setModalContent(String(displayValue))}
                                  >
                                    View
                                  </Button>
                                </div>
                              ) : (
                                <span>{displayValue}</span>
                              )}
                            </TableCell>
                          )
                        })}
                        <TableCell className="py-3 align-top">
                          <div className="flex gap-2 justify-center">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="text-sky-600 hover:bg-sky-200/50 rounded-full transition-all duration-200" 
                              onClick={() => handleEdit(row)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="text-red-600 hover:bg-red-200/50 rounded-full transition-all duration-200" 
                              onClick={() => setDeleteId(row.id!)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length + 1} className="text-center py-12 text-gray-500 italic text-base bg-white">
                        No records found for **{activeTab}**. Start by adding a new entry! 🚀
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between mt-8 p-4 bg-sky-50 rounded-lg border border-sky-200 shadow-md">
            <div className="flex items-center gap-4 mb-3 sm:mb-0">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Rows per page:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value === "all" ? "all" : Number(e.target.value))
                  setCurrentPage(1) // Reset page on size change
                }}
                className="border border-sky-300 rounded-md shadow-sm px-3 py-1.5 text-sm focus:ring-sky-500 focus:border-sky-500 bg-white transition-all duration-200"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value="all">All</option>
              </select>
            </div>
            {pageSize !== "all" && rows.length > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-sky-700">
                  Showing {Math.min(rows.length, (currentPage - 1) * Number(pageSize) + 1)}–{Math.min(rows.length, currentPage * Number(pageSize))} of {rows.length} records.
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  className="w-9 h-9 text-sky-600 border-sky-300 hover:bg-sky-100 rounded-full transition-all duration-200"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="w-9 h-9 text-sky-600 border-sky-300 hover:bg-sky-100 rounded-full transition-all duration-200"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-xl shadow-2xl border-t-4 border-red-500">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-2xl font-bold text-red-700 flex items-center">
              <Trash2 className="w-6 h-6 mr-2" /> Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-gray-700 text-base">
              Are you absolutely sure you want to **permanently delete** this entry? This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 p-4 bg-gray-50 border-t">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="text-gray-600 hover:bg-gray-200">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="bg-red-600 hover:bg-red-700 transition-colors shadow-lg">Delete Permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal for full cell content */}
      <Dialog open={modalContent !== null} onOpenChange={() => setModalContent(null)}>
        <DialogContent className="sm:max-w-[600px] rounded-xl shadow-2xl border-t-4 border-sky-500">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-2xl font-bold text-sky-700">Full Content View</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <div className="max-h-96 overflow-y-auto p-4 bg-gray-100 border border-gray-200 rounded-lg shadow-inner">
              <p className="whitespace-pre-wrap break-words text-gray-800 text-sm leading-relaxed">{modalContent}</p>
            </div>
          </div>
          <DialogFooter className="flex justify-end p-4 bg-gray-50 border-t">
            <Button onClick={() => setModalContent(null)} className="bg-sky-600 hover:bg-sky-700 shadow-lg">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}