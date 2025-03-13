"use client";

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

export function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error
      setMessage('Check your email for the confirmation link!')
    } catch (error: any) {
      setMessage(error?.message || 'An error occurred during sign up')
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error: any) {
      setMessage(error?.message || 'An error occurred during sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col space-y-4 w-full max-w-md">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="p-2 border rounded bg-background text-foreground"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="p-2 border rounded bg-background text-foreground"
      />
      <div className="flex space-x-2">
        <Button onClick={handleSignIn} disabled={loading}>
          Sign In
        </Button>
        <Button onClick={handleSignUp} disabled={loading} variant="outline">
          Sign Up
        </Button>
      </div>
      {message && <p className="text-sm text-red-500">{message}</p>}
    </div>
  )
}
