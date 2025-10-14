import Cards from './Cards'
import { renderWithContext, screen, waitFor, within } from '../../test/test.utils'
import userEvent from '@testing-library/user-event'
import { fetchPlannerItems, createPlannerItem, updatePlannerItem } from '../../api/reminders'
import { fetchCalendarEvents } from '../../api/calendar'
import type { PlannerItem } from '../../api/reminders'
import type { CalendarEvent } from '../../api/calendar'

jest.mock('../../api/reminders')
jest.mock('../../api/calendar')

const mockFetchPlannerItems = fetchPlannerItems as jest.MockedFunction<typeof fetchPlannerItems>
const mockCreatePlannerItem = createPlannerItem as jest.MockedFunction<typeof createPlannerItem>
const mockUpdatePlannerItem = updatePlannerItem as jest.MockedFunction<typeof updatePlannerItem>
const mockFetchCalendarEvents = fetchCalendarEvents as jest.MockedFunction<typeof fetchCalendarEvents>

describe('Cards component (Mira dashboard)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-10-14T15:30:00Z'))

    const reminderFixtures: PlannerItem[] = [
      {
        id: 'rem-1',
        label: 'Evening medication',
        time: '20:00',
        completed: false,
        itemType: 'reminder'
      }
    ]

    const todoFixtures: PlannerItem[] = [
      {
        id: 'todo-1',
        label: 'Call Dr. Lee',
        completed: false,
        itemType: 'todo',
        time: null
      }
    ]

    const calendarFixtures: CalendarEvent[] = [
      {
        id: 'event-1',
        subject: 'Clinic visit',
        start: { dateTime: '2025-10-15T14:00:00Z', timeZone: 'UTC' },
        end: { dateTime: '2025-10-15T15:00:00Z', timeZone: 'UTC' },
        location: 'Seattle Children\'s Hospital'
      }
    ]

    mockFetchPlannerItems.mockImplementation(async (type: Parameters<typeof fetchPlannerItems>[0]) =>
      type === 'reminder' ? reminderFixtures : todoFixtures
    )
    mockCreatePlannerItem.mockImplementation(async (
      type: Parameters<typeof createPlannerItem>[0],
      payload: Parameters<typeof createPlannerItem>[1]
    ) => ({
      id: `${type}-new`,
      label: payload.label ?? '',
      time: payload.time ?? null,
      completed: payload.completed ?? false,
      itemType: type
    }))
    mockUpdatePlannerItem.mockImplementation(async (
      type: Parameters<typeof updatePlannerItem>[0],
      id: Parameters<typeof updatePlannerItem>[1],
      updates: Parameters<typeof updatePlannerItem>[2]
    ) => ({
      id,
      label: updates.label ?? 'Updated item',
      time: updates.time ?? null,
      completed: updates.completed ?? false,
      itemType: type
    }))
    mockFetchCalendarEvents.mockResolvedValue(calendarFixtures)

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        Heading: 'Sickle cell care',
        AbstractText: 'Stay hydrated and monitor pain levels closely.',
        AbstractURL: 'https://duckduckgo.com'
      })
    }) as unknown as typeof fetch
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.resetAllMocks()
  })

  test('renders the daily summary with greeting and quick actions', async () => {
    renderWithContext(<Cards />)

    await waitFor(() => expect(mockFetchPlannerItems).toHaveBeenCalledTimes(2))

    expect(await screen.findByText('Good afternoon, Mira!')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Take 15 min breather/i })).toBeInTheDocument()
    expect(await screen.findByText('Evening medication')).toBeInTheDocument()
  })

  test('allows adding a new reminder', async () => {
    renderWithContext(<Cards />)

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

  const remindersHeading = await screen.findByText('Upcoming reminders')
  const remindersCard = remindersHeading.closest('article') as HTMLElement
    const reminderInput = within(remindersCard).getByPlaceholderText('Add a reminder')
    await user.type(reminderInput, 'Pick up groceries')

    const addButton = within(remindersCard).getByRole('button', { name: /^add$/i })
    await user.click(addButton)

    await waitFor(() =>
      expect(mockCreatePlannerItem).toHaveBeenCalledWith('reminder', { label: 'Pick up groceries', time: 'Anytime' })
    )
    expect(await screen.findByText('Pick up groceries')).toBeInTheDocument()
  })

  test('toggles a todo item', async () => {
    renderWithContext(<Cards />)

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    const todoItem = await screen.findByText('Call Dr. Lee')
    const todoCheckbox = within(todoItem.closest('li') as HTMLElement).getByRole('checkbox') as HTMLInputElement

    await user.click(todoCheckbox)

    expect(todoCheckbox).toBeChecked()
    await waitFor(() =>
      expect(mockUpdatePlannerItem).toHaveBeenCalledWith('todo', 'todo-1', expect.objectContaining({ completed: true }))
    )
  })

  test('fetches live health info when the topic changes', async () => {
    renderWithContext(<Cards />)

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())

    const topicInput = screen.getByPlaceholderText('Search health advice')
    await user.clear(topicInput)
    await user.type(topicInput, 'child hydration tips')

    await waitFor(() => expect((globalThis.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(1))
    const calls = (globalThis.fetch as jest.Mock).mock.calls
    const lastCall = calls[calls.length - 1][0]
    expect(lastCall).toContain('child%20hydration%20tips')
  })

  test('adds a health note to the log', async () => {
    renderWithContext(<Cards />)

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    const noteInput = screen.getByPlaceholderText('Add a health note')
    await user.type(noteInput, 'Checked temperature, all good.')

    const logButton = screen.getByRole('button', { name: /log/i })
    await user.click(logButton)

    expect(screen.getAllByText('Checked temperature, all good.')).toHaveLength(2)
  })

  test('shows upcoming calendar events from the API', async () => {
    renderWithContext(<Cards />)

    await waitFor(() => expect(mockFetchCalendarEvents).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Clinic visit')).toBeInTheDocument()
    expect(screen.getByText(/Seattle Children/)).toBeInTheDocument()
  })
})
