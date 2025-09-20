"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Record {
  sr_no: number
  category: string
  description: string
  record_date: string | null
}

export default function DrawingsPage() {
  const [records, setRecords] = useState<Record[]>([])
  const [formData, setFormData] = useState({
    description: "",
    record_date: "",
  })
  const [editing, setEditing] = useState<Record | null>(null)
  const [filters, setFilters] = useState({ year: "", month: "" })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<Record | null>(null)
  const [modalContent, setModalContent] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // Fetch records
  const fetchData = async () => {
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
      setCurrentPage(1) // reset to first page on new data fetch
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const nextSrNo = records.length > 0 ? records[records.length - 1].sr_no + 1 : 1

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      const { error } = await supabase
        .from("project_records")
        .update({
          category: "Drawings",
          description: formData.description,
          record_date: formData.record_date || null,
        })
        .eq("sr_no", editing.sr_no)
      if (error) {
        console.error("Error updating record:", error)
        toast.error("Failed to update record")
      } else {
        toast.success(`Record #${editing.sr_no} updated successfully`)
        setEditing(null)
        setFormData({ description: "", record_date: "" })
        fetchData()
      }
    } else {
      const { error } = await supabase.from("project_records").insert([
        {
          sr_no: nextSrNo,
          category: "Drawings",
          description: formData.description,
          record_date: formData.record_date || null,
        },
      ])
      if (error) {
        console.error("Error inserting record:", error)
        toast.error("Failed to save record")
      } else {
        toast.success("Record saved successfully")
        setFormData({ description: "", record_date: "" })
        fetchData()
      }
    }
  }

  const handleEdit = (rec: Record) => {
    setEditing(rec)
    setFormData({
      description: rec.description,
      record_date: rec.record_date || "",
    })
  }

  const handleDeleteClick = (rec: Record) => {
    setRecordToDelete(rec)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    const { error } = await supabase
      .from("project_records")
      .delete()
      .eq("sr_no", recordToDelete.sr_no)
    if (error) {
      console.error("Error deleting record:", error)
      toast.error("Failed to delete record")
    } else {
      toast.success(`Record #${recordToDelete.sr_no} deleted successfully`)
    }
    setShowDeleteModal(false)
    setRecordToDelete(null)
    fetchData()
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setRecordToDelete(null)
  }

  // Filter records
  const filteredRecords = records.filter((rec) => {
    if (!rec.record_date) return false
    const date = new Date(rec.record_date)
    const yearMatch = filters.year
      ? date.getFullYear().toString() === filters.year
      : true
    const monthMatch = filters.month
      ? (date.getMonth() + 1).toString().padStart(2, "0") === filters.month
      : true
    return yearMatch && monthMatch
  })

  // Pagination calculations
  const totalRecords = filteredRecords.length
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalRecords / pageSize)
  const paginatedRecords =
    pageSize === -1
      ? filteredRecords
      : filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Drawings Records</h1>

      {/* Form Section */}
      <div className="bg-white border rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {editing ? `Edit Record #${editing.sr_no}` : "Add New Record"}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block font-medium mb-1">Date</label>
            <input
              type="date"
              name="record_date"
              value={formData.record_date}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-medium mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="Enter description"
              rows={3}
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full bg-black text-white font-semibold py-2 px-4 rounded hover:bg-gray-800"
            >
              {editing ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>

      {/* Filter Section */}
      <div className="bg-white border rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Search Records</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium mb-1">Year</label>
            <input
              type="text"
              placeholder="e.g. 2025"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Month</label>
            <input
              type="text"
              placeholder="e.g. 06"
              value={filters.month}
              onChange={(e) =>
                setFilters({ ...filters, month: e.target.value })
              }
              className="w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Page Size</label>
            <select
              value={pageSize}
              onChange={(e) =>
                setPageSize(parseInt(e.target.value))
              }
              className="w-full border rounded p-2"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={-1}>All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full bg-white border rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3 border-b">Sr No</th>
              <th className="text-left p-3 border-b">Category</th>
              <th className="text-left p-3 border-b">Date</th>
              <th className="text-left p-3 border-b">Description</th>
              <th className="text-center p-3 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.map((rec) => (
              <tr key={rec.sr_no} className="hover:bg-gray-50">
                <td className="p-3 border-b">{rec.sr_no}</td>
                <td className="p-3 border-b">{rec.category}</td>
                <td className="p-3 border-b">
                  {rec.record_date
                    ? new Date(rec.record_date).toLocaleDateString()
                    : "N/A"}
                </td>
                <td
                  className="p-3 border-b max-w-[200px] truncate cursor-pointer"
                  title={rec.description}
                  onClick={() => setModalContent(rec.description)}
                >
                  {rec.description}
                </td>
                <td className="p-3 border-b text-center flex justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(rec)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteClick(rec)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {paginatedRecords.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center p-4 text-gray-500">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pageSize !== -1 && totalPages > 1 && (
        <div className="flex justify-between items-center mb-6">
          <Button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          >
            Previous
          </Button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && recordToDelete && (
        <Dialog open={showDeleteModal} onOpenChange={cancelDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
            </DialogHeader>
            <p>
              Are you sure you want to delete record #{recordToDelete.sr_no}?
            </p>
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelDelete}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal for full description */}
      <Dialog
        open={modalContent !== null}
        onOpenChange={() => setModalContent(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Full Description</DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap break-words">{modalContent}</p>
          <DialogFooter className="flex justify-end">
            <Button onClick={() => setModalContent(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
