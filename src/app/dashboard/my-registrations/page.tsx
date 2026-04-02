import { Suspense } from 'react'
import { MyRegistrationsClient } from './my-registrations-client'

function MyRegistrationsLoading() {
  return (
    <div className="pt-8 px-4 max-w-7xl mx-auto">
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function MyRegistrationsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<MyRegistrationsLoading />}>
        <MyRegistrationsClient />
      </Suspense>
    </div>
  )
}
