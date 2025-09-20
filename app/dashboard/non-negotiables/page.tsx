"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { Pencil, Trash2, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

// --- Supabase Client ---
// Ensure these environment variables are correctly set in your .env.local file
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// --- Types ---
interface NonNegotiableRecord {
  id: number
  tower: string // Can be a tower name or project area (e.g., 'UGWT')
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

  // --- Fetch Records ---
  const fetchRecords = useCallback(async () => {
    const { data, error } = await supabase
      .from("monthly_non_negotiables") // Use the new table name
      .select("*")
      .order("id", { ascending: true })

    if (error) {
      toast.error("Failed to fetch non-negotiable tasks.")
      console.error(error)
    } else {
      setRecords(data || [])
    }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // --- Form Handling ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked; // Safe cast for checkbox

    setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
    }))
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
    if (!formData.tower || !formData.task_description) {
      toast.error("Tower/Area and Task Description are required.")
      return
    }

    const payload = { ...formData }

    if (editing) {
      // UPDATE
      const { error } = await supabase
        .from("monthly_non_negotiables")
        .update(payload)
        .eq("id", editing.id)

      if (error) toast.error(`Failed to update record #${editing.id}`)
      else {
        toast.success(`Record #${editing.id} updated`)
        resetForm()
        fetchRecords()
      }
    } else {
      // INSERT
      const { error } = await supabase.from("monthly_non_negotiables").insert([payload])
      if (error) toast.error("Failed to insert new record")
      else {
        toast.success("New record saved")
        resetForm()
        fetchRecords()
      }
    }
  }

  // --- Toggle Completion Status ---
  const handleToggleComplete = async (rec: NonNegotiableRecord) => {
    const newStatus = !rec.is_completed;
    const { error } = await supabase
        .from("monthly_non_negotiables")
        .update({ is_completed: newStatus })
        .eq("id", rec.id)
    
    if (error) {
        toast.error(`Failed to update status for ${rec.tower}.`)
    } else {
        toast.success(`Task status updated to ${newStatus ? 'Completed' : 'Pending'}.`)
        fetchRecords();
    }
  }

  // --- Delete Handling ---
  const handleDeleteClick = (rec: NonNegotiableRecord) => {
    setRecordToDelete(rec)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    const { error } = await supabase
      .from("monthly_non_negotiables")
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
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-8 text-red-700 border-b-2 border-red-300 pb-2">
        B4. NON-NEGOTIABLES FOR THIS MONTH
      </h1>

      {/* Form */}
      <div className="bg-red-50 border border-red-200 rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-red-700">
          {editing ? `Edit Task for ${editing.tower}` : "Add New Non-Negotiable Task"}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Tower/Area Input */}
          <div>
            <label className="block font-medium mb-1">Tower/Area</label>
            <input
              type="text"
              name="tower"
              value={formData.tower}
              onChange={handleChange}
              className="w-full border rounded p-2 focus:ring-red-500 focus:border-red-500"
              placeholder="e.g., T2, UGWT"
              required
            />
          </div>

          {/* Task Description Input */}
          <div className="md:col-span-2">
            <label className="block font-medium mb-1">Task Description</label>
            <input
              type="text"
              name="task_description"
              value={formData.task_description}
              onChange={handleChange}
              className="w-full border rounded p-2 focus:ring-red-500 focus:border-red-500"
              placeholder="e.g., T2 balance Slab -Pour 3"
              required
            />
          </div>

          {/* Completion Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="is_completed"
              checked={formData.is_completed}
              onChange={handleChange}
              id="is_completed"
              className="h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label htmlFor="is_completed" className="font-medium text-gray-700">Completed</label>
          </div>

          {/* Submit/Cancel Buttons */}
          <div className="md:col-span-4 flex justify-end space-x-3">
            {editing && <Button type="button" variant="outline" onClick={resetForm}>Cancel Edit</Button>}
            <button
              type="submit"
              className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition duration-150 shadow-md"
            >
              {editing ? "Update Task" : "Save New Task"}
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg shadow-xl">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr className="text-sm">
              <th className="text-left p-4">Tower/Area</th>
              <th className="text-left p-4">Task Description</th>
              <th className="text-center p-4">Status</th>
              <th className="text-center p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map(rec => (
              <tr 
                key={rec.id} 
                className={`hover:bg-red-50 text-sm ${rec.is_completed ? 'bg-green-50/50' : ''}`}
              >
                <td className="p-4 font-semibold text-gray-800">{rec.tower}</td>
                <td className={`p-4 ${rec.is_completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                    {rec.task_description}
                </td>
                <td className="p-4 text-center">
                    {rec.is_completed ? (
                        <span className="inline-flex items-center text-green-600 font-bold">
                            <CheckCircle className="w-5 h-5 mr-1" /> Done
                        </span>
                    ) : (
                        <span className="inline-flex items-center text-yellow-600 font-bold">
                            <XCircle className="w-5 h-5 mr-1" /> Pending
                        </span>
                    )}
                </td>
                <td className="p-4 text-center flex justify-center space-x-2">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => handleToggleComplete(rec)} 
                    title={rec.is_completed ? "Mark as Pending" : "Mark as Complete"}
                    className="text-gray-500 hover:bg-gray-200"
                  >
                    {rec.is_completed ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => handleEdit(rec)} title="Edit Task">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDeleteClick(rec)} title="Delete Task">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center p-4 text-gray-500">No non-negotiable tasks found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && recordToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 w-96">
            <h2 className="text-xl font-bold mb-4 text-red-600">Confirm Deletion</h2>
            <p className="mb-6">
                Are you sure you want to delete the non-negotiable task for **{recordToDelete.tower}**: 
                <br/>
                <span className="italic font-medium">"{recordToDelete.task_description}"</span>
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={cancelDelete}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete}>Yes, Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}