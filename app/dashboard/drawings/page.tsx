'use client'

import { useEffect, useState, useRef, useMemo } from "react"
import { createClient } from "@supabase/supabase-js"
import { Pencil, Trash2, Calendar, Search, ArrowLeft, ArrowRight, ClipboardList, Ban } from "lucide-react"
import { toast } from "sonner"

// --- Shadcn UI Components ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// --- Supabase Client ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// --- Type Definition ---
interface DrawingRecord {
  sr_no: number
  category: string
  description: string
  record_date: string | null
}

// Helper to format date
const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
        return 'Invalid Date';
    }
}


// --- Main Component ---
export default function DrawingsPage() {
  const [records, setRecords] = useState<DrawingRecord[]>([])
  const [formData, setFormData] = useState({
    description: "",
    record_date: "",
  })
  const [editing, setEditing] = useState<DrawingRecord | null>(null)
  const [filters, setFilters] = useState({ year: "", month: "" })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<DrawingRecord | null>(null)
  const [modalContent, setModalContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)
    
  // Fetch records
  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_records")
      .select("*")
      .eq("category", "Drawings")
      .order("sr_no", { ascending: true })

    if (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to fetch records")
    } else {
      setRecords(data || [])
      setCurrentPage(1)
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Calculate next SR No dynamically
  const nextSrNo = useMemo(() => {
    return records.length > 0 ? records[records.length - 1].sr_no + 1 : 1
  }, [records]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // --- Submission Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        category: "Drawings",
        description: formData.description,
        record_date: formData.record_date || null,
      };

      if (editing) {
        const { error } = await supabase
          .from("project_records")
          .update(payload)
          .eq("sr_no", editing.sr_no);

        if (error) throw error
        toast.success(`Record #${editing.sr_no} updated successfully 🎉`);
        setEditing(null);
      } else {
        const { error } = await supabase.from("project_records").insert([
          { ...payload, sr_no: nextSrNo },
        ]);
        if (error) throw error
        toast.success("Record saved successfully ✅");
      }
      setFormData({ description: "", record_date: "" })
      fetchData()
    } catch (error) {
      console.error("Submission Error:", error)
      toast.error(`Failed to ${editing ? 'update' : 'save'} record 🙁`)
    }
  }

  // --- Edit & Delete Handlers ---
  const handleEdit = (rec: DrawingRecord) => {
    setEditing(rec)
    setFormData({
      description: rec.description,
      record_date: rec.record_date || "",
    })
  }
    
  const handleCancelEdit = () => {
      setEditing(null);
      setFormData({ description: "", record_date: "" });
  };

  const handleDeleteClick = (rec: DrawingRecord) => {
    setRecordToDelete(rec)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    try {
      const { error } = await supabase
        .from("project_records")
        .delete()
        .eq("sr_no", recordToDelete.sr_no)
      if (error) throw error
      toast.success(`Record #${recordToDelete.sr_no} deleted successfully 🗑️`)
    } catch (error) {
      console.error("Error deleting record:", error)
      toast.error("Failed to delete record 🚫")
    }
    setShowDeleteModal(false)
    setRecordToDelete(null)
    fetchData()
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setRecordToDelete(null)
  }

  // --- Filter Records ---
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Show all records if no filter is applied and date is N/A
      if (!rec.record_date) {
        return !filters.year && !filters.month; 
      }
      
      const date = new Date(rec.record_date)
      
      const yearMatch = filters.year
        ? date.getFullYear().toString() === filters.year
        : true

      const monthMatch = filters.month
        ? (date.getMonth() + 1).toString().padStart(2, "0") === filters.month
        : true

      return yearMatch && monthMatch
    });
  }, [records, filters]);

  // --- Pagination Calculations ---
  const totalRecords = filteredRecords.length
  // pageSize is -1 for 'All'
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalRecords / pageSize)
  const paginatedRecords = useMemo(() => {
    return pageSize === -1
      ? filteredRecords
      : filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  }, [filteredRecords, currentPage, pageSize]);

  // Sync pagination with filtering
  useEffect(() => {
    // Reset to page 1 whenever filters change
    setCurrentPage(1);
  }, [filters]);


  // --- Rendering ---
  return (
    <div className="p-4 md:p-10 bg-amber-50 min-h-screen">
      
      {/* Header */}
      <h1 className="text-3xl lg:text-4xl font-extrabold mb-10 text-gray-800 pb-3 tracking-tight flex items-center gap-3">
        <ClipboardList className="w-8 h-8 text-orange-600" />
        Project Drawings Records
      </h1>

      {/* Form Card */}
      <Card className="mb-10 border-t-4 border-orange-600 shadow-xl transition-shadow duration-300 hover:shadow-2xl hover:shadow-amber-300/50">
        <CardHeader className="bg-white border-b border-gray-100">
          <CardTitle className="text-2xl font-bold text-orange-700 flex items-center">
             <Pencil className="w-5 h-5 mr-2" />
            {editing ? `Edit Record #${editing.sr_no}` : "Add New Record"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Date Input */}
            <div className="space-y-2">
              <Label htmlFor="record_date" className="font-semibold text-sm text-gray-700">Date</Label>
              <div className="relative">
                <Input
                  id="record_date"
                  type="date"
                  name="record_date"
                  value={formData.record_date}
                  onChange={handleChange}
                  className="pl-10 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500" />
              </div>
            </div>

            {/* Description Textarea */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description" className="font-semibold text-sm text-gray-700">Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter a detailed description of the drawing record (e.g., 'Structural Drawing for T2 Level 5 approved by consultant')"
                rows={3}
                required
                className="border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200"
              />
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="md:col-span-3 pt-4 flex gap-3">
              <Button
                type="submit"
                className="flex-1 bg-orange-600 text-white font-semibold shadow-lg hover:bg-orange-700 transition-colors duration-200"
              >
                {editing ? "Update Record" : "Save Record"}
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-1/4 text-gray-600 border-gray-300 hover:bg-gray-100 transition-colors duration-200"
                  onClick={handleCancelEdit}
                >
                  <Ban className="w-4 h-4 mr-2" /> Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filter and Table Card */}
      <Card className="shadow-2xl">
        <CardHeader className="bg-white border-b border-gray-100 flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold text-gray-800">Records List</CardTitle>
          <div className="text-lg font-medium text-gray-600 flex items-center gap-2">
            Total Records: <span className="font-bold text-orange-700">{records.length}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Filter Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8 p-4 bg-amber-100 rounded-lg border border-amber-200 shadow-inner">
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="year-filter" className="text-xs font-semibold text-gray-700">Filter by Year</Label>
              <Input
                id="year-filter"
                type="text"
                placeholder="e.g. 2024"
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                className="border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
              />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="month-filter" className="text-xs font-semibold text-gray-700">Filter by Month</Label>
              <Input
                id="month-filter"
                type="text"
                placeholder="e.g. 06"
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                className="border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
              />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="page-size-select" className="text-xs font-semibold text-gray-700">Rows per page</Label>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => setPageSize(parseInt(value))}
              >
                <SelectTrigger id="page-size-select" className="border-gray-300 focus:ring-1 focus:ring-orange-200">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="-1">All ({filteredRecords.length})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 md:col-span-1 flex items-end">
                <Button variant="ghost" onClick={() => setFilters({ year: "", month: "" })} className="w-full text-sm text-orange-600 hover:bg-amber-200/50">
                    Clear Filters
                </Button>
            </div>
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            {loading ? (
                 <div className="text-center p-12 text-orange-500 text-lg font-medium">Loading records... 🔄</div>
            ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-amber-50 hover:bg-amber-50/90 border-b-2 border-amber-200">
                      <TableHead className="text-left py-4 text-xs font-extrabold text-orange-800 uppercase tracking-wider w-16">Sr No</TableHead>
                      <TableHead className="text-left py-4 text-xs font-extrabold text-orange-800 uppercase tracking-wider w-24">Category</TableHead>
                      <TableHead className="text-left py-4 text-xs font-extrabold text-orange-800 uppercase tracking-wider w-32">Date</TableHead>
                      <TableHead className="text-left py-4 text-xs font-extrabold text-orange-800 uppercase tracking-wider max-w-[400px]">Description</TableHead>
                      <TableHead className="text-center py-4 text-xs font-extrabold text-orange-800 uppercase tracking-wider w-36">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecords.map((rec) => (
                      <TableRow key={rec.sr_no} className="hover:bg-amber-50/50 transition-colors duration-150 border-b border-gray-100">
                        <TableCell className="p-3 text-sm font-bold text-gray-700">{rec.sr_no}</TableCell>
                        <TableCell className="p-3 text-sm text-gray-600">{rec.category}</TableCell>
                        <TableCell className="p-3 text-sm font-medium text-gray-700">
                          {formatDate(rec.record_date)}
                        </TableCell>
                        <TableCell className="p-3 max-w-[400px]">
                          <div
                            className="line-clamp-2 text-sm text-gray-700"
                          >
                            {rec.description}
                          </div>
                          {/* Display "View More" if description is potentially long */}
                          {rec.description.length > 80 && ( 
                            <span
                              onClick={() => setModalContent(rec.description)}
                              className="text-orange-600 cursor-pointer hover:text-orange-800 hover:underline text-xs font-semibold block mt-1"
                            >
                              ...View Full Details
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-orange-600 hover:bg-amber-200/50 rounded-full w-8 h-8 transition-all duration-200"
                              onClick={() => handleEdit(rec)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-200/50 rounded-full w-8 h-8 transition-all duration-200"
                              onClick={() => handleDeleteClick(rec)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center p-8 text-gray-500 italic bg-white">
                          No records found matching your filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            )}
          </div>

          {/* Pagination Controls */}
          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200 shadow-md">
              <Button
                variant="outline"
                className="text-orange-600 hover:bg-amber-200 border-amber-300 transition-colors duration-200"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <span className="text-sm font-medium text-gray-700">
                Page <span className="font-bold">{currentPage}</span> of <span className="font-bold">{totalPages}</span> | {totalRecords} Records
              </span>
              <Button
                variant="outline"
                className="text-orange-600 hover:bg-amber-200 border-amber-300 transition-colors duration-200"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Modals --- */}
      
      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={cancelDelete}>
        <DialogContent className="sm:max-w-[425px] rounded-xl border-t-4 border-red-500 shadow-2xl">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-2xl font-bold text-red-700 flex items-center">
                <Trash2 className="w-5 h-5 mr-2" /> Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
              <p className="text-gray-700 text-base">
                Are you sure you want to permanently delete record **#{recordToDelete?.sr_no}**? This action **cannot be undone**.
              </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 p-4 bg-gray-50 border-t">
            <Button variant="outline" onClick={cancelDelete} className="text-gray-600 hover:bg-gray-200">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 shadow-md">
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal for full description */}
      <Dialog
        open={modalContent !== null}
        onOpenChange={() => setModalContent(null)}
      >
        <DialogContent className="sm:max-w-[600px] rounded-xl border-t-4 border-orange-500 shadow-2xl">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-2xl font-bold text-gray-800">Full Description</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-inner">
              <p className="whitespace-pre-wrap break-words text-gray-700 text-sm leading-relaxed">{modalContent}</p>
            </div>
          </div>
          <DialogFooter className="flex justify-end p-4 bg-gray-50 border-t">
            <Button onClick={() => setModalContent(null)} className="bg-orange-600 hover:bg-orange-700 shadow-md">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}