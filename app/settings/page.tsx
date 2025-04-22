"use client"

// app/settings/page.tsx
import { useAuth } from "@/lib/hooks/use-auth"
import { redirect } from "next/navigation"
import LifetimeCredentialsForm from "@/components/lifetime-credentials-form"
import MainNav from "@/components/main-nav"

export default function SettingsPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!user) {
    redirect("/login")
  }

  return (
    <>
      <MainNav user={user} />
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Lifetime Fitness Credentials</h2>
            <LifetimeCredentialsForm userId={user.id} />
          </section>
        </div>
      </div>
    </>
  )
}