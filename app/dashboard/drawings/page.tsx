"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

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
  const [filters, setFilters] = useState({
    year: "",
    month: "",
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<Record | null>(null)

  // Fetch records
  const fetchData = async () => {
    const { data, error } = await supabase
      .from("project_records")
      .select("*")
      .order("sr_no", { ascending: true })

    if (error) console.error("Error fetching data:", error)
    else setRecords(data || [])
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Auto Sr No
  const nextSrNo = records.length > 0 ? records[records.length - 1].sr_no + 1 : 1

  // Handle input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Handle submit (add / update)
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
      if (error) console.error("Error updating record:", error)
      else {
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
      if (error) console.error("Error inserting record:", error)
      else {
        setFormData({ description: "", record_date: "" })
        fetchData()
      }
    }
  }

  // Handle edit
  const handleEdit = (rec: Record) => {
    setEditing(rec)
    setFormData({
      description: rec.description,
      record_date: rec.record_date || "",
    })
  }

  // Open delete modal
  const handleDeleteClick = (rec: Record) => {
    setRecordToDelete(rec)
    setShowDeleteModal(true)
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!recordToDelete) return
    const { error } = await supabase.from("project_records").delete().eq("sr_no", recordToDelete.sr_no)
    if (error) console.error("Error deleting record:", error)
    setShowDeleteModal(false)
    setRecordToDelete(null)
    fetchData()
  }

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false)
    setRecordToDelete(null)
  }

  // Filtered records
  const filteredRecords = records.filter((rec) => {
    if (!rec.record_date) return false
    const date = new Date(rec.record_date)
    const yearMatch = filters.year ? date.getFullYear().toString() === filters.year : true
    const monthMatch = filters.month ? (date.getMonth() + 1).toString().padStart(2, "0") === filters.month : true
    return yearMatch && monthMatch
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Drawings Records</h1>

      {/* Form Section */}
      <div className="bg-white border rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {editing ? `Edit Record #${editing.sr_no}` : "Add New Record"}
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
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              className="w-full border rounded p-2"
            />
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto">
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
            {filteredRecords.map((rec) => (
              <tr key={rec.sr_no} className="hover:bg-gray-50">
                <td className="p-3 border-b">{rec.sr_no}</td>
                <td className="p-3 border-b">{rec.category}</td>
                <td className="p-3 border-b">
                  {rec.record_date ? new Date(rec.record_date).toLocaleDateString() : "N/A"}
                </td>
                <td className="p-3 border-b">{rec.description}</td>
                <td className="p-3 border-b text-center">
                  <button
                    onClick={() => handleEdit(rec)}
                    className="bg-blue-600 text-white px-3 py-1 rounded mr-2 hover:bg-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(rec)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-500"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center p-4 text-gray-500">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && recordToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">Confirm Delete</h2>
            <p className="mb-6">
              Are you sure you want to delete record #{recordToDelete.sr_no}?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
