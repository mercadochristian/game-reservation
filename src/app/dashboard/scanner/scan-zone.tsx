'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type BrowserBarcode = { rawValue?: string }
type BarcodeDetectorLike = {
  detect: (input: ImageBitmapSource) => Promise<BrowserBarcode[]>
}

interface ScanZoneProps {
  scheduleId: string | null
  onScanSuccess: (result: any) => void
  onPaymentBlocked: (payload: any) => void
  isScanning: boolean
}

export function ScanZone({
  scheduleId,
  onScanSuccess,
  onPaymentBlocked,
  isScanning,
}: ScanZoneProps) {
  const [qrToken, setQrToken] = useState('')
  const [localIsScanning, setLocalIsScanning] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraSupported, setCameraSupported] = useState(true)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<BarcodeDetectorLike | null>(null)
  const scanTimerRef = useRef<number | null>(null)
  const recentTokenRef = useRef<{ token: string; scannedAt: number } | null>(null)

  const isDisabled = !scheduleId || localIsScanning || isScanning

  async function runScan(qrTokenValue: string) {
    if (!scheduleId) return

    setLocalIsScanning(true)
    try {
      const response = await fetch('/api/scanner/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: qrTokenValue.trim(), schedule_id: scheduleId }),
      })

      const payload = await response.json().catch(() => ({ error: 'Invalid response payload' }))

      // Check for 402 (payment not approved)
      if (response.status === 402) {
        onPaymentBlocked(payload)
        setQrToken('')
        return
      }

      if (!response.ok) {
        toast.error(payload.error ?? 'Failed to scan QR token')
        return
      }

      const scanResult = payload
      onScanSuccess(scanResult)

      if (scanResult.already_attended) {
        toast.success('Attendance was already marked for this player')
      } else {
        toast.success('Attendance marked successfully')
      }

      setQrToken('')
    } catch {
      toast.error('Failed to scan QR token')
    } finally {
      setLocalIsScanning(false)
    }
  }

  async function handleScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runScan(qrToken)
  }

  async function startCamera() {
    setCameraError(null)
    setCameraLoading(true)
    try {
      const BarcodeDetectorCtor = (window as any).BarcodeDetector as
        | (new (options: { formats: string[] }) => BarcodeDetectorLike)
        | undefined

      if (!navigator.mediaDevices?.getUserMedia || !BarcodeDetectorCtor) {
        setCameraSupported(false)
        setCameraError('Camera QR scanning is not supported in this browser. Use manual token input.')
        return
      }

      detectorRef.current = new BarcodeDetectorCtor({ formats: ['qr_code'] })

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setCameraActive(true)
    } catch {
      setCameraError('Unable to access camera. Check browser permissions and try again.')
    } finally {
      setCameraLoading(false)
    }
  }

  function stopCamera() {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current)
      scanTimerRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraActive(false)
  }

  // Camera detection loop
  useEffect(() => {
    if (!cameraActive || !videoRef.current || !detectorRef.current) return

    scanTimerRef.current = window.setInterval(async () => {
      if (!videoRef.current || !detectorRef.current || localIsScanning || isScanning) return
      if (videoRef.current.readyState < 2) return

      try {
        const codes = await detectorRef.current.detect(videoRef.current)
        const rawValue = codes.find((item) => typeof item.rawValue === 'string' && item.rawValue.trim().length > 0)?.rawValue?.trim()
        if (!rawValue) return

        const now = Date.now()
        const recent = recentTokenRef.current
        if (recent && recent.token === rawValue && now - recent.scannedAt < 5000) return

        recentTokenRef.current = { token: rawValue, scannedAt: now }
        setQrToken(rawValue)
        await runScan(rawValue)
      } catch {
        // Ignore intermittent detector errors
      }
    }, 700)

    return () => {
      if (scanTimerRef.current) {
        window.clearInterval(scanTimerRef.current)
        scanTimerRef.current = null
      }
    }
  }, [cameraActive, localIsScanning, isScanning])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera()
  }, [])

  return (
    <Card className={isDisabled ? 'opacity-50 pointer-events-none' : ''}>
      <CardHeader>
        <CardTitle>Scanner</CardTitle>
        <CardDescription>
          {!scheduleId ? 'Select a schedule to begin scanning' : 'Scan or paste a player QR token to mark attendance'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            {cameraActive ? (
              <Button type="button" variant="secondary" onClick={stopCamera} disabled={isDisabled}>
                Stop Camera
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={startCamera} disabled={cameraLoading || !cameraSupported || isDisabled}>
                {cameraLoading ? 'Starting camera...' : 'Start Camera'}
              </Button>
            )}
            {!cameraSupported && <Badge variant="outline">Unsupported</Badge>}
          </div>
          <video ref={videoRef} className="w-full max-h-72 rounded-md bg-black/70" muted playsInline />
          {cameraError && <p className="text-xs text-destructive mt-3">{cameraError}</p>}
        </div>

        <form onSubmit={handleScan} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={qrToken}
            onChange={(event) => setQrToken(event.target.value)}
            placeholder="Enter QR token (UUID)"
            aria-label="QR token"
            disabled={isDisabled}
            required
          />
          <Button type="submit" disabled={isDisabled || !qrToken.trim()}>
            {localIsScanning || isScanning ? 'Scanning...' : 'Scan'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
