'use client'

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@supabase/supabase-js"
import { Pencil, Trash2, Calendar, Search, ArrowLeft, ArrowRight, Check, X, Eye, FileCheck } from "lucide-react"
import { toast } from "sonner"

// --- SHADCN COMPONENTS ---
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

// --- Supabase Client ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// --- Type Definition ---
interface Record {
  sr_no: number
  description: string
  record_date: string | null
  status: string
}

// Helper to format date
const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
        // Use 'en-GB' for Day-Month-Year format
        return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
        return 'Invalid Date';
    }
}


// Helper to determine status badge style
const getStatusStyle = (status: string) => {
  switch (status) {
    case "Approved":
      return "bg-green-100 text-green-700 border border-green-300 font-medium";
    case "Rejected":
      return "bg-red-100 text-red-700 border border-red-300 font-medium";
    case "Pending":
    default:
      return "bg-amber-100 text-amber-700 border border-amber-300 font-medium";
  }
};


// --- Main Component ---
export default function ApprovalPage() {
  const [records, setRecords] = useState<Record[]>([])
  const [formData, setFormData] = useState({ description: "", record_date: "" })
  const [editing, setEditing] = useState<Record | null>(null)
  const [filters, setFilters] = useState({ year: "", month: "", status: "all" })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<Record | null>(null)
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [descriptionContent, setDescriptionContent] = useState("")
  const [loading, setLoading] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // Fetch records
  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("approvals")
      .select("*")
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
  
  const nextSrNo = useMemo(() => {
    return records.length > 0 ? records[records.length - 1].sr_no + 1 : 1
  }, [records]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }
  
  const handleCancelEdit = () => {
    setEditing(null);
    setFormData({ description: "", record_date: "" });
  };


  // --- Submission Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        const { error } = await supabase
          .from("approvals")
          .update({
            description: formData.description,
            record_date: formData.record_date || null,
          })
          .eq("sr_no", editing.sr_no)
        if (error) throw error
        toast.success(`Request #${editing.sr_no} updated successfully 🎉`)
        setEditing(null)
      } else {
        const { error } = await supabase.from("approvals").insert([
          {
            sr_no: nextSrNo,
            description: formData.description || "No description",
            record_date: formData.record_date || null,
            status: "Pending",
          },
        ])
        if (error) throw error
        toast.success("Request submitted successfully ✅")
      }
      setFormData({ description: "", record_date: "" })
      fetchData()
    } catch (error) {
      console.error("Submission Error:", error)
      toast.error(`Failed to ${editing ? 'update' : 'submit'} request 🙁`)
    }
  }

  const handleEdit = (rec: Record) => {
    setEditing(rec)
    setFormData({ description: rec.description, record_date: rec.record_date || "" })
  }

  const handleDeleteClick = (rec: Record) => {
    setRecordToDelete(rec)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    const { error } = await supabase.from("approvals").delete().eq("sr_no", recordToDelete.sr_no)
    if (error) {
      toast.error("Failed to delete record 🚫")
    } else {
      toast.success(`Request #${recordToDelete.sr_no} deleted successfully 🗑️`)
    }
    setShowDeleteModal(false)
    setRecordToDelete(null)
    fetchData()
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setRecordToDelete(null)
  }

  // Function for Approve and Reject actions
  const handleApproveReject = async (rec: Record, status: "Approved" | "Rejected") => {
    const { error } = await supabase.from("approvals").update({ status }).eq("sr_no", rec.sr_no)
    if (error) {
      toast.error("Failed to update status")
    } else {
      toast.success(`Request #${rec.sr_no} has been ${status} 🎉`)
      fetchData()
    }
  }

  // --- Filtering Logic (Uses 'all' placeholder) ---
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const date = rec.record_date ? new Date(rec.record_date) : null
      const yearMatch = filters.year
        ? date?.getFullYear().toString() === filters.year
        : true
      const monthMatch = filters.month
        ? date && (date.getMonth() + 1).toString().padStart(2, "0") === filters.month
        : true
      // Logic: If status is 'all', show all, otherwise filter by status
      const statusMatch = filters.status === "all"
        ? true
        : rec.status === filters.status

      return yearMatch && monthMatch && statusMatch
    })
  }, [records, filters])


  // --- Pagination Logic ---
  const totalRecords = filteredRecords.length
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


  const openDescriptionModal = (content: string) => {
    setDescriptionContent(content)
    setShowDescriptionModal(true)
  }

  const closeDescriptionModal = () => {
    setDescriptionContent("")
    setShowDescriptionModal(false)
  }

  return (
    <div className="p-4 md:p-10 bg-blue-50/50 min-h-screen">

      {/* Header */}
      <h1 className="text-3xl lg:text-4xl font-extrabold mb-10 text-gray-800 pb-3 tracking-tight flex items-center gap-3 ">
        <FileCheck className="w-8 h-8 text-sky-400" />
        Approval Records Dashboard
      </h1>

      {/* Form Card */}
      <Card className="mb-10 border-t-4 border-sky-400 shadow-xl transition-shadow duration-300 hover:shadow-2xl hover:shadow-sky-300/50">
        <CardHeader className="bg-white border-b border-gray-100">
          <CardTitle className="text-2xl font-bold text-sky-400 flex items-center">
            <Pencil className="w-5 h-5 mr-2" />
            {editing ? `Edit Request #${editing.sr_no}` : "Submit New Approval Request"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Date Input */}
            <div className="space-y-2">
              <Label htmlFor="record_date" className="font-semibold text-sm text-gray-700">Request Date</Label>
              <div className="relative">
                <Input
                  id="record_date"
                  type="date"
                  name="record_date"
                  value={formData.record_date}
                  onChange={handleChange}
                  className="pl-10 border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all duration-200"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-500" />
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
                placeholder="Enter a detailed description for the approval request (e.g., 'Request for procurement of 5 new workstations')"
                rows={3}
                required
                className="border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all duration-200"
              />
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="md:col-span-3 pt-4 flex gap-3">
              <Button
                type="submit"
                className="flex-1 bg-sky-500 text-white font-semibold shadow-lg hover:bg-sky-600 transition-colors duration-200"
              >
                {editing ? "Update Request" : "Submit Request"}
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-1/4 text-gray-600 border-gray-300 hover:bg-gray-100 transition-colors duration-200"
                  onClick={handleCancelEdit}
                >
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filter and Table Card */}
      <Card className="shadow-2xl">
        <CardHeader className="bg-white border-b border-gray-100 flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold text-gray-800">Requests List</CardTitle>
          <div className="text-lg font-medium text-gray-600 flex items-center gap-2">
            Total Requests: <span className="font-bold text-sky-600">{records.length}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Filter Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4  rounded-lg border border-sky-200 shadow-inner">
            {/* Year Filter */}
            <Input
              type="text"
              placeholder="Filter by Year (e.g. 2025)"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="border-gray-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
            />
            {/* Month Filter */}
            <Input
              type="text"
              placeholder="Filter by Month (e.g. 06)"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              className="border-gray-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
            />

            {/* Status Filter (Select) */}
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="border-gray-300 focus:ring-1 focus:ring-sky-200">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* Page Size (Select) */}
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => setPageSize(parseInt(value))}
            >
              <SelectTrigger className="border-gray-300 focus:ring-1 focus:ring-sky-200">
                <SelectValue placeholder="Rows per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 Rows</SelectItem>
                <SelectItem value="20">20 Rows</SelectItem>
                <SelectItem value="50">50 Rows</SelectItem>
                <SelectItem value="-1">All Rows ({filteredRecords.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            {loading ? (
                 <div className="text-center p-12 text-sky-500 text-lg font-medium">Loading records... 🔄</div>
            ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-100 hover:bg-blue-100/90 border-b-2 border-sky-200">
                      <TableHead className="w-[80px] text-left py-3 text-xs font-extrabold text-sky-800 uppercase tracking-wider">Sr No</TableHead>
                      <TableHead className="w-[120px] text-left py-3 text-xs font-extrabold text-sky-800 uppercase tracking-wider">Date</TableHead>
                      <TableHead className="min-w-[200px] max-w-[400px] py-3 text-xs font-extrabold text-sky-800 uppercase tracking-wider">Description</TableHead>
                      <TableHead className="w-[120px] text-left py-3 text-xs font-extrabold text-sky-800 uppercase tracking-wider">Status</TableHead>
                      <TableHead className="w-[200px] text-center py-3 text-xs font-extrabold text-sky-800 uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecords.map((rec) => (
                      <TableRow key={rec.sr_no} className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                        <TableCell className="p-3 text-sm font-bold text-gray-700">{rec.sr_no}</TableCell>
                        <TableCell className="p-3 text-sm font-medium text-gray-700">{formatDate(rec.record_date)}</TableCell>
                        <TableCell className="p-3 text-sm text-gray-700 max-w-[400px]">
                          {rec.description.length > 50 ? (
                            <div className="flex items-center gap-2">
                              <span className="line-clamp-1">{rec.description.slice(0, 50)}...</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="p-0 h-auto text-sky-600 hover:text-sky-800"
                                onClick={() => openDescriptionModal(rec.description)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            rec.description
                          )}
                        </TableCell>
                        <TableCell className="p-3">
                          <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getStatusStyle(rec.status)}`}>
                            {rec.status}
                          </span>
                        </TableCell>
                        <TableCell className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            {/* 🌟 APPROVE/REJECT BUTTONS 🌟 */}
                            {rec.status === "Pending" && (
                              <>
                                <Button title="Approve" size="icon" className="bg-green-600 hover:bg-green-700 w-8 h-8" onClick={() => handleApproveReject(rec, "Approved")}>
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button title="Reject" size="icon" className="bg-red-600 hover:bg-red-700 w-8 h-8" onClick={() => handleApproveReject(rec, "Rejected")}>
                                  <X className="w-4 h-4" />
                                </Button>
                                <div className="border-l h-8 border-gray-200 mx-1"></div> {/* Vertical separator */}
                              </>
                            )}
                            {/* Edit and Delete Buttons */}
                            <Button title="Edit" size="icon" variant="outline" className="text-sky-600 border-sky-200 hover:bg-blue-100 w-8 h-8" onClick={() => handleEdit(rec)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button title="Delete" size="icon" variant="destructive" className="bg-red-500 hover:bg-red-600 w-8 h-8" onClick={() => handleDeleteClick(rec)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center p-8 text-gray-500 italic bg-white">No records found matching your criteria.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            )}
          </div>

          {/* Pagination Controls */}
          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 p-4 bg-blue-100 rounded-lg border border-sky-200 shadow-md">
              <Button
                variant="outline"
                className="text-sky-600 hover:bg-sky-200 border-sky-300 transition-colors duration-200"
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
                className="text-sky-600 hover:bg-sky-200 border-sky-300 transition-colors duration-200"
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={cancelDelete}>
        <DialogContent className="sm:max-w-[425px] rounded-xl border-t-4 border-red-500 shadow-2xl">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-2xl font-bold text-red-700 flex items-center">
                <Trash2 className="w-5 h-5 mr-2" /> Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
              <p className="text-gray-700 text-base">
                Are you sure you want to permanently delete request **#{recordToDelete?.sr_no}**? This action **cannot be undone**.
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

      {/* Full Description Dialog */}
      <Dialog open={showDescriptionModal} onOpenChange={closeDescriptionModal}>
        <DialogContent className="max-w-lg rounded-xl border-t-4 border-sky-500 shadow-2xl">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-2xl font-bold text-gray-800">Full Description</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-inner">
              <p className="whitespace-pre-wrap break-words text-gray-700 text-sm leading-relaxed">{descriptionContent}</p>
            </div>
          </div>
          <DialogFooter className="flex justify-end p-4 bg-gray-50 border-t">
            <Button onClick={closeDescriptionModal} className="bg-sky-500 hover:bg-sky-600 shadow-md">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}