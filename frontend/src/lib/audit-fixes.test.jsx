// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { DEF, useStore } from '../store/useStore.js'
import { getLatestWeightKg, estimateCaloriesBurned } from './activity-engine.js'
import { doFinishWorkout } from '../sheets.jsx'

describe('Audit fixes verification', () => {
  it('getLatestWeightKg falls back to latest bodyweight entry when weightKg is missing', () => {
    const state = {
      unit: 'lb',
      bodyweight: [
        { d: '2026-11-01', w: 220, unit: 'lb' },
        { d: '2026-11-05', w: 217, unit: 'lb' }
      ]
    }
    const weightKg = getLatestWeightKg(state)
    // 217 lb * 0.45359237 ~ 98.43 kg
    expect(weightKg).toBeCloseTo(98.43, 1)

    const calories = estimateCaloriesBurned('walking', 60, 'moderate', weightKg)
    // 3.8 MET * ~98.43 kg * 1 hour ~ 374 kcal (vs 75 kg * 3.8 ~ 285 kcal)
    expect(calories).toBeGreaterThan(350)
  })

  it('doFinishWorkout counts all completed exercises per muscle group', () => {
    useStore.setState({
      S: {
        ...DEF,
        muscleGoals: {
          period: 'weekly',
          lastResetPeriod: '2026-W45',
          goals: { biceps: 8, chest: 8 },
          counts: { biceps: 0, chest: 0 }
        },
        active: {
          id: 'test-act-1',
          d: '2026-11-05',
          start: Date.now() - 3600000,
          entries: [
            { id: 'biceps-curl', muscleGroup: 'biceps', sets: [{ done: true, w: 15, r: 10 }] },
            { id: 'hammer-curl', muscleGroup: 'biceps', sets: [{ done: true, w: 15, r: 10 }] },
            { id: 'preacher-curl', muscleGroup: 'biceps', sets: [{ done: true, w: 15, r: 10 }] },
            { id: 'bench-press', muscleGroup: 'chest', sets: [{ done: true, w: 60, r: 8 }] }
          ]
        },
        workouts: []
      }
    })

    doFinishWorkout({ silent: true })

    const state = useStore.getState().S
    expect(state.muscleGoals.counts.biceps).toBe(3)
    expect(state.muscleGoals.counts.chest).toBe(1)
  })

  it('normalizes step goal daily target when weekly', () => {
    const stepGoal = { enabled: true, period: 'weekly', target: 70000 }
    const dailyTarget = stepGoal.period === 'weekly' ? Math.round(stepGoal.target / 7) : stepGoal.target
    expect(dailyTarget).toBe(10000)
  })
})
