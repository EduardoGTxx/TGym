// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useStore, DEF } from '../store/useStore.js'
import Gym from './Gym.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('Gym view', () => {
  let root, host

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)

    const S = structuredClone(DEF)
    S.muscleGoals = {
      period: 'weekly',
      lastResetPeriod: '2026-W45',
      goals: { biceps: 20, chest: 25 },
      counts: { biceps: 5, chest: 12 }
    }
    S.workouts = []
    useStore.setState({ S, user: null })
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  it('renders muscle goals with counts and does not render mock sample data', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <Gym />
        </MemoryRouter>
      )
    })

    expect(host.textContent).toContain('Gym')
    expect(host.textContent).toContain('Biceps')
    expect(host.textContent).toContain('Chest')
    expect(host.textContent).toContain('5')
    expect(host.textContent).toContain('20')
    expect(host.textContent).toContain('12')
    expect(host.textContent).toContain('25')

    // Verify mock sample data is NOT rendered
    expect(host.textContent).not.toContain('Incline Inner-Biceps Curl')
    expect(host.textContent).not.toContain('Regular-Grip Barbell Curl')
    expect(host.textContent).not.toContain('Goblet Squat')
    expect(host.textContent).not.toContain('Deadlifts')

    // Empty state should be rendered when no workouts are logged
    expect(host.textContent).toContain('No workouts logged yet')
  })

  it('allows increasing and decreasing muscle counts and goals', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <Gym />
        </MemoryRouter>
      )
    })

    const incCountBtn = host.querySelector('button[aria-label="Increase count"]')
    expect(incCountBtn).toBeTruthy()
    await act(async () => {
      incCountBtn.click()
    })
    expect(useStore.getState().S.muscleGoals.counts.biceps).toBe(6)

    const decCountBtn = host.querySelector('button[aria-label="Decrease count"]')
    expect(decCountBtn).toBeTruthy()
    await act(async () => {
      decCountBtn.click()
    })
    expect(useStore.getState().S.muscleGoals.counts.biceps).toBe(5)
  })
})
