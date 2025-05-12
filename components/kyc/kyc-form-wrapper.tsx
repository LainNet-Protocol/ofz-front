'use client'

import dynamic from 'next/dynamic'

const KycFormNoSSR = dynamic(
  () => import('@/components/kyc/kyc-form').then(mod => mod.KycForm),
  { ssr: false }
)

export function KycFormWrapper() {
  return <KycFormNoSSR />
} 
