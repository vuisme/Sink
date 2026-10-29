export interface LogEvent {
  id: string
  slug: string
  ip?: string
  ua?: string
  visitorId?: string
  sessionId?: string
  clientHints?: string
  os?: string
  browser?: string
  country?: string
  region?: string
  city?: string
  latitude?: number
  longitude?: number
  COLO?: string
  timestamp: number
}

export interface ArcData {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  color: string
  arcAltitude: number
}

export interface ColoData {
  lat: number
  lon: number
}
