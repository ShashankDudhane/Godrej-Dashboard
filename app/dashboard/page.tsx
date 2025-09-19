"use client"

import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { Loader } from "@/components/Loader"

export default function DashboardPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/signin")
      } else {
        setUserEmail(user.email ?? null)
      }
      setLoading(false)
    }
    getUser()
  }, [router])

  
  if (loading) return <Loader />

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Welcome, {userEmail}</h1>
      <p className="mt-4">This is the admin dashboard.</p>
      
    </div>
  )
}
