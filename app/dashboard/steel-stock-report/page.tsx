"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { Pencil, Trash2, Save, X, Search, Loader2 } from "lucide-react" // Added icons
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input" // Assuming Input is available
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table" // Assuming Table is available
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" // Assuming Card is available
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog" // Assuming Dialog is available

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
  const [loading, setLoading] = useState(false) // Loading state for initial fetch
  const [isSubmitting, setIsSubmitting] = useState(false) // Loading state for form submit

  // --- Fetch Data ---
  const fetchData = useCallback(async () => {
    setLoading(true)
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
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- Form Handling ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setIsSubmitting(true)

    if (!formData.dia) {
      toast.error("Please enter the Steel Diameter (Dia).")
      setIsSubmitting(false)
      return
    }

    const payload = { ...formData }

    try {
        if (editing) {
            // Update
            const { error } = await supabase
                .from("steel_stock_report")
                .update(payload)
                .eq("sr_no", editing.sr_no)
            
            if (error) throw error
            
            toast.success(`Record #${editing.sr_no} updated successfully`)
        } else {
            // Insert
            const { error } = await supabase.from("steel_stock_report").insert([payload])
            
            if (error) throw error
            
            toast.success("New record saved successfully")
        }
        
        resetForm()
        fetchData()
    } catch (error: any) {
        console.error("Supabase error:", error);
        toast.error(error.message || `Failed to ${editing ? 'update' : 'save'} record`);
    } finally {
        setIsSubmitting(false)
    }
  }

  // --- Delete Handling ---
  const handleDeleteClick = (rec: SteelRecord) => {
    setRecordToDelete(rec)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    
    setShowDeleteModal(false)
    setIsSubmitting(true)
    
    try {
        const { error } = await supabase
            .from("steel_stock_report")
            .delete()
            .eq("sr_no", recordToDelete.sr_no)

        if (error) throw error

        toast.success(`Record #${recordToDelete.sr_no} deleted successfully`)
    } catch (error: any) {
        console.error("Supabase error:", error);
        toast.error(error.message || "Failed to delete record")
    } finally {
        setRecordToDelete(null)
        setIsSubmitting(false)
        fetchData()
    }
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
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen font-sans space-y-8">
      
      {/* Header */}
      <header className="pb-4 border-b border-gray-300">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Steel Stock Report (MT) 🏗️
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage and track steel inventory by diameter. All figures in Metric Tons (MT).
        </p>
      </header>

      {/* Form Card */}
      <Card className="shadow-lg border-t-4 border-t-blue-600">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">
            {editing ? `Edit Record #${editing.sr_no}` : "Add New Steel Stock Record"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Dia (e.g., 8 mm)</label>
              <Input
                type="text"
                name="dia"
                value={formData.dia}
                onChange={handleChange}
                placeholder="10 mm"
                required
                disabled={isSubmitting}
                className="border-gray-300 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Total Received (MT)</label>
              <Input
                type="number"
                name="total_received"
                value={formData.total_received}
                onChange={handleChange}
                placeholder="0.000"
                step="0.001"
                disabled={isSubmitting}
                className="border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Stock @ Site (MT)</label>
              <Input
                type="number"
                name="stock_at_site"
                value={formData.stock_at_site}
                onChange={handleChange}
                placeholder="0.000"
                step="0.001"
                disabled={isSubmitting}
                className="border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Consumed (MT)</label>
              <Input
                type="number"
                name="consumed"
                value={formData.consumed}
                onChange={handleChange}
                placeholder="0.000"
                step="0.001"
                disabled={isSubmitting}
                className="border-gray-300"
              />
            </div>
            <div className="flex space-x-2 w-full lg:col-span-1 sm:col-span-2">
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-md"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : editing ? <><Pencil className="w-4 h-4 mr-2" /> Update</> : <><Save className="w-4 h-4 mr-2" /> Save</>}
              </Button>
              {editing && (
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    disabled={isSubmitting}
                    className="text-gray-600 border-gray-300 hover:bg-gray-100"
                >
                    <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table and Filter Card */}
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold text-gray-800">Inventory Details</CardTitle>
          
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
                type="text"
                placeholder="Filter by Diameter..."
                value={filters.dia}
                onChange={(e) => setFilters({ ...filters, dia: e.target.value })}
                className="w-48 border-gray-300"
            />
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="bg-gray-100 hover:bg-gray-100 text-sm">
                  <TableHead className="text-left font-bold text-gray-700 w-[5%]">Sr. No.</TableHead>
                  <TableHead className="text-left font-bold text-gray-700 w-[15%]">Dia.</TableHead>
                  <TableHead className="text-right font-bold text-red-600 w-[25%]">TOTAL RECEIVED (MT)</TableHead>
                  <TableHead className="text-right font-bold text-green-600 w-[25%]">STOCK @ SITE (MT)</TableHead>
                  <TableHead className="text-right font-bold text-indigo-600 w-[20%]">CONSUMED (MT)</TableHead>
                  <TableHead className="text-center font-bold text-gray-700 w-[10%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((rec, idx) => (
                  <TableRow key={rec.sr_no} className="odd:bg-white even:bg-gray-50 hover:bg-blue-50 transition-colors text-sm">
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell className="font-semibold text-gray-800">{rec.dia}</TableCell>
                    <TableCell className="text-right text-red-700">{formatNumber(rec.total_received)}</TableCell>
                    <TableCell className="text-right text-green-700 font-semibold">{formatNumber(rec.stock_at_site)}</TableCell>
                    <TableCell className="text-right text-indigo-700">{formatNumber(rec.consumed)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(rec)} title="Edit" className="text-blue-600 hover:bg-blue-100">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteClick(rec)} title="Delete" className="text-red-600 hover:bg-red-100">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Total Row */}
                <TableRow className="font-extrabold bg-blue-100 text-base border-t-2 border-blue-300 hover:bg-blue-100">
                  <TableCell colSpan={2} className="text-left text-gray-900">GRAND TOTAL ({filters.dia ? `Filtered by ${filters.dia}` : 'All Records'})</TableCell>
                  <TableCell className="text-right text-red-800">{formatNumber(totalReceivedSum, 3)}</TableCell>
                  <TableCell className="text-right text-green-800">{formatNumber(stockAtSiteSum, 3)}</TableCell>
                  <TableCell className="text-right text-indigo-800">{formatNumber(consumedSum, 3)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
                
                {filteredRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center p-6 text-gray-500">No records found matching your filter criteria. Try clearing the filter.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Modal (Dialog Component) */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-[425px] rounded-lg shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-gray-700">
            <p className="mb-2">
              Are you sure you want to delete the record for **{recordToDelete?.dia}** (Sr. No. #{recordToDelete?.sr_no})?
            </p>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
          </div>
          <DialogFooter className="flex justify-end gap-3">
            <Button variant="outline" onClick={cancelDelete} disabled={isSubmitting} className="text-gray-600 border-gray-300 hover:bg-gray-100">
                Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Global Submitting Overlay (Optional but good practice) */}
      {isSubmitting && (
          <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-[60]">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          </div>
      )}

    </div>
  )
}