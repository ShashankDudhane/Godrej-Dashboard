"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@supabase/supabase-js"
import { Pencil, Trash2, PlusCircle, Loader2, Maximize, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"

// --- Shadcn/ui Components ---
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// --- Supabase Client ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// --- Types ---
interface CriticalIssueRecord {
  id: number
  issue_description: string
  category: string | null
  created_at: string
}

interface FormData {
  issue_description: string
  category: string
  customCategory: string
}

// --- Component ---
export default function CriticalIssuesPage() {
  const [issues, setIssues] = useState<CriticalIssueRecord[]>([])
  const [formData, setFormData] = useState<FormData>({
    issue_description: "",
    category: "", // Initial empty string value is for Select placeholder
    customCategory: "",
  })
  const [editing, setEditing] = useState<CriticalIssueRecord | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [issueToDelete, setIssueToDelete] = useState<CriticalIssueRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false) 

  // For description modal
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [selectedDescription, setSelectedDescription] = useState<string | null>(null)

  // For pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const categories = ["Labour", "Material", "Technical", "General", "Other"]

  // --- Fetch Records ---
  const fetchIssues = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("critical_issues")
      .select("*")
      .order("id", { ascending: false }) 

    if (error) {
      toast.error("Failed to fetch critical issues.")
      console.error(error)
    } else {
      setIssues(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  // --- Form Handling ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  const handleCategoryChange = (value: string) => {
    // If the selected value is the unique 'none' placeholder value, set category back to ""
    const newCategory = value === "none" ? "" : value;
    setFormData(prev => ({ 
        ...prev, 
        category: newCategory, 
        customCategory: newCategory === "Other" ? prev.customCategory : "" 
    }))
  }

  const handleEdit = (issue: CriticalIssueRecord) => {
    setEditing(issue)
    setFormData({
      issue_description: issue.issue_description,
      // Map existing category to "Other" if it's not in the predefined list
      category: categories.includes(issue.category || "") ? issue.category || "" : "Other",
      customCategory: categories.includes(issue.category || "") ? "" : issue.category || "",
    })
  }

  const resetForm = () => {
    setEditing(null)
    setFormData({
      issue_description: "",
      category: "",
      customCategory: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.issue_description.trim()) {
      toast.error("Issue Description is required.")
      return
    }

    setIsSubmitting(true)

    const finalCategory =
      formData.category === "Other"
        ? formData.customCategory.trim() || null
        : formData.category.trim() || null

    if (!formData.category) {
        toast.error("Please select a category.")
        setIsSubmitting(false)
        return
    }

    if (formData.category === "Other" && !finalCategory) {
      toast.error("Please enter a custom category or select an existing one.")
      setIsSubmitting(false)
      return
    }

    const payload = {
      issue_description: formData.issue_description.trim(),
      category: finalCategory,
    }

    try {
      if (editing) {
        const { error } = await supabase
          .from("critical_issues")
          .update(payload)
          .eq("id", editing.id)
          .select()

        if (error) throw error
        
        toast.success(`Issue #${editing.id} updated successfully.`)
      } else {
        const { error } = await supabase.from("critical_issues").insert([payload]).select()
        
        if (error) throw error
        
        toast.success("New critical issue saved.")
      }
      
      resetForm()
      fetchIssues()
    } catch (error: any) {
      console.error("Supabase Error:", error)
      toast.error(error.message || `Failed to ${editing ? 'update' : 'save'} issue.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Delete Handling ---
  const handleDeleteClick = (issue: CriticalIssueRecord) => {
    setIssueToDelete(issue)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!issueToDelete) return
    setIsSubmitting(true)
    
    try {
        const { error } = await supabase
            .from("critical_issues")
            .delete()
            .eq("id", issueToDelete.id)

        if (error) throw error
        
        toast.success(`Issue #${issueToDelete.id} deleted.`)
    } catch (error: any) {
        console.error("Supabase Error:", error)
        toast.error(error.message || "Failed to delete issue.")
    } finally {
        setShowDeleteModal(false)
        setIssueToDelete(null)
        setIsSubmitting(false)
        fetchIssues()
    }
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setIssueToDelete(null)
  }

  // --- Truncate Helper ---
  const truncateText = (text: string, maxLength = 80) =>
    text.length > maxLength ? text.slice(0, maxLength) + "..." : text

  // --- Pagination ---
  const totalPages = Math.ceil(issues.length / itemsPerPage)
  const paginatedIssues = useMemo(() => issues.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ), [issues, currentPage, itemsPerPage])
  
  useEffect(() => {
    setCurrentPage(1); 
  }, [issues.length])

  // --- Render ---
  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen font-sans space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <header className="pb-4 border-b border-gray-300">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center">
          <Maximize className="w-7 h-7 mr-3 text-red-600 rotate-45" /> Project Critical Issues
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Log and track the top-priority constraints and risks affecting the project timeline.
        </p>
      </header>

      {/* Form Card */}
      <Card className="shadow-xl border-t-4 border-t-red-600 bg-white">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-red-700 flex items-center">
            <PlusCircle className="w-5 h-5 mr-2" />
            {editing ? `Edit Issue #${editing.id}` : "Add New Critical Issue"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              
              {/* Issue Description */}
              <div className="md:col-span-2">
                <Label htmlFor="issue_description" className="block text-sm font-medium mb-1 text-gray-700">
                  Issue Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="issue_description"
                  name="issue_description"
                  value={formData.issue_description}
                  onChange={handleChange}
                  rows={3}
                  disabled={isSubmitting}
                  className="resize-none border-gray-300 focus:border-red-500 focus:ring-red-500"
                  placeholder="e.g., Shortage of specialized labour for formwork, leading to schedule delays."
                  required
                />
              </div>

              {/* Category Select */}
              <div className="space-y-2">
                <Label htmlFor="category" className="block text-sm font-medium text-gray-700">Category <span className="text-red-500">*</span></Label>
                <Select
                    value={formData.category}
                    onValueChange={handleCategoryChange}
                    name="category"
                    disabled={isSubmitting}
                >
                    <SelectTrigger className="w-full border-gray-300 focus:ring-red-500">
                        {/* The SelectValue displays the current category, or the placeholder if formData.category is "" */}
                        <SelectValue placeholder="-- Select Category --" />
                    </SelectTrigger>
                    <SelectContent>
                        {/* FIX: Changed value="" to value="none" to prevent runtime error */}
                        <SelectItem value="none" className="text-gray-500">-- Select Category --</SelectItem> 
                        {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                {/* Custom Category Input (Conditional) */}
                {formData.category === "Other" && (
                  <Input
                    type="text"
                    name="customCategory"
                    value={formData.customCategory}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="Enter custom category name"
                    className="mt-2 border-gray-300 focus:border-red-500 focus:ring-red-500"
                  />
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 mt-4">
              {editing && (
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting} className="text-gray-600 border-gray-300 hover:bg-gray-100">
                  Cancel Edit
                </Button>
              )}
              <Button
                type="submit"
                className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition duration-150 shadow-md"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : editing ? "Update Issue" : "Save Issue"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Table Card */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">Issue Log ({issues.length} total)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center p-12 text-gray-500 flex justify-center items-center">
              <Loader2 className="h-5 w-5 animate-spin mr-3 text-red-600" />
              Loading critical issues...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-red-50 hover:bg-red-50 text-xs uppercase tracking-wider">
                    <TableHead className="text-left p-4 w-[10%] text-red-700 font-bold">ID</TableHead><TableHead className="text-left p-4 w-[20%] text-red-700 font-bold">Category</TableHead><TableHead className="text-left p-4 w-auto text-red-700 font-bold">Issue Description</TableHead><TableHead className="text-center p-4 w-[15%] text-red-700 font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedIssues.length > 0 ? (
                    paginatedIssues.map(issue => (
                      <TableRow key={issue.id} className="hover:bg-gray-50 text-sm border-b">
                        <TableCell className="p-4 font-bold text-gray-800">{issue.id}</TableCell><TableCell className="p-4 text-gray-600 font-medium">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            {issue.category || "General"}
                          </span>
                        </TableCell><TableCell className="p-4 text-gray-800 max-w-lg">
                          {truncateText(issue.issue_description)}
                          {issue.issue_description.length > 80 && (
                            <Button
                              variant="link"
                              size="sm"
                              className="ml-2 h-auto p-0 text-blue-600 text-xs"
                              onClick={() => {
                                setSelectedDescription(issue.issue_description)
                                setShowDescriptionModal(true)
                              }}
                            >
                              View More
                            </Button>
                          )}
                        </TableCell><TableCell className="p-4 text-center">
                          <div className="flex justify-center space-x-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleEdit(issue)}
                              title="Edit Issue"
                              disabled={isSubmitting}
                              className="hover:bg-blue-100 text-blue-500"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => handleDeleteClick(issue)}
                              title="Delete Issue"
                              disabled={isSubmitting}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center p-8 text-gray-500 bg-white">
                        No critical issues found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Pagination Controls --- */}
      {issues.length > itemsPerPage && (
        <div className="flex justify-between items-center mt-4 p-4">
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages || 1}
          </span>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1 || isSubmitting}
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages || isSubmitting}
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* --- Modals --- */}
      
      {/* Delete Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-[425px] rounded-lg shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center">
                <Trash2 className="w-5 h-5 mr-2" /> Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-gray-700">
            <p className="mb-4">
              Are you sure you want to **permanently delete** issue #{issueToDelete?.id}?
            </p>
            <p className="italic font-medium text-red-700 bg-red-50 p-3 rounded border border-red-200 text-sm">
                "{truncateText(issueToDelete?.issue_description || 'this issue', 100)}"
            </p>
            <p className="mt-4 text-sm text-gray-500">This action cannot be undone.</p>
          </div>
          <DialogFooter className="flex justify-end gap-3">
            <Button variant="outline" onClick={cancelDelete} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />} Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Description Modal */}
      <Dialog open={showDescriptionModal} onOpenChange={setShowDescriptionModal}>
        <DialogContent className="sm:max-w-lg rounded-lg shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800">Full Issue Description</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-gray-700">
            <p className="whitespace-pre-line bg-gray-50 p-4 rounded border text-sm">{selectedDescription}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDescriptionModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}