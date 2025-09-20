"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

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

  // Fetch records
  const fetchData = async () => {
    const { data, error } = await supabase.from("approvals").select("*").order("sr_no", { ascending: true })
    if (error) console.error("Error fetching data:", error)
    else setRecords(data || [])
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Handle submit (add/update)
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
      if (error) console.error("Error updating record:", error)
      else {
        setEditing(null)
        setFormData({ description: "", record_date: "" })
        fetchData()
      }
    } else {
      const { error } = await supabase.from("approvals").insert([
        {
          description: formData.description || "No description",
          record_date: formData.record_date || null,
        },
      ])
      if (error) console.error("Error inserting record:", error)
      else {
        setFormData({ description: "", record_date: "" })
        fetchData()
      }
    }
  }

  // Edit record
  const handleEdit = (rec: Record) => {
    setEditing(rec)
    setFormData({ description: rec.description, record_date: rec.record_date || "" })
  }

  // Delete record
  const handleDeleteClick = (rec: Record) => {
    setRecordToDelete(rec)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    const { error } = await supabase.from("approvals").delete().eq("sr_no", recordToDelete.sr_no)
    if (error) console.error("Error deleting record:", error)
    setShowDeleteModal(false)
    setRecordToDelete(null)
    fetchData()
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setRecordToDelete(null)
  }

  // Approve / Reject
  const handleApproveReject = async (rec: Record, status: "Approved" | "Rejected") => {
    const { error } = await supabase.from("approvals").update({ status }).eq("sr_no", rec.sr_no)
    if (error) console.error("Error updating status:", error)
    else fetchData()
  }

  // Filtered records
  const filteredRecords = records.filter((rec) => {
    const date = rec.record_date ? new Date(rec.record_date) : null
    const yearMatch = filters.year ? date?.getFullYear().toString() === filters.year : true
    const monthMatch = filters.month ? date && (date.getMonth() + 1).toString().padStart(2, "0") === filters.month : true
    const statusMatch = filters.status ? rec.status === filters.status : true
    return yearMatch && monthMatch && statusMatch
  })

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
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
            {filteredRecords.map((rec) => (
              <tr key={rec.sr_no} className="hover:bg-gray-50">
                <td className="p-3 border-b">{rec.sr_no}</td>
                <td className="p-3 border-b">{rec.record_date ? new Date(rec.record_date).toLocaleDateString() : "N/A"}</td>
                <td className="p-3 border-b">{rec.description}</td>
                <td className="p-3 border-b">{rec.status}</td>
                <td className="p-3 border-b text-center">
                  <button onClick={() => handleEdit(rec)} className="bg-blue-600 text-white px-3 py-1 rounded mr-1 hover:bg-blue-500">Edit</button>
                  <button onClick={() => handleDeleteClick(rec)} className="bg-red-600 text-white px-3 py-1 rounded mr-1 hover:bg-red-500">Delete</button>
                  <button onClick={() => handleApproveReject(rec, "Approved")} className="bg-green-600 text-white px-3 py-1 rounded mr-1 hover:bg-green-500">Approve</button>
                  <button onClick={() => handleApproveReject(rec, "Rejected")} className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-500">Reject</button>
                </td>
              </tr>
            ))}
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center p-4 text-gray-500">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && recordToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">Confirm Delete</h2>
            <p className="mb-6">Are you sure you want to delete record #{recordToDelete.sr_no}?</p>
            <div className="flex justify-end gap-3">
              <button onClick={cancelDelete} className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-500">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
