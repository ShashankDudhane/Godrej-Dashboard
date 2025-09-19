'use client'

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

const tabs = ["Tower1", "Tower2", "Tower3", "Tower4", "Other Inputs"] as const
type TowerTab = typeof tabs[number]

type Hindrance = {
  id?: number
  tower: string
  sr_no: number
  item_particulars: string
  start_from: string
  resolved_on: string
  period_in_days: number
  reason_shortfall: string
  remarks: string
}

type OtherInput = {
  id?: number
  sr_no: number
  content: string
}

export default function HindrancesPage() {
  const [activeTab, setActiveTab] = useState<TowerTab>("Tower1")
  const [form, setForm] = useState<Partial<Hindrance & OtherInput>>({})
  const [rows, setRows] = useState<(Hindrance | OtherInput)[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [modalContent, setModalContent] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    setEditingId(null)
    setForm({})
  }, [activeTab])

  const fetchData = async () => {
    try {
      if (activeTab === "Other Inputs") {
        const { data, error } = await supabase
          .from("other_inputs")
          .select("*")
          .order("id", { ascending: true })
        if (error) throw error
        setRows(data ?? [])
      } else {
        const { data, error } = await supabase
          .from("hindrances")
          .select("*")
          .eq("tower", activeTab.toLowerCase())
          .order("id", { ascending: true })
        if (error) throw error
        setRows(data ?? [])
      }
    } catch (err) {
      console.error(err)
      toast.error("Error fetching data")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (activeTab === "Other Inputs") {
        const payload: OtherInput = {
          sr_no: Number(form.sr_no),
          content: form.content || ""
        }

        if (editingId !== null) {
          const { error } = await supabase
            .from("other_inputs")
            .update(payload)
            .eq("id", editingId)
          if (error) throw error
          toast.success("Updated successfully")
          setEditingId(null)
        } else {
          const { error } = await supabase
            .from("other_inputs")
            .insert([payload])
          if (error) throw error
          toast.success("Saved successfully")
        }
      } else {
        const payload: Hindrance = {
          tower: activeTab.toLowerCase(),
          sr_no: Number(form.sr_no),
          item_particulars: form.item_particulars || "",
          start_from: form.start_from || "",
          resolved_on: form.resolved_on || "",
          period_in_days: Number(form.period_in_days) || 0,
          reason_shortfall: form.reason_shortfall || "",
          remarks: form.remarks || "",
        }

        if (editingId !== null) {
          const { error } = await supabase
            .from("hindrances")
            .update(payload)
            .eq("id", editingId)
          if (error) throw error
          toast.success("Updated successfully")
          setEditingId(null)
        } else {
          const { error } = await supabase
            .from("hindrances")
            .insert([payload])
          if (error) throw error
          toast.success("Saved successfully")
        }
      }

      setForm({})
      fetchData()
    } catch (err) {
      console.error(err)
      toast.error("Error saving data")
    }
  }

  const handleEdit = (row: Hindrance | OtherInput) => {
    if (!row.id) return
    setEditingId(row.id)
    setForm(row)
  }

  const handleDelete = async () => {
    if (deleteId === null) return
    try {
      const table = activeTab === "Other Inputs" ? "other_inputs" : "hindrances"
      const { error } = await supabase.from(table).delete().eq("id", deleteId)
      if (error) throw error
      toast.success("Deleted successfully")
      setDeleteId(null)
      fetchData()
    } catch (err) {
      console.error(err)
      toast.error("Error deleting data")
    }
  }

  const columns = rows.length > 0
    ? Object.keys(rows[0]).filter((col) => col !== "id" && col !== "tower" && col !== "created_at")
    : []

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Hindrances & Other Inputs</h1>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        {tabs.map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{editingId ? `Edit ${activeTab} Entry` : `Add ${activeTab} Entry`}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="font-medium mb-1">Sr No</label>
              <Input
                placeholder="Sr No"
                type="number"
                value={form.sr_no ?? ""}
                onChange={(e) => setForm({ ...form, sr_no: Number(e.target.value) })}
                required
              />
            </div>

            {activeTab === "Other Inputs" ? (
              <div className="flex flex-col">
                <label className="font-medium mb-1">Content</label>
                <Input
                  placeholder="Content"
                  value={form.content ?? ""}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  required
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Item / Particulars</label>
                  <Input
                    placeholder="Item/Particulars"
                    value={form.item_particulars ?? ""}
                    onChange={(e) => setForm({ ...form, item_particulars: e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Start From</label>
                  <Input
                    type="date"
                    value={form.start_from ?? ""}
                    onChange={(e) => setForm({ ...form, start_from: e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Resolved On</label>
                  <Input
                    type="date"
                    value={form.resolved_on ?? ""}
                    onChange={(e) => setForm({ ...form, resolved_on: e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Period (Days)</label>
                  <Input
                    type="number"
                    placeholder="Period in Days"
                    value={form.period_in_days ?? ""}
                    onChange={(e) => setForm({ ...form, period_in_days: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Reason for Shortfall</label>
                  <Input
                    placeholder="Reason for Shortfall"
                    value={form.reason_shortfall ?? ""}
                    onChange={(e) => setForm({ ...form, reason_shortfall: e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Remarks</label>
                  <Input
                    placeholder="Remarks"
                    value={form.remarks ?? ""}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="col-span-2">
              <Button type="submit" className="w-full">
                {editingId ? "Update" : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>{activeTab} Records</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-full table-fixed">
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col} className="truncate max-w-[150px]">
                    {col.replaceAll("_", " ").toUpperCase()}
                  </TableHead>
                ))}
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((col) => {
                    const value = (row as any)[col]
                    return (
                      <TableCell
                        key={col}
                        className="truncate max-w-[150px] cursor-pointer relative"
                        title={value}
                        onClick={() => setModalContent(String(value))}
                      >
                        <span
                          className="inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                          ref={(el) => {
                            if (el) {
                              const htmlEl = el as HTMLElement
                              const showEllipsis = htmlEl.scrollWidth > htmlEl.clientWidth
                              const indicator = htmlEl.querySelector(".overflow-indicator") as HTMLElement | null
                              if (indicator) indicator.style.display = showEllipsis ? "inline" : "none"
                            }
                          }}
                        >
                          {value}
                        </span>
                        <span className="overflow-indicator absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 font-bold select-none">
                          …
                        </span>
                      </TableCell>
                    )
                  })}
                  <TableCell className="flex gap-2 justify-center">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteId(row.id!)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this entry?</p>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal for full cell content */}
      <Dialog open={modalContent !== null} onOpenChange={() => setModalContent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Full Content</DialogTitle>
          </DialogHeader>
          <p>{modalContent}</p>
          <DialogFooter className="flex justify-end">
            <Button onClick={() => setModalContent(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
