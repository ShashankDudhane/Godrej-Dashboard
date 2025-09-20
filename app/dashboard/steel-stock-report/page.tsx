"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// --- Types ---
interface SteelRecord {
  sr_no: number
  dia: string
  total_received: number
  stock_at_site: number
  consumed: number
}

// --- Component ---
export default function SteelStockPage() {
  const [records, setRecords] = useState<SteelRecord[]>([])
  const [formData, setFormData] = useState<Omit<SteelRecord, "sr_no">>({
    dia: "",
    total_received: 0,
    stock_at_site: 0,
    consumed: 0,
  })
  const [editing, setEditing] = useState<SteelRecord | null>(null)
  const [filters, setFilters] = useState({ dia: "" })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<SteelRecord | null>(null)

  // --- Fetch Data ---
  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from("steel_stock_report")
      .select("*")
      .order("sr_no", { ascending: true })

    if (error) {
      console.error("Error fetching steel stock data:", error)
      toast.error("Failed to fetch steel stock records")
    } else {
      setRecords(data || [])
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- Form Handling ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData({
      ...formData,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    })
  }

  const handleEdit = (rec: SteelRecord) => {
    setEditing(rec)
    setFormData({
      dia: rec.dia,
      total_received: rec.total_received,
      stock_at_site: rec.stock_at_site,
      consumed: rec.consumed,
    })
  }

  const resetForm = () => {
    setEditing(null)
    setFormData({
      dia: "",
      total_received: 0,
      stock_at_site: 0,
      consumed: 0,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.dia) {
      toast.error("Please enter the Steel Diameter (Dia).")
      return
    }

    const payload = { ...formData }

    if (editing) {
      // Update
      const { error } = await supabase
        .from("steel_stock_report")
        .update(payload)
        .eq("sr_no", editing.sr_no)

      if (error) {
        toast.error(`Failed to update record #${editing.sr_no}`)
      } else {
        toast.success(`Record #${editing.sr_no} updated successfully`)
        resetForm()
        fetchData()
      }
    } else {
      // Insert (sr_no auto-generated)
      const { error } = await supabase.from("steel_stock_report").insert([payload])

      if (error) {
        toast.error("Failed to save new record")
      } else {
        toast.success("New record saved successfully")
        resetForm()
        fetchData()
      }
    }
  }

  // --- Delete Handling ---
  const handleDeleteClick = (rec: SteelRecord) => {
    setRecordToDelete(rec)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    const { error } = await supabase
      .from("steel_stock_report")
      .delete()
      .eq("sr_no", recordToDelete.sr_no)
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

  // --- Filter & Totals ---
  const filteredRecords = records.filter((rec) =>
    filters.dia ? rec.dia.toLowerCase().includes(filters.dia.toLowerCase()) : true
  )

  const totalReceivedSum = filteredRecords.reduce((sum, r) => sum + r.total_received, 0)
  const stockAtSiteSum = filteredRecords.reduce((sum, r) => sum + r.stock_at_site, 0)
  const consumedSum = filteredRecords.reduce((sum, r) => sum + r.consumed, 0)

  const formatNumber = (num: number, decimals: number = 3) => num.toFixed(decimals)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 ">Steel Stock Report</h1>

      {/* Form */}
      <div className="bg-white border rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-blue-700">
          {editing ? `Edit Record #${editing.sr_no} (${editing.dia})` : "Add New Steel Stock Record"}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block font-medium mb-1">Dia (mm)</label>
            <input
              type="text"
              name="dia"
              value={formData.dia}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="e.g., 8 mm"
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Total Received</label>
            <input
              type="number"
              name="total_received"
              value={formData.total_received}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="0.000"
              step="0.001"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Stock @ Site</label>
            <input
              type="number"
              name="stock_at_site"
              value={formData.stock_at_site}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="0.000"
              step="0.001"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Consumed</label>
            <input
              type="number"
              name="consumed"
              value={formData.consumed}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="0.000"
              step="0.001"
            />
          </div>
          <div className="flex items-end space-x-2">
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

      {/* Filter */}
      <div className="bg-white border rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Filter Records</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <input
            type="text"
            placeholder="Filter by Diameter (e.g., 8 mm)"
            value={filters.dia}
            onChange={(e) => setFilters({ ...filters, dia: e.target.value })}
            className="w-full border rounded p-2 col-span-1"
          />
          <p className="col-span-3 text-sm text-gray-500">
            Showing {filteredRecords.length} records. Totals below reflect the filtered list.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full bg-white border rounded-lg shadow-xl">
          <thead className="bg-red-100">
            <tr className="text-sm">
              <th className="text-left p-3 border-b border-r">Sr. No.</th>
              <th className="text-left p-3 border-b border-r">Dia.</th>
              <th className="text-right p-3 border-b border-r">TOTAL RECEIVED (MT)</th>
              <th className="text-right p-3 border-b border-r">STOCK @ SITE (MT)</th>
              <th className="text-right p-3 border-b border-r">CONSUMED (MT)</th>
              <th className="text-center p-3 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((rec, idx) => (
              <tr key={rec.sr_no} className="hover:bg-gray-50 text-sm">
                <td className="p-3 border-b border-r">{idx + 1}</td>
                <td className="p-3 border-b border-r font-semibold">{rec.dia}</td>
                <td className="p-3 border-b border-r text-right">{formatNumber(rec.total_received)}</td>
                <td className="p-3 border-b border-r text-right">{formatNumber(rec.stock_at_site)}</td>
                <td className="p-3 border-b border-r text-right">{formatNumber(rec.consumed)}</td>
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
            <tr className="font-bold bg-red-200 text-base">
              <td className="p-3 border-b border-r" colSpan={2}>TOTAL</td>
              <td className="p-3 border-b border-r text-right">{formatNumber(totalReceivedSum, 3)}</td>
              <td className="p-3 border-b border-r text-right">{formatNumber(stockAtSiteSum, 3)}</td>
              <td className="p-3 border-b border-r text-right">{formatNumber(consumedSum, 3)}</td>
              <td className="p-3 border-b"></td>
            </tr>
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-500">No records found matching filters.</td>
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
            <p className="mb-6">Are you sure you want to delete the record for <strong>{recordToDelete.dia}</strong> (Sr. No. #{recordToDelete.sr_no})?</p>
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
