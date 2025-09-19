"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader } from "@/components/Loader"
import { motion } from "framer-motion"

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push("/dashboard")
    }
  }

  if (loading) return <Loader />

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md px-4"
      >
        <Card className="shadow-2xl border border-gray-200 dark:border-gray-700 rounded-2xl">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Godrej Admin Portal
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Sign in to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-5">
              <div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm font-medium text-center">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
              >
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} Godrej Emerald Waters
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
