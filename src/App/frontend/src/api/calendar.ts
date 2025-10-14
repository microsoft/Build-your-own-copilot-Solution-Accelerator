export interface CalendarDateTime {
  dateTime: string
  timeZone?: string
}

export interface CalendarEvent {
  id: string
  subject?: string
  start?: CalendarDateTime
  end?: CalendarDateTime
  location?: string | null
  isAllDay?: boolean
}

interface CalendarQueryOptions {
  days?: number
  timezone?: string
  start?: string
  end?: string
}

export const fetchCalendarEvents = async (options: CalendarQueryOptions = {}): Promise<CalendarEvent[]> => {
  const params = new URLSearchParams()
  if (options.start) params.set('start', options.start)
  if (options.end) params.set('end', options.end)
  if (options.days) params.set('days', String(options.days))
  if (options.timezone) params.set('timezone', options.timezone)

  const queryString = params.toString()
  const response = await fetch(`/api/calendar/events${queryString ? `?${queryString}` : ''}`, {
    method: 'GET'
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Failed to load calendar events')
  }

  const payload = await response.json()
  return payload.events ?? []
}
