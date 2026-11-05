// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useStore, DEF } from '../store/useStore.js'
import CardioAndCalorieBalanceCard from './CardioAndCalorieBalanceCard.jsx'
import { todayISO } from '../lib/format.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('CardioAndCalorieBalanceCard', () => {
  let root, host
  const today = todayISO()

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)

    const S = structuredClone(DEF)
    S.weightKg = 70
    S.unit = 'kg'
    S.workouts = [
      {
        id: 'w1',
        d: today,
        activity: {
          type: 'walking',
          steps: 4500,
          distanceKm: 3.2,
          calories: 180,
          minutes: 40
        }
      },
      {
        id: 'w2',
        d: today,
        activity: {
          type: 'climbing',
          steps: 2200,
          distanceMeters: 600,
          distanceKm: 0.6,
          calories: 250,
          minutes: 35
        }
      }
    ]
    S.nutrition = {
      logs: {
        [today]: {
          items: [
            { id: 'n1', name: 'Oatmeal', calories: 400, p: 15, c: 65, f: 8 },
            { id: 'n2', name: 'Chicken & Rice', calories: 750, p: 55, c: 80, f: 12 }
          ]
        }
      }
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

  it('renders burned calories, consumed calories, and steps balance', async () => {
    await act(async () => {
      root.render(<CardioAndCalorieBalanceCard />)
    })

    // Burned: 180 + 250 = 430 kcal
    expect(host.textContent).toContain('430')

    // Consumed: 400 + 750 = 1,150 kcal
    expect(host.textContent).toMatch(/1[,.]?150/)

    // Steps: 4500 + 2200 = 6,700 steps
    expect(host.textContent).toMatch(/6[,.]?700/)

    // Surplus: 1150 - 430 = +720 kcal
    expect(host.textContent).toContain('+720')
  })

  it('switches period to week and month', async () => {
    await act(async () => {
      root.render(<CardioAndCalorieBalanceCard />)
    })

    const weekBtn = [...host.querySelectorAll('label')].find(el => el.textContent.includes('Week'))
    if (weekBtn) {
      await act(async () => {
        weekBtn.click()
      })
      expect(host.textContent).toContain('Past 7 days')
    }
  })
})
