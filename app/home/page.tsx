"use client"

import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sun, Zap, GitMerge, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

const systemTypes = [
  {
    id: "on-grid",
    title: "On-Grid Systems",
    description: "Grid-connected solar inverters for net metering",
    icon: Zap,
    count: 24,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-950/50",
  },
  {
    id: "off-grid",
    title: "Off-Grid Systems",
    description: "Standalone solar systems with battery backup",
    icon: Sun,
    count: 12,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950/50",
  },
  {
    id: "hybrid",
    title: "Hybrid Systems",
    description: "Combined grid and battery backup solutions",
    icon: GitMerge,
    count: 18,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-950/50",
  },
]

function HomePage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem("isAuthenticated")
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">AlemdAR flow</h1>
          </div>
          <div className="flex items-center gap-2">
            {mounted && (
              <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 text-balance">Customer Systems</h2>
          <p className="text-muted-foreground text-lg">
            Select a system type to view and monitor your customers' solar inverters
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {systemTypes.map((system) => (
            <Card
              key={system.id}
              className="cursor-pointer border transition-all hover:shadow-lg hover:scale-102 active:scale-96"
              onClick={() => router.push(`/systems/${system.id}`)}
            >
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${system.bgColor} flex items-center justify-center mb-4`}>
                  <system.icon className={`h-6 w-6 ${system.color}`} />
                </div>
                <CardTitle className="text-2xl">{system.title}</CardTitle>
                <CardDescription className="text-base">{system.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{system.count}</span>
                  <span className="text-muted-foreground">active systems</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}

export default function HomePageWithAuth() {
  return (
    <AuthGuard>
      <HomePage />
    </AuthGuard>
  )
}
