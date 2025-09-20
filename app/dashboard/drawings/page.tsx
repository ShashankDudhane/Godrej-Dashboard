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
    category: "Drawing",
    description: "",
    record_date: "",
  })
  const [editing, setEditing] = useState<Record | null>(null)
  const [filters, setFilters] = useState({
    year: "",
    month: "",
  })

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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Handle submit (add / update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editing) {
      // Update existing record
      const { error } = await supabase
        .from("project_records")
        .update({
          category: formData.category,
          description: formData.description,
          record_date: formData.record_date || null,
        })
        .eq("sr_no", editing.sr_no)

      if (error) console.error("Error updating record:", error)
      else {
        setEditing(null)
        setFormData({ category: "Drawing", description: "", record_date: "" })
        fetchData()
      }
    } else {
      // Insert new record
      const { error } = await supabase.from("project_records").insert([
        {
          sr_no: nextSrNo,
          category: formData.category,
          description: formData.description,
          record_date: formData.record_date || null,
        },
      ])

      if (error) console.error("Error inserting record:", error)
      else {
        setFormData({ category: "Drawing", description: "", record_date: "" })
        fetchData()
      }
    }
  }

  // Handle edit click
  const handleEdit = (rec: Record) => {
    setEditing(rec)
    setFormData({
      category: rec.category,
      description: rec.description,
      record_date: rec.record_date || "",
    })
  }

  // Handle search filter
  const filteredRecords = records.filter((rec) => {
    if (!rec.record_date) return false
    const date = new Date(rec.record_date)
    const yearMatch = filters.year ? date.getFullYear().toString() === filters.year : true
    const monthMatch = filters.month ? (date.getMonth() + 1).toString().padStart(2, "0") === filters.month : true
    return yearMatch && monthMatch
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Project Records</h1>

      {/* Form Section */}
      <div className="bg-white border rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {editing ? `Edit Record #${editing.sr_no}` : "Add New Record"}
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sr No */}
          <div>
            <label className="block font-medium mb-1">Sr No</label>
            <input
              type="text"
              value={editing ? editing.sr_no : nextSrNo}
              disabled
              className="w-full border rounded p-2 bg-gray-100"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block font-medium mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border rounded p-2"
              required
            >
              <option value="Drawing">Drawing</option>
              <option value="Approval">Approval</option>
            </select>
          </div>

          {/* Date */}
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

          {/* Description */}
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

          {/* Save Button */}
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

      {/* Records Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRecords.map((rec) => (
          <div key={rec.sr_no} className="border rounded-lg p-4 shadow bg-white">
            <h2 className="font-semibold text-lg">
              {rec.category} #{rec.sr_no}
            </h2>
            <p className="text-sm text-gray-600">
              Date: {rec.record_date ? new Date(rec.record_date).toLocaleDateString() : "N/A"}
            </p>
            <p className="mt-2">{rec.description}</p>
            <button
              onClick={() => handleEdit(rec)}
              className="mt-3 text-sm bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-700"
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
