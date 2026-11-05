import { describe, expect, it } from 'vitest'
import {
  getFootSizeAndStride,
  stepsFromDistance,
  estimateCaloriesBurned,
  reconcileMuscleGoals,
  getDateListForPeriod,
  getConsumedCalories,
  getBurnedCalories,
  getCompletedSteps,
  getTodayMuscleGroups,
  setDayMuscleGroups,
  getMuscleLabel
} from './activity-engine.js'

describe('activity-engine', () => {
  it('estimates foot size and stride length when no measurement is present', () => {
    const state = { heightCm: 180, gender: 'male', weightKg: 80 }
    const { footSizeCm, stepLengthMeters, isEstimated } = getFootSizeAndStride(state)
    expect(isEstimated).toBe(true)
    expect(footSizeCm).toBeGreaterThan(25)
    expect(footSizeCm).toBeLessThan(32)
    expect(stepLengthMeters).toBeGreaterThan(0.7)
    expect(stepLengthMeters).toBeLessThan(0.9)
  })

  it('uses real foot measurement when recorded', () => {
    const state = {
      measurements: [{ d: '2026-11-01', footRight: 27.5, unit: 'cm' }],
      heightCm: 180
    }
    const { footSizeCm, stepLengthMeters, isEstimated } = getFootSizeAndStride(state)
    expect(isEstimated).toBe(false)
    expect(footSizeCm).toBe(27.5)
    expect(stepLengthMeters).toBe(0.77)
  })

  it('converts distance to steps accurately', () => {
    const state = {
      measurements: [{ d: '2026-11-01', footRight: 26, unit: 'cm' }]
    }
    const steps = stepsFromDistance(1, state)
    expect(steps).toBe(1374)
  })

  it('calculates calories burned with MET and intensity', () => {
    const cal = estimateCaloriesBurned('walking', 60, 'moderate', 75)
    expect(cal).toBe(285)

    const cyclingCal = estimateCaloriesBurned('cycling', 30, 'vigorous', 80)
    expect(cyclingCal).toBe(400)
  })

  it('reconciles and resets muscle goals counts on period rollover', () => {
    const state = {
      muscleGoals: {
        period: 'weekly',
        lastResetPeriod: '2026-W40',
        goals: { biceps: 10, chest: 12 },
        counts: { biceps: 8, chest: 12 }
      }
    }
    const now = new Date('2026-11-05T12:00:00Z')
    const reset = reconcileMuscleGoals(state, now)
    expect(reset).toBe(true)
    expect(state.muscleGoals.counts.biceps).toBe(0)
    expect(state.muscleGoals.counts.chest).toBe(0)
    expect(state.muscleGoals.goals.biceps).toBe(10)
  })

  it('calculates consumed calories, burned calories, and completed steps across activities', () => {
    const state = {
      measurements: [{ d: '2026-11-01', footRight: 26, unit: 'cm' }],
      nutrition: {
        logs: {
          '2026-11-05': {
            items: [
              { calories: 500, qty: 1 },
              { calories: 300, qty: 2 }
            ]
          }
        }
      },
      workouts: [
        {
          d: '2026-11-05',
          kind: 'activity',
          activity: { type: 'walking', steps: 4000, calories: 150 }
        },
        {
          d: '2026-11-05',
          kind: 'activity',
          activity: { type: 'climbing', distanceKm: 0.5, calories: 180 }
        }
      ]
    }

    const dates = getDateListForPeriod('day', new Date('2026-11-05T12:00:00Z'))
    expect(dates).toEqual(['2026-11-05'])

    const consumed = getConsumedCalories(state, dates)
    expect(consumed).toBe(1100)

    const burned = getBurnedCalories(state, dates)
    expect(burned).toBe(330)

    // 4000 walking steps + 500m climbing = 4000 + 687 = 4687 steps
    const steps = getCompletedSteps(state, dates)
    expect(steps).toBe(4687)
  })

  it('manages muscle schedule per day and returns readable labels', () => {
    const state = {}
    setDayMuscleGroups(state, 1, ['chest', 'triceps'])
    expect(state.muscleWeek[1]).toEqual(['chest', 'triceps'])

    // Thursday Nov 5 2026 is day 4
    const nov5 = new Date('2026-11-05T12:00:00Z')
    expect(getTodayMuscleGroups(state, nov5)).toEqual([])

    setDayMuscleGroups(state, 4, ['legs', 'calves'])
    expect(getTodayMuscleGroups(state, nov5)).toEqual(['legs', 'calves'])

    expect(getMuscleLabel('biceps')).toBe('Biceps')
    expect(getMuscleLabel('custom_glute')).toBe('Custom_glute')
  })
})
