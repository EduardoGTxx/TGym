// Activity engine: foot size estimation, stride steps, muscle goals, and calorie calculations.
import { isoOf } from './format.js'
import { MEASURE_FIELDS, measurementValue } from './stats-insights.js'
import { nutritionTotals } from './nutrition-totals.js'

export function getWeekKey(date = new Date()) {
  const dt = new Date(date)
  const day = (dt.getDay() + 6) % 7
  dt.setDate(dt.getDate() - day + 3)
  const firstThu = dt.getTime()
  dt.setMonth(0, 1)
  if (dt.getDay() !== 4) dt.setMonth(0, 1 + ((4 - dt.getDay() + 7) % 7))
  const weekNum = 1 + Math.ceil((firstThu - dt.getTime()) / 604800000)
  return `${new Date(firstThu).getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export function getMonthKey(date = new Date()) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function getCurrentPeriodKey(period = 'weekly', date = new Date()) {
  return period === 'monthly' ? getMonthKey(date) : getWeekKey(date)
}

/**
 * Generates array of ISO date strings for day, week (7 days), or month (30 days).
 */
export function getDateListForPeriod(period = 'day', anchor = new Date()) {
  const dates = []
  const count = period === 'month' ? 30 : period === 'week' ? 7 : 1
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(anchor)
    d.setDate(d.getDate() - i)
    dates.push(isoOf(d))
  }
  return dates
}

/**
 * Estimates or retrieves user's foot size in cm and step length in meters.
 * Checks real measurements first; if absent, estimates using height, sex, and weight.
 */
export function getFootSizeAndStride(state) {
  const measurements = state?.measurements || []
  let measuredFootCm = null
  for (let i = measurements.length - 1; i >= 0; i--) {
    const m = measurements[i]
    const val = measurementValue(m, 'footRight') || measurementValue(m, 'footLeft') || measurementValue(m, 'foot')
    if (val > 0) {
      measuredFootCm = val * (m.unit === 'in' ? 2.54 : 1)
      break
    }
  }

  const heightCm = Number(state?.heightCm) > 0 ? Number(state.heightCm) : 175
  const isFemale = state?.profile?.gender === 'female' || state?.gender === 'female' || state?.sex === 'female'
  const weightKg = Number(state?.weightKg) > 0 ? Number(state.weightKg) : (state?.unit === 'lb' ? 165 * 0.453592 : 75)

  let footSizeCm = measuredFootCm
  let isEstimated = false

  if (!footSizeCm || footSizeCm <= 0) {
    isEstimated = true
    const baseRatio = isFemale ? 0.148 : 0.153
    footSizeCm = heightCm * baseRatio
    const heightM = heightCm / 100
    const bmi = weightKg / (heightM * heightM)
    if (Number.isFinite(bmi)) {
      footSizeCm += (bmi - 22) * 0.08
    }
    footSizeCm = Math.round(footSizeCm * 10) / 10
  }

  const stepLengthMeters = (footSizeCm * 2.8) / 100

  return {
    footSizeCm: Math.round(footSizeCm * 10) / 10,
    stepLengthMeters: Math.round(stepLengthMeters * 1000) / 1000,
    isEstimated
  }
}

/**
 * Calculates supposed steps given distance in km.
 */
export function stepsFromDistance(distanceKm, state) {
  if (!distanceKm || Number(distanceKm) <= 0) return 0
  const { stepLengthMeters } = getFootSizeAndStride(state)
  const distanceMeters = Number(distanceKm) * 1000
  return Math.round(distanceMeters / (stepLengthMeters || 0.72))
}

const MET_TABLE = {
  walking: { light: 2.8, moderate: 3.8, vigorous: 5.0 },
  cycling: { light: 4.0, moderate: 6.8, vigorous: 10.0 },
  climbing: { light: 5.0, moderate: 7.5, vigorous: 11.0 },
  hiking: { light: 4.0, moderate: 6.0, vigorous: 8.5 },
  running: { light: 7.0, moderate: 9.8, vigorous: 12.5 },
  gym: { light: 3.5, moderate: 5.5, vigorous: 7.5 },
  strength: { light: 3.5, moderate: 5.5, vigorous: 7.5 },
}

export function estimateCaloriesBurned(activityType = 'walking', durationMinutes = 30, intensity = 'moderate', weightKg = 75) {
  const typeKey = String(activityType).toLowerCase()
  const table = MET_TABLE[typeKey] || MET_TABLE.walking
  let level = 'moderate'
  if (typeof intensity === 'number') {
    if (intensity <= 3) level = 'light'
    else if (intensity >= 7) level = 'vigorous'
    else level = 'moderate'
  } else if (typeof intensity === 'string') {
    const s = intensity.toLowerCase()
    if (s.includes('light') || s.includes('leve') || s.includes('baja')) level = 'light'
    else if (s.includes('vig') || s.includes('alta') || s.includes('hard') || s.includes('intense')) level = 'vigorous'
    else level = 'moderate'
  }
  const met = table[level] || 5.0
  const hours = Math.max(0, Number(durationMinutes) || 0) / 60
  const w = Math.max(30, Number(weightKg) || 75)
  return Math.round(met * w * hours)
}

/**
 * Calculates total calories consumed in a period from Nutrition logs.
 */
export function getConsumedCalories(state, dateList) {
  let total = 0
  const logs = state?.nutrition?.logs || {}
  for (const d of dateList) {
    if (logs[d]?.items) {
      total += nutritionTotals(logs[d].items).calories || 0
    }
  }
  return Math.round(total)
}

/**
 * Calculates total calories burned in a period from workouts & activities.
 */
export function getBurnedCalories(state, dateList) {
  let total = 0
  const weightKg = Number(state?.weightKg) > 0 ? Number(state.weightKg) : 75
  const dates = new Set(dateList)
  for (const w of state?.workouts || []) {
    if (dates.has(w.d)) {
      if (w.activity?.calories > 0) {
        total += Number(w.activity.calories)
      } else {
        const dur = (w.end && w.start) ? (w.end - w.start) / 60000 : (w.activity?.minutes || 30)
        total += estimateCaloriesBurned(w.activity?.type || 'gym', dur, w.activity?.intensity || 'moderate', weightKg)
      }
    }
  }
  return Math.round(total)
}

/**
 * Calculates total steps completed in a period (Walk + Climbing).
 */
export function getCompletedSteps(state, dateList) {
  let total = 0
  const dates = new Set(dateList)
  for (const w of state?.workouts || []) {
    if (dates.has(w.d)) {
      const type = w.activity?.type
      if (type === 'walking' || type === 'hiking' || type === 'climbing' || type === 'running') {
        if (w.activity?.steps > 0) {
          total += Number(w.activity.steps)
        } else if (w.activity?.distanceKm > 0) {
          total += stepsFromDistance(w.activity.distanceKm, state)
        }
      }
    }
  }
  return Math.round(total)
}

/**
 * Reconciles and resets muscle goals counts on period rollover.
 */
export function reconcileMuscleGoals(state, date = new Date()) {
  if (!state?.muscleGoals) {
    return false
  }

  const currentKey = getCurrentPeriodKey(state.muscleGoals.period || 'weekly', date)
  if (state.muscleGoals.lastResetPeriod !== currentKey) {
    state.muscleGoals.lastResetPeriod = currentKey
    state.muscleGoals.counts = Object.fromEntries(
      Object.keys(state.muscleGoals.goals || {}).map(k => [k, 0])
    )
    return true
  }
  return false
}

export const DEFAULT_MUSCLE_GROUPS = [
  { id: 'biceps', label: 'Biceps' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'legs', label: 'Legs' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'abs', label: 'Abs / Core' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'calves', label: 'Calves' }
]

export function getMuscleLabel(muscleId) {
  const def = DEFAULT_MUSCLE_GROUPS.find(g => g.id === muscleId)
  if (def) return def.label
  return muscleId ? muscleId.charAt(0).toUpperCase() + muscleId.slice(1) : ''
}

export function getTodayMuscleGroups(state, date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday, 1 = Monday, etc.
  return state?.muscleWeek?.[day] || []
}

export function setDayMuscleGroups(state, day, muscleIds) {
  state.muscleWeek ||= {}
  state.muscleWeek[day] = Array.isArray(muscleIds) ? muscleIds : []
}
