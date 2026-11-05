// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it } from 'vitest'
import Workout from './Workout.jsx'
import { DEF, useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'

let host, root

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(() => root.unmount())
  host.remove()
})

it('displays scheduled muscle groups in StartChooser and launches muscle workout', async () => {
  const day = new Date().getDay()
  const S = {
    ...structuredClone(DEF),
    lang: 'en',
    hasCompletedOnboarding: true,
    hasCompletedAppTour: true,
    routines: [],
    muscleWeek: { [day]: ['biceps'] },
    muscleGoals: { period: 'weekly', goals: { biceps: 8, chest: 8 }, counts: { biceps: 0, chest: 0 } }
  }
  useStore.setState({ S, user: null })
  useUI.setState({ sheets: [], appTourRequest: null })

  await act(async () => {
    root.render(
      <MemoryRouter>
        <Workout />
      </MemoryRouter>
    )
  })

  // Should display Today's muscle groups and Biceps
  expect(host.textContent).toContain("Today's muscle groups")
  expect(host.textContent).toContain('Biceps')
  // Should NOT display "Build a plan first" since muscles are scheduled
  expect(host.textContent).not.toContain('Build a plan first')

  // Click start on Biceps
  const startBtn = [...host.querySelectorAll('span.tag.acc')].find(el => el.textContent === 'Start')
  expect(startBtn).toBeTruthy()

  await act(async () => {
    startBtn.closest('.item').click()
  })

  // Workout should now be active for Biceps
  const active = useStore.getState().S.active
  expect(active).toBeTruthy()
  expect(active.name).toBe('Biceps')
  expect(active.activeMuscle).toBe('biceps')
  expect(active.entries).toEqual([])

  // Rerender shows active workout for Biceps
  expect(host.textContent).toContain('Biceps')
  expect(host.textContent).toContain('Biceps — add your first exercise.')
})
