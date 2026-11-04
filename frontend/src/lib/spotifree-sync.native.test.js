// @vitest-environment happy-dom
import { beforeEach, afterEach, expect, it, vi } from 'vitest'

const mockBroadcast = vi.fn()
vi.mock('./mobile.js', () => ({ MOBILE: true }))
vi.mock('@capacitor/browser', () => ({ Browser: { open: vi.fn() } }))

import {
  emitRestStart,
  emitRestEnd,
  emitWorkoutFinish,
  clearSpotifreeRest,
} from './spotifree-sync.js'
import { useStore, DEF } from '../store/useStore.js'

beforeEach(() => {
  clearSpotifreeRest()
  vi.clearAllMocks()
  localStorage.clear()
  useStore.setState({
    S: {
      ...structuredClone(DEF),
      enableSpotifreeSync: true,
    },
    user: null,
  })
  vi.stubGlobal('Capacitor', {
    Plugins: {
      WorkoutNotification: {
        broadcastSpotifree: mockBroadcast,
      },
    },
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

it('broadcasts REST_START to native WorkoutNotification plugin on Android', () => {
  const endsAt = Date.now() + 60000
  emitRestStart(60, endsAt, 60, 'Bench Press')

  expect(mockBroadcast).toHaveBeenCalledWith({
    type: 'REST_START',
    seconds: 60,
    endsAt,
    total: 60,
    exerciseName: 'Bench Press',
  })
})

it('broadcasts REST_END to native WorkoutNotification plugin on Android', () => {
  const endsAt = Date.now() + 60000
  emitRestStart(60, endsAt, 60, 'Bench Press')
  mockBroadcast.mockClear()

  emitRestEnd()
  expect(mockBroadcast).toHaveBeenCalledWith({ type: 'REST_END' })
})

it('broadcasts WORKOUT_FINISH with date and duration to native plugin on Android', () => {
  const workout = {
    id: 'native-finish-test',
    d: '2026-11-04',
    start: Date.now() - 3600000,
    end: Date.now(),
  }
  emitWorkoutFinish(workout)

  expect(mockBroadcast).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'WORKOUT_FINISH',
      date: '2026-11-04',
      durationMs: expect.any(Number),
    })
  )
})
