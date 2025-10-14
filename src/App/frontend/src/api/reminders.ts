export type PlannerItemType = 'reminder' | 'todo'

export interface PlannerItem {
  id: string
  label: string
  time?: string | null
  completed: boolean
  itemType: PlannerItemType
  createdAt?: string
  updatedAt?: string
}

interface PlannerItemPayload {
  label?: string
  time?: string | null
  completed?: boolean
}

const plannerEndpoints: Record<PlannerItemType, string> = {
  reminder: '/api/reminders',
  todo: '/api/todos'
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Planner request failed')
  }
  return (await response.json()) as T
}

export const fetchPlannerItems = async (type: PlannerItemType): Promise<PlannerItem[]> => {
  const response = await fetch(plannerEndpoints[type], {
    method: 'GET'
  })
  return handleResponse<PlannerItem[]>(response)
}

export const createPlannerItem = async (
  type: PlannerItemType,
  payload: PlannerItemPayload
): Promise<PlannerItem> => {
  const response = await fetch(plannerEndpoints[type], {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  return handleResponse<PlannerItem>(response)
}

export const updatePlannerItem = async (
  type: PlannerItemType,
  id: string,
  updates: PlannerItemPayload
): Promise<PlannerItem> => {
  const response = await fetch(`${plannerEndpoints[type]}/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  })
  return handleResponse<PlannerItem>(response)
}

export const deletePlannerItem = async (type: PlannerItemType, id: string): Promise<void> => {
  const response = await fetch(`${plannerEndpoints[type]}/${id}`, {
    method: 'DELETE'
  })
  if (!response.ok && response.status !== 204) {
    const message = await response.text()
    throw new Error(message || 'Failed to delete planner item')
  }
}
