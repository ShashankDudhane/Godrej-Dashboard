"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { Pencil, Trash2, Eye } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Record {
  sr_no: number
  description: string
  record_date: string | null
  status: string
}

export default function ApprovalPage() {
  const [records, setRecords] = useState<Record[]>([])
  const [formData, setFormData] = useState({ description: "", record_date: "" })
  const [editing, setEditing] = useState<Record | null>(null)
  const [filters, setFilters] = useState({ year: "", month: "", status: "" })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<Record | null>(null)
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [descriptionContent, setDescriptionContent] = useState("")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // Fetch records
  const fetchData = async () => {
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
  }

  useEffect(() => {
    fetchData()
  }, [])

  const nextSrNo = records.length > 0 ? records[records.length - 1].sr_no + 1 : 1

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      const { error } = await supabase
        .from("approvals")
        .update({
          description: formData.description,
          record_date: formData.record_date || null,
        })
        .eq("sr_no", editing.sr_no)
      if (error) {
        toast.error("Failed to update record")
      } else {
        toast.success(`Record #${editing.sr_no} updated successfully`)
        setEditing(null)
        setFormData({ description: "", record_date: "" })
        fetchData()
      }
    } else {
      const { error } = await supabase.from("approvals").insert([
        {
          sr_no: nextSrNo,
          description: formData.description || "No description",
          record_date: formData.record_date || null,
          status: "Pending",
        },
      ])
      if (error) {
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

  const handleApproveReject = async (rec: Record, status: "Approved" | "Rejected") => {
    const { error } = await supabase.from("approvals").update({ status }).eq("sr_no", rec.sr_no)
    if (error) {
      toast.error("Failed to update status")
    } else {
      toast.success(`Record #${rec.sr_no} ${status}`)
      fetchData()
    }
  }

  const filteredRecords = records.filter((rec) => {
    const date = rec.record_date ? new Date(rec.record_date) : null
    const yearMatch = filters.year ? date?.getFullYear().toString() === filters.year : true
    const monthMatch = filters.month ? date && (date.getMonth() + 1).toString().padStart(2, "0") === filters.month : true
    const statusMatch = filters.status ? rec.status === filters.status : true
    return yearMatch && monthMatch && statusMatch
  })

  const totalRecords = filteredRecords.length
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalRecords / pageSize)
  const paginatedRecords =
    pageSize === -1
      ? filteredRecords
      : filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const openDescriptionModal = (content: string) => {
    setDescriptionContent(content)
    setShowDescriptionModal(true)
  }

  const closeDescriptionModal = () => {
    setDescriptionContent("")
    setShowDescriptionModal(false)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Approvals</h1>

      {/* Form */}
      <div className="bg-white border rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {editing ? `Edit Record #${editing.sr_no}` : "Add New Approval"}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Filters */}
      <div className="bg-white border rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Search Records</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <input
            type="text"
            placeholder="Year e.g. 2025"
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className="w-full border rounded p-2"
          />
          <input
            type="text"
            placeholder="Month e.g. 06"
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            className="w-full border rounded p-2"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full border rounded p-2"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <div>
            <label className="block mb-1 font-medium">Page Size</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value))}
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

      {/* Table */}
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full bg-white border rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3 border-b">Sr No</th>
              <th className="text-left p-3 border-b">Date</th>
              <th className="text-left p-3 border-b">Description</th>
              <th className="text-left p-3 border-b">Status</th>
              <th className="text-center p-3 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.map((rec) => (
              <tr key={rec.sr_no} className="hover:bg-gray-50">
                <td className="p-3 border-b">{rec.sr_no}</td>
                <td className="p-3 border-b">{rec.record_date ? new Date(rec.record_date).toLocaleDateString() : "N/A"}</td>
                <td className="p-3 border-b">
                  {rec.description.length > 50 ? (
                    <>
                      {rec.description.slice(0, 50)}...
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-2"
                        onClick={() => openDescriptionModal(rec.description)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    rec.description
                  )}
                </td>
                <td className="p-3 border-b">{rec.status}</td>
                <td className="p-3 border-b text-center flex justify-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(rec)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(rec)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-500 text-white" onClick={() => handleApproveReject(rec, "Approved")}>
                    Approve
                  </Button>
                  <Button size="sm" className="bg-yellow-600 hover:bg-yellow-500 text-white" onClick={() => handleApproveReject(rec, "Rejected")}>
                    Reject
                  </Button>
                </td>
              </tr>
            ))}
            {paginatedRecords.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center p-4 text-gray-500">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageSize !== -1 && totalPages > 1 && (
        <div className="flex justify-between items-center mb-6">
          <Button disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}>
            Previous
          </Button>
          <span>Page {currentPage} of {totalPages}</span>
          <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}>
            Next
          </Button>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && recordToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">Confirm Delete</h2>
            <p className="mb-6">Are you sure you want to delete record #{recordToDelete.sr_no}?</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={cancelDelete}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Description Modal */}
      {showDescriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96 max-h-[80vh] overflow-auto">
            <h2 className="text-lg font-semibold mb-4">Full Description</h2>
            <p className="mb-6 whitespace-pre-wrap">{descriptionContent}</p>
            <div className="flex justify-end">
              <Button variant="outline" onClick={closeDescriptionModal}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
