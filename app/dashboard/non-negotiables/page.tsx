"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@supabase/supabase-js"
import { Pencil, Trash2, CheckCircle, XCircle, Save, X, Loader2, ListTodo, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"

// --- Shadcn/ui Components ---
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label" // Assuming Label component is available

// --- Supabase Client ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// --- Types ---
interface NonNegotiableRecord {
  id: number
  tower: string
  task_description: string
  is_completed: boolean
}

interface FormData {
  tower: string
  task_description: string
  is_completed: boolean
}

// --- Component ---
export default function NonNegotiablesPage() {
  const [records, setRecords] = useState<NonNegotiableRecord[]>([])
  const [formData, setFormData] = useState<FormData>({
    tower: "",
    task_description: "",
    is_completed: false,
  })
  const [editing, setEditing] = useState<NonNegotiableRecord | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<NonNegotiableRecord | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  const totalPages = useMemo(() => Math.ceil(records.length / pageSize), [records.length, pageSize])
  
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = currentPage * pageSize
    return records.slice(start, end)
  }, [records, currentPage, pageSize])
  
  // --- Fetch Records ---
  const fetchRecords = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("monthly_non_negotiables")
      .select("*")
      .order("is_completed", { ascending: true }) // Pending tasks first
      .order("id", { ascending: true })

    if (error) {
      toast.error("Failed to fetch non-negotiable tasks.")
      console.error(error)
    } else {
      setRecords(data || [])
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])
  
  useEffect(() => {
    setCurrentPage(1); // Reset pagination on data refresh
  }, [records.length])

  // --- Form Handling ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }))
  }

  const handleEdit = (rec: NonNegotiableRecord) => {
    setEditing(rec)
    setFormData({
      tower: rec.tower,
      task_description: rec.task_description,
      is_completed: rec.is_completed,
    })
  }

  const resetForm = () => {
    setEditing(null)
    setFormData({
      tower: "",
      task_description: "",
      is_completed: false,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    if (!formData.tower || !formData.task_description) {
      toast.error("Tower/Area and Task Description are required.")
      setIsSubmitting(false)
      return
    }

    const payload = { ...formData }

    try {
        if (editing) {
            const { error } = await supabase
                .from("monthly_non_negotiables")
                .update(payload)
                .eq("id", editing.id)
            
            if (error) throw error
            
            toast.success(`Task for ${editing.tower} updated successfully.`)
        } else {
            const { error } = await supabase.from("monthly_non_negotiables").insert([payload])
            
            if (error) throw error
            
            toast.success(`New non-negotiable task saved for ${formData.tower}.`)
        }
        
        resetForm()
        fetchRecords()
    } catch (error: any) {
        console.error("Supabase Error:", error)
        toast.error(error.message || `Failed to ${editing ? 'update' : 'save'} task.`)
    } finally {
        setIsSubmitting(false)
    }
  }

  // --- Toggle Completion Status ---
  const handleToggleComplete = async (rec: NonNegotiableRecord) => {
    setIsSubmitting(true);
    const newStatus = !rec.is_completed
    
    try {
        const { error } = await supabase
            .from("monthly_non_negotiables")
            .update({ is_completed: newStatus })
            .eq("id", rec.id)

        if (error) throw error
        
        toast.success(`Task status updated to ${newStatus ? "Completed" : "Pending"}.`)
        fetchRecords()
    } catch (error: any) {
        console.error("Supabase Error:", error)
        toast.error(error.message || `Failed to update status for ${rec.tower}.`)
    } finally {
        setIsSubmitting(false)
    }
  }

  // --- Delete Handling ---
  const handleDeleteClick = (rec: NonNegotiableRecord) => {
    setRecordToDelete(rec)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    
    setShowDeleteModal(false)
    setIsSubmitting(true)

    try {
        const { error } = await supabase
            .from("monthly_non_negotiables")
            .delete()
            .eq("id", recordToDelete.id)
            
        if (error) throw error
        
        toast.success(`Task deleted successfully.`)
    } catch (error: any) {
        console.error("Supabase Error:", error)
        toast.error(error.message || "Failed to delete record")
    } finally {
        setRecordToDelete(null)
        setIsSubmitting(false)
        fetchRecords()
    }
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setRecordToDelete(null)
  }

  // --- Render ---
  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen font-sans space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <header className="pb-4 border-b border-gray-300">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center">
          <ListTodo className="w-8 h-8 mr-3 text-red-600" /> Monthly Non-Negotiables
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Track and manage critical, must-do tasks for the current month across all project areas.
        </p>
      </header>

      {/* Form Card */}
      <Card className="shadow-xl border-t-4 border-t-red-600 bg-white">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-red-700">
            {editing ? `Edit Task for ${editing.tower}` : "Add New Non-Negotiable"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div>
              <Label htmlFor="tower" className="block text-sm font-medium mb-1 text-gray-700">Tower/Area</Label>
              <Input
                type="text"
                name="tower"
                id="tower"
                value={formData.tower}
                onChange={handleChange}
                placeholder="e.g., T2, UGWT"
                required
                disabled={isSubmitting}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="task_description" className="block text-sm font-medium mb-1 text-gray-700">Task Description</Label>
              <Input
                type="text"
                name="task_description"
                id="task_description"
                value={formData.task_description}
                onChange={handleChange}
                placeholder="e.g., T2 balance Slab -Pour 3"
                required
                disabled={isSubmitting}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="is_completed"
                checked={formData.is_completed}
                onChange={handleChange}
                id="is_completed_form"
                disabled={isSubmitting}
                className="h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <Label htmlFor="is_completed_form" className="font-medium text-gray-700">Mark as Completed</Label>
            </div>

            <div className="md:col-span-4 flex justify-end space-x-3 mt-2">
              {editing && 
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    disabled={isSubmitting}
                    className="text-gray-600 border-gray-300 hover:bg-gray-100"
                >
                    <X className="w-4 h-4 mr-1" /> Cancel Edit
                </Button>
              }
              <Button
                type="submit"
                className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition duration-150 shadow-md"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : editing ? <><Pencil className="w-4 h-4 mr-2" /> Update Task</> : <><Save className="w-4 h-4 mr-2" /> Save New Task</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">Task List</CardTitle>
          {isLoading && (
              <p className="text-red-600 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading tasks...</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {/* FIX: Combined TableHead elements onto one line to prevent hydration error from whitespace */}
                <TableRow className="bg-gray-100 hover:bg-gray-100 text-sm">
                  <TableHead className="text-left p-4 w-[15%]">Tower/Area</TableHead><TableHead className="text-left p-4 w-[50%]">Task Description</TableHead><TableHead className="text-center p-4 w-[15%]">Status</TableHead><TableHead className="text-center p-4 w-[20%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.map(rec => (
                  /* FIX: Combined TableCell elements onto one line to prevent hydration error from whitespace */
                  <TableRow 
                    key={rec.id} 
                    className={`text-sm transition-colors ${rec.is_completed ? 'bg-green-50/50 hover:bg-green-100' : 'odd:bg-white even:bg-gray-50 hover:bg-red-50'}`}
                  >
                    <TableCell className="p-4 font-semibold text-gray-800">{rec.tower}</TableCell><TableCell className={`p-4 ${rec.is_completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                        {rec.task_description}
                    </TableCell><TableCell className="p-4 text-center">
                        {rec.is_completed ? (
                            <span className="inline-flex items-center px-3 py-1 text-xs font-bold rounded-full bg-green-200 text-green-800">
                                <CheckCircle className="w-4 h-4 mr-1" /> Completed
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-3 py-1 text-xs font-bold rounded-full bg-yellow-200 text-yellow-800 animate-pulse">
                                <XCircle className="w-4 h-4 mr-1" /> Pending
                            </span>
                        )}
                    </TableCell><TableCell className="p-4 text-center">
                      <div className="flex justify-center space-x-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleToggleComplete(rec)} 
                          title={rec.is_completed ? "Mark as Pending" : "Mark as Complete"}
                          disabled={isSubmitting}
                          className={`hover:bg-gray-200 ${rec.is_completed ? 'text-red-500 hover:text-red-600' : 'text-green-500 hover:text-green-600'}`}
                        >
                          {rec.is_completed ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(rec)} title="Edit Task" disabled={isSubmitting} className="text-blue-500 hover:bg-blue-100">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteClick(rec)} title="Delete Task" disabled={isSubmitting} className="text-red-500 hover:bg-red-100">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {paginatedRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center p-6 text-gray-500">
                        No non-negotiable tasks found. Add a new critical task above!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {records.length > pageSize && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Label htmlFor="pageSizeSelect">Rows per page:</Label>
                <select 
                  id="pageSizeSelect"
                  value={pageSize} 
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                  className="border border-gray-300 rounded px-2 py-1 focus:ring-red-500 focus:border-red-500"
                >
                  {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-700">
                <span>Page {currentPage} of {totalPages}</span>
                <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={currentPage === 1 || isSubmitting} 
                    onClick={() => setCurrentPage(p => p - 1)}
                >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={currentPage === totalPages || isSubmitting} 
                    onClick={() => setCurrentPage(p => p + 1)}
                >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Modal (Using Dialog Component) */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-[425px] rounded-lg shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center">
                <Trash2 className="w-5 h-5 mr-2" /> Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-gray-700">
            <p className="mb-4">
              You are about to permanently delete the non-negotiable task for **{recordToDelete?.tower}**.
            </p>
            <p className="italic font-medium text-red-700 bg-red-50 p-3 rounded border border-red-200">
                "{recordToDelete?.task_description}"
            </p>
            <p className="mt-4 text-sm text-gray-500">This action cannot be undone.</p>
          </div>
          <DialogFooter className="flex justify-end gap-3">
            <Button variant="outline" onClick={cancelDelete} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />} Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Global Submitting Overlay (Blocks UI during network ops) */}
      {isSubmitting && (
          <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-[60]">
              <Loader2 className="h-10 w-10 animate-spin text-red-600" />
          </div>
      )}
    </div>
  )
}