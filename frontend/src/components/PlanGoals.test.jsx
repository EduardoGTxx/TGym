// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useStore, DEF } from '../store/useStore.js'
import { MuscleGoalsManager, StepGoalManager } from './PlanGoals.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('MuscleGoalsManager and StepGoalManager', () => {
  let root, host

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)

    const S = structuredClone(DEF)
    S.muscleGoals = {
      period: 'weekly',
      lastResetPeriod: '2026-W45',
      goals: { biceps: 12, chest: 15 },
      counts: { biceps: 4, chest: 10 }
    }
    S.stepGoal = {
      enabled: true,
      period: 'daily',
      target: 10000
    }
    useStore.setState({ S, user: null })
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  it('renders configured muscle goals and switches period', async () => {
    await act(async () => {
      root.render(<MuscleGoalsManager />)
    })

    expect(host.textContent).toContain('Biceps')
    expect(host.textContent).toContain('Chest')
    expect(host.textContent).toContain('12')
    expect(host.textContent).toContain('15')

    // Find and click the Monthly option
    const monthlyBtn = [...host.querySelectorAll('label')].find(el => el.textContent.includes('Monthly'))
    if (monthlyBtn) {
      await act(async () => {
        monthlyBtn.click()
      })
      expect(useStore.getState().S.muscleGoals.period).toBe('monthly')
    }
  })

  it('increments and decrements target exercise goals', async () => {
    await act(async () => {
      root.render(<MuscleGoalsManager />)
    })

    const incBtns = [...host.querySelectorAll('button[aria-label="Increase goal"]') ]
    expect(incBtns.length).toBeGreaterThan(0)
    await act(async () => {
      incBtns[0].click()
    })
    expect(useStore.getState().S.muscleGoals.goals.biceps).toBe(13)

    const decBtns = [...host.querySelectorAll('button[aria-label="Decrease goal"]') ]
    await act(async () => {
      decBtns[0].click()
    })
    expect(useStore.getState().S.muscleGoals.goals.biceps).toBe(12)
  })

  it('removes a muscle group', async () => {
    await act(async () => {
      root.render(<MuscleGoalsManager />)
    })

    const removeBtn = host.querySelector('button[aria-label="Remove Biceps"]')
    expect(removeBtn).toBeTruthy()
    await act(async () => {
      removeBtn.click()
    })
    expect(useStore.getState().S.muscleGoals.goals.biceps).toBeUndefined()
  })

  it('renders and updates StepGoalManager', async () => {
    await act(async () => {
      root.render(<StepGoalManager />)
    })

    expect(host.textContent).toContain('Step Goal')
    const toggleBtn = host.querySelector('.plan-toggle-btn')
    expect(toggleBtn).toBeTruthy()

    await act(async () => {
      toggleBtn.click()
    })
    expect(useStore.getState().S.stepGoal.enabled).toBe(false)
  })
})
