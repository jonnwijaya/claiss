'use client'

import { Dashboard } from '@/components/dashboard/dashboard'
import { BackgroundProcessor } from '@/components/processing/background-processor'

export default function DashboardPage() {
  return (
    <>
      <BackgroundProcessor />
      <Dashboard />
    </>
  )
}
