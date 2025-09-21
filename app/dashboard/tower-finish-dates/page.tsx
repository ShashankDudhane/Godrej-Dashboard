"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@supabase/supabase-js"
import { Pencil, Trash2, Save, X, ChevronLeft, ChevronRight, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

// --- Shadcn/ui Components ---
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

// --- Supabase Client ---
// NOTE: Assuming NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are correctly available in the environment.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// --- Types ---
interface TowerFinishRecord {
  id: number
  tower: string
  planned_finish: string
  projected_finish: string
  // Changed to number | '' for form input flexibility
  finish_variance_days: number | '' 
}

interface FormData {
  tower: string
  planned_finish: string
  projected_finish: string
  // New field in form data
  finish_variance_days: number | '' 
}

// --- Utility Functions (Removed calculateVariance) ---
// Kept formatDate
const formatDate = (dateString: string) => dateString ? format(new Date(dateString), "dd MMM yyyy") : "N/A"

// Updated to strictly handle number for class generation
const getVarianceClass = (variance: number) => {
  if (variance > 0) return "bg-red-100 text-red-700 font-bold" // Behind Schedule
  if (variance < 0) return "bg-green-100 text-green-700 font-bold" // Ahead of Schedule
  return "bg-blue-100 text-blue-700 font-bold" // On Schedule (Zero variance)
}

// --- Component ---
export default function FinishDatesPage() {
  const [records, setRecords] = useState<TowerFinishRecord[]>([])
  const [formData, setFormData] = useState<FormData>({
    tower: "",
    planned_finish: format(new Date(), "yyyy-MM-dd"),
    projected_finish: format(new Date(), "yyyy-MM-dd"),
    finish_variance_days: 0, // Initial default value
  })
  const [editing, setEditing] = useState<TowerFinishRecord | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<TowerFinishRecord | null>(null)
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
      .from("tower_finish_dates")
      .select("*")
      .order("tower", { ascending: true }) // Order by tower name

    if (error) {
      toast.error("Failed to fetch tower finish records")
      console.error(error)
    } else {
      // Data is directly set, no client-side calculation needed
      setRecords(data as TowerFinishRecord[] || [])
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])
  
  // Reset pagination when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [records])

  // --- Form Handling ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    // Special handling for the variance field to convert to a number
    if (name === 'finish_variance_days') {
      const numValue = value === '' ? '' : parseInt(value, 10);
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleEdit = (rec: TowerFinishRecord) => {
    setEditing(rec)
    setFormData({
      tower: rec.tower,
      planned_finish: rec.planned_finish,
      projected_finish: rec.projected_finish,
      // Load the existing variance value
      finish_variance_days: rec.finish_variance_days, 
    })
  }

  const resetForm = () => {
    setEditing(null)
    setFormData({
      tower: "",
      planned_finish: format(new Date(), "yyyy-MM-dd"),
      projected_finish: format(new Date(), "yyyy-MM-dd"),
      finish_variance_days: 0, // Reset variance as well
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Check for empty fields, including variance
    if (!formData.tower || !formData.planned_finish || !formData.projected_finish || formData.finish_variance_days === '') {
      toast.error("All fields are required.")
      setIsSubmitting(false)
      return
    }

    const payload = { 
      tower: formData.tower,
      planned_finish: formData.planned_finish,
      projected_finish: formData.projected_finish,
      // Ensure it is stored as a number
      finish_variance_days: Number(formData.finish_variance_days), 
    }

    try {
        if (editing) {
            const { error } = await supabase
                .from("tower_finish_dates")
                .update(payload)
                .eq("id", editing.id)

            if (error) throw error
            
            toast.success(`Record for ${editing.tower} updated successfully`)
        } else {
            const { error } = await supabase.from("tower_finish_dates").insert([payload])
            
            if (error) throw error
            
            toast.success(`New record for ${formData.tower} saved successfully`)
        }
        
        resetForm()
        fetchRecords()
    } catch (error: any) {
        console.error("Supabase Error:", error);
        toast.error(error.message || `Failed to ${editing ? 'update' : 'save'} record`);
    } finally {
        setIsSubmitting(false)
    }
  }

  // --- Delete Handling ---
  const handleDeleteClick = (rec: TowerFinishRecord) => {
    setRecordToDelete(rec)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    
    setShowDeleteModal(false)
    setIsSubmitting(true)

    try {
        const { error } = await supabase
            .from("tower_finish_dates")
            .delete()
            .eq("id", recordToDelete.id)
            
        if (error) throw error
        
        toast.success(`Record for ${recordToDelete.tower} deleted`)
    } catch (error: any) {
        console.error("Supabase Error:", error);
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
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen font-sans space-y-8">
      
      {/* Header */}
      <header className="pb-4 border-b border-gray-300">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Tower Finish Dates Tracker 🏗️
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor the project schedule by comparing planned vs. projected finish dates and manually entering the variance.
        </p>
      </header>

      {/* Form Card */}
      <Card className="shadow-lg border-t-4 border-t-blue-600">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">
            {editing ? `Edit Dates for ${editing.tower}` : "Add New Finish Date Record"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Tower/Block</label>
              <Input
                type="text"
                name="tower"
                value={formData.tower}
                onChange={handleChange}
                placeholder="e.g., T1, Block A"
                required
                disabled={isSubmitting}
                className="border-gray-300 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Planned Finish Date</label>
              <Input
                type="date"
                name="planned_finish"
                value={formData.planned_finish}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className="border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Projected Finish Date</label>
              <Input
                type="date"
                name="projected_finish"
                value={formData.projected_finish}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className="border-gray-300"
              />
            </div>
            {/* NEW FIELD: Manual Variance Input */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Variance (days)</label>
              <Input
                type="number" // Use number type for direct variance input
                name="finish_variance_days"
                // Convert to string for the input field to handle the empty string state
                value={formData.finish_variance_days === '' ? '' : String(formData.finish_variance_days)}
                onChange={handleChange}
                placeholder="0 (e.g., -5 for 5 days early, 10 for 10 days late)"
                required
                disabled={isSubmitting}
                className="border-gray-300"
              />
            </div>

            <div className="md:col-span-4 flex justify-end space-x-2 w-full"> {/* Adjust layout for 4 columns and buttons */}
              {editing && (
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    disabled={isSubmitting}
                    className="text-gray-600 border-gray-300 hover:bg-gray-100"
                >
                    <X className="w-4 h-4 mr-1" /> Cancel Edit
                </Button>
              )}
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 shadow-md min-w-[120px]"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : editing ? <><Pencil className="w-4 h-4 mr-2" /> Update</> : <><Save className="w-4 h-4 mr-2" /> Save</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">Project Timeline Summary</CardTitle>
          {isLoading && (
              <p className="text-blue-600 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Fetching data...</p>
          )}
        </CardHeader>
        
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="bg-gray-100 hover:bg-gray-100 text-sm">
                  <TableHead className="text-left font-bold text-gray-700 w-[20%]">Tower/Block</TableHead>
                  <TableHead className="text-center font-bold text-gray-700 w-[25%]">Planned Finish</TableHead>
                  <TableHead className="text-center font-bold text-gray-700 w-[25%]">Projected Finish</TableHead>
                  <TableHead className="text-center font-bold text-gray-700 w-[20%]">Variance (days)</TableHead>
                  <TableHead className="text-center font-bold text-gray-700 w-[10%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.map(rec => (
                  <TableRow key={rec.id} className="odd:bg-white even:bg-gray-50 hover:bg-blue-50 transition-colors text-sm">
                    <TableCell className="font-semibold text-gray-800">{rec.tower}</TableCell>
                    <TableCell className="text-center text-gray-700">{formatDate(rec.planned_finish)}</TableCell>
                    <TableCell className="text-center text-gray-700">{formatDate(rec.projected_finish)}</TableCell>
                    {/* Variance is displayed directly from the record, ensuring it's treated as a number for styling */}
                    <TableCell className={`p-3 border-b border-r text-center ${getVarianceClass(Number(rec.finish_variance_days))}`}>
                        {rec.finish_variance_days}
                        {Number(rec.finish_variance_days) > 0 && <AlertTriangle className="inline w-3 h-3 ml-1 text-red-700" />}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(rec)} title="Edit" className="text-blue-600 hover:bg-blue-100">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteClick(rec)} title="Delete" className="text-red-600 hover:bg-red-100">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {paginatedRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center p-6 text-gray-500">No records found. Start by adding a new record above.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {records.length > 0 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                  className="border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-700">
                <span>Page {currentPage} of {totalPages}</span>
                <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="flex items-center"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="flex items-center"
                >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Modal (Dialog Component) */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-[425px] rounded-lg shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center">
                <Trash2 className="w-5 h-5 mr-2" /> Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-gray-700">
            <p className="mb-2">
              Are you sure you want to delete the record for **{recordToDelete?.tower}** (ID: #{recordToDelete?.id})?
            </p>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
          </div>
          <DialogFooter className="flex justify-end gap-3">
            <Button variant="outline" onClick={cancelDelete} disabled={isSubmitting} className="text-gray-600 border-gray-300 hover:bg-gray-100">
                Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}