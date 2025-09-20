"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { differenceInDays, format } from "date-fns"

// --- Supabase Client ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// --- Types ---
interface TowerFinishRecord {
  id: number
  tower: string
  planned_finish: string // YYYY-MM-DD
  projected_finish: string // YYYY-MM-DD
  finish_variance_days: number
}

interface FormData {
  tower: string
  planned_finish: string
  projected_finish: string
}

// --- Utility Functions ---
const calculateVariance = (planned: string, projected: string) => {
  try {
    const plannedDate = new Date(planned)
    const projectedDate = new Date(projected)
    return differenceInDays(projectedDate, plannedDate)
  } catch {
    return 0
  }
}

const formatDate = (dateString: string) => dateString ? format(new Date(dateString), "dd-MM-yyyy") : "N/A"

const getVarianceClass = (variance: number) => {
  if (variance > 0) return "text-red-600 font-bold"
  if (variance < 0) return "text-green-600 font-bold"
  return "text-gray-600"
}

// --- Component ---
export default function FinishDatesPage() {
  const [records, setRecords] = useState<TowerFinishRecord[]>([])
  const [formData, setFormData] = useState<FormData>({
    tower: "",
    planned_finish: format(new Date(), "yyyy-MM-dd"),
    projected_finish: format(new Date(), "yyyy-MM-dd"),
  })
  const [editing, setEditing] = useState<TowerFinishRecord | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<TowerFinishRecord | null>(null)

  // --- Fetch Records ---
  const fetchRecords = useCallback(async () => {
    const { data, error } = await supabase
      .from("tower_finish_dates")
      .select("*")
      .order("id", { ascending: true })

    if (error) {
      toast.error("Failed to fetch tower finish records")
      console.error(error)
    } else {
      const processed: TowerFinishRecord[] = (data || []).map(rec => ({
        ...rec,
        finish_variance_days: calculateVariance(rec.planned_finish, rec.projected_finish),
      }))
      setRecords(processed)
    }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // --- Form Handling ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleEdit = (rec: TowerFinishRecord) => {
    setEditing(rec)
    setFormData({
      tower: rec.tower,
      planned_finish: rec.planned_finish,
      projected_finish: rec.projected_finish,
    })
  }

  const resetForm = () => {
    setEditing(null)
    setFormData({
      tower: "",
      planned_finish: format(new Date(), "yyyy-MM-dd"),
      projected_finish: format(new Date(), "yyyy-MM-dd"),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.tower || !formData.planned_finish || !formData.projected_finish) {
      toast.error("All fields are required.")
      return
    }

    const payload = { ...formData }

    if (editing) {
      const { error } = await supabase
        .from("tower_finish_dates")
        .update(payload)
        .eq("id", editing.id)

      if (error) toast.error(`Failed to update record #${editing.id}`)
      else {
        toast.success(`Record #${editing.id} updated`)
        resetForm()
        fetchRecords()
      }
    } else {
      const { error } = await supabase.from("tower_finish_dates").insert([payload])
      if (error) toast.error("Failed to insert new record")
      else {
        toast.success("New record saved")
        resetForm()
        fetchRecords()
      }
    }
  }

  // --- Delete Handling ---
  const handleDeleteClick = (rec: TowerFinishRecord) => {
    setRecordToDelete(rec)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    const { error } = await supabase
      .from("tower_finish_dates")
      .delete()
      .eq("id", recordToDelete.id)
    if (error) toast.error("Failed to delete record")
    else toast.success(`Record #${recordToDelete.id} deleted`)
    setShowDeleteModal(false)
    setRecordToDelete(null)
    fetchRecords()
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setRecordToDelete(null)
  }

  // --- Render ---
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 ">Planned & Projected Finish Dates (Towerwise)</h1>

      {/* Form */}
      <div className="bg-white border rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-blue-700">
          {editing ? `Edit Record for ${editing.tower}` : "Add New Finish Date Record"}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block font-medium mb-1">Tower</label>
            <input
              type="text"
              name="tower"
              value={formData.tower}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="e.g., T1"
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Planned Finish Date</label>
            <input
              type="date"
              name="planned_finish"
              value={formData.planned_finish}
              onChange={handleChange}
              className="w-full border rounded p-2"
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Projected Finish Date</label>
            <input
              type="date"
              name="projected_finish"
              value={formData.projected_finish}
              onChange={handleChange}
              className="w-full border rounded p-2"
              required
            />
          </div>
          <div className="flex items-end space-x-2 md:col-span-2">
            <button
              type="submit"
              className="w-full bg-black text-white font-semibold py-2 px-4 rounded hover:bg-gray-800 transition duration-150"
            >
              {editing ? "Update Record" : "Save New Record"}
            </button>
            {editing && <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>}
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full bg-white border rounded-lg shadow-xl">
          <thead className="bg-red-100">
            <tr className="text-sm">
              <th className="text-left p-3 border-b border-r">Tower</th>
              <th className="text-center p-3 border-b border-r">Planned Finish</th>
              <th className="text-center p-3 border-b border-r">Projected Finish</th>
              <th className="text-center p-3 border-b border-r">Variance (days)</th>
              <th className="text-center p-3 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map(rec => (
              <tr key={rec.id} className="hover:bg-gray-50 text-sm">
                <td className="p-3 border-b border-r font-semibold">{rec.tower}</td>
                <td className="p-3 border-b border-r text-center">{formatDate(rec.planned_finish)}</td>
                <td className="p-3 border-b border-r text-center">{formatDate(rec.projected_finish)}</td>
                <td className={`p-3 border-b border-r text-center ${getVarianceClass(rec.finish_variance_days)}`}>
                  {rec.finish_variance_days}
                </td>
                <td className="p-3 border-b text-center flex justify-center space-x-2">
                  <Button size="icon" variant="outline" onClick={() => handleEdit(rec)} title="Edit">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDeleteClick(rec)} title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
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
            <p className="mb-6">Are you sure you want to delete record <strong>{recordToDelete.tower}</strong> (ID: #{recordToDelete.id})?</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={cancelDelete}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
