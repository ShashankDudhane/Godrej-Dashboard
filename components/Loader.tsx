import { Loader2 } from "lucide-react"

export function Loader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
    </div>
  )
}
