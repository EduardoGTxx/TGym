// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useStore, DEF } from '../store/useStore.js'
import DailyMuscleWorkoutModal from './DailyMuscleWorkoutModal.jsx'
import DayMuscleScheduleModal from './DayMuscleScheduleModal.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('DayMuscleScheduleModal and DailyMuscleWorkoutModal', () => {
  let root, host

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)

    const S = structuredClone(DEF)
    S.muscleWeek = {
      1: ['chest', 'triceps'], // Monday
      2: ['back', 'biceps']    // Tuesday
    }
    S.muscleGoals = {
      period: 'weekly',
      lastResetPeriod: '2026-W45',
      goals: { chest: 20, triceps: 15, biceps: 15, back: 20 },
      counts: { chest: 2, triceps: 1 }
    }
    S.workouts = []
    useStore.setState({ S, user: null })
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  it('renders DayMuscleScheduleModal and toggles muscle groups for a day', async () => {
    const close = vi.fn()
    await act(async () => {
      root.render(<DayMuscleScheduleModal day={1} close={close} />)
    })

    expect(host.textContent).toContain('Chest')
    expect(host.textContent).toContain('Triceps')

    // Find and click Biceps chip to toggle it on
    const bicepsChip = [...host.querySelectorAll('.day-muscle-chip')].find(el => el.textContent.includes('Biceps'))
    expect(bicepsChip).toBeTruthy()
    await act(async () => {
      bicepsChip.click()
    })

    // Save
    const saveBtn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Save') || b.textContent.includes('Guardar'))
    expect(saveBtn).toBeTruthy()
    await act(async () => {
      saveBtn.click()
    })

    expect(useStore.getState().S.muscleWeek[1]).toContain('biceps')
    expect(close).toHaveBeenCalled()
  })

  it('renders DailyMuscleWorkoutModal and logs exercises to target muscles and finishes session', async () => {
    const close = vi.fn()
    await act(async () => {
      root.render(<DailyMuscleWorkoutModal close={close} />)
    })

    expect(host.textContent).toContain("Today's Workout")
    expect(host.textContent).toContain('Chest')

    // Fill exercise name using native setter so React detects the change
    const input = host.querySelector('input')
    expect(input).toBeTruthy()
    await act(async () => {
      const setVal = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setVal.call(input, 'Bench Press')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    // Click Log exercise
    const logBtn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Log exercise') || b.textContent.includes('Registrar'))
    expect(logBtn).toBeTruthy()
    await act(async () => {
      logBtn.click()
    })

    // Expect chest count incremented
    expect(useStore.getState().S.muscleGoals.counts.chest).toBe(2)
    expect(host.textContent).toContain('Bench Press')

    // Finish workout
    const finishBtn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Finish workout') || b.textContent.includes('Concluir'))
    expect(finishBtn).toBeTruthy()
    await act(async () => {
      finishBtn.click()
    })

    expect(useStore.getState().S.workouts.length).toBe(1)
    expect(useStore.getState().S.muscleGoals.counts.chest).toBe(3)
    expect(useStore.getState().S.workouts[0].entries[0].n).toBe('Bench Press')
    expect(close).toHaveBeenCalled()
  })
})
