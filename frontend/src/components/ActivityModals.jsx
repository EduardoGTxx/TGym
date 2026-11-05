import { useState, useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, dateLocale } from '../lib/i18n.js'
import { todayISO, uid } from '../lib/format.js'
import { Button, NumberField, TextField, Segmented } from './ui.jsx'
import Icon from './Icon.jsx'
import {
  getFootSizeAndStride,
  stepsFromDistance,
  estimateCaloriesBurned,
  DEFAULT_MUSCLE_GROUPS,
  getLatestWeightKg
} from '../lib/activity-engine.js'
import './ActivityModals.css'

/* ==========================================================================
   WALK MODAL
   Allows logging steps manually OR via distance (calculating steps using
   real or estimated foot size). Includes intensity and calories burned.
   ========================================================================== */
export function WalkModal({ close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [inputMode, setInputMode] = useState('distance') // 'steps' | 'distance'
  const [period, setPeriod] = useState('day') // 'day' | 'week' | 'month'
  const [steps, setSteps] = useState(5000)
  const [distanceKm, setDistanceKm] = useState(3.5)
  const [durationMin, setDurationMin] = useState(45)
  const [intensity, setIntensity] = useState('moderate') // 'light' | 'moderate' | 'vigorous'

  const footInfo = useMemo(() => getFootSizeAndStride(S), [S])
  const calculatedSteps = useMemo(() => stepsFromDistance(distanceKm, S), [distanceKm, S])
  const effectiveSteps = inputMode === 'distance' ? calculatedSteps : (Number(steps) || 0)

  const weightKg = getLatestWeightKg(S)
  const caloriesBurned = useMemo(
    () => estimateCaloriesBurned('walking', durationMin, intensity, weightKg),
    [durationMin, intensity, weightKg]
  )

  const save = async () => {
    update(s => {
      s.workouts ||= []
      const workout = {
        id: uid(),
        d: todayISO(),
        name: t('Walk'),
        start: Date.now() - durationMin * 60000,
        end: Date.now(),
        kind: 'activity',
        activity: {
          type: 'walking',
          period,
          steps: effectiveSteps,
          distanceKm: inputMode === 'distance' ? Number(distanceKm) : (effectiveSteps * footInfo.stepLengthMeters / 1000),
          minutes: Number(durationMin),
          intensity,
          calories: caloriesBurned,
          source: 'manual'
        }
      }
      s.workouts.push(workout)
    })
    await useStore.getState().flushPersistence()
    useUI.getState().toast(t('Walk activity saved ({0} steps)', effectiveSteps))
    close()
  }

  return (
    <div className="activity-custom-modal">
      <div className="activity-modal-header">
        <span className="activity-modal-badge badge-walk">
          <Icon name="figureWalk" />
        </span>
        <div>
          <h3>{t('Walk')}</h3>
          <div className="dim small">{t('Log steps and distance')}</div>
        </div>
      </div>

      <label className="field-label">{t('Period')}</label>
      <Segmented
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'day', label: t('Day') },
          { value: 'week', label: t('Week') },
          { value: 'month', label: t('Month') }
        ]}
      />

      <label className="field-label" style={{ marginTop: 14 }}>{t('Input method')}</label>
      <Segmented
        value={inputMode}
        onChange={setInputMode}
        options={[
          { value: 'distance', label: t('Distance (km)') },
          { value: 'steps', label: t('Manual steps') }
        ]}
      />

      {inputMode === 'distance' ? (
        <div className="activity-calc-card">
          <label className="field-label">{t('Distance (km)')}</label>
          <NumberField
            value={distanceKm}
            onChange={v => setDistanceKm(Math.max(0, v || 0))}
            aria-label={t('Distance (km)')}
            precision={2}
            step={0.1}
          />
          <div className="activity-foot-note">
            <Icon name="info" />
            <span>
              {footInfo.isEstimated
                ? t('Foot size estimated ({0} cm) via height & weight: ~{1} m/step', footInfo.footSizeCm, footInfo.stepLengthMeters)
                : t('Measured foot size ({0} cm): ~{1} m/step', footInfo.footSizeCm, footInfo.stepLengthMeters)}
            </span>
          </div>
          <div className="activity-result-pill">
            <span className="dim small">{t('Calculated steps')}</span>
            <b>{calculatedSteps.toLocaleString(dateLocale())} {t('steps')}</b>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <label className="field-label">{t('Steps')}</label>
          <NumberField
            value={steps}
            onChange={v => setSteps(Math.max(0, Math.round(v || 0)))}
            aria-label={t('Steps')}
            step={100}
          />
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <label className="field-label">{t('Duration (min)')}</label>
        <NumberField
          value={durationMin}
          onChange={v => setDurationMin(Math.max(1, Math.round(v || 1)))}
          aria-label={t('Duration (min)')}
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <label className="field-label">{t('Intensity')}</label>
        <Segmented
          options={[
            { value: 'light', label: t('Light') },
            { value: 'moderate', label: t('Moderate') },
            { value: 'vigorous', label: t('Vigorous') }
          ]}
          value={intensity}
          onChange={setIntensity}
        />
      </div>

      <div className="activity-calories-banner">
        <span>{t('Estimated calories burned')}:</span>
        <b>{caloriesBurned} kcal</b>
      </div>

      <div style={{ height: 16 }} />
      <Button variant="primary" style={{ width: '100%' }} onClick={save}>
        {t('Save walk')}
      </Button>
    </div>
  )
}

/* ==========================================================================
   CLIMBING MODAL
   Logs site/location climbed, distance, duration, speed, and intensity.
   Automatically converts distance to equivalent steps and adds them to Walk!
   ========================================================================== */
export function ClimbingModal({ close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [site, setSite] = useState('')
  const [distanceMeters, setDistanceMeters] = useState(800)
  const [durationMin, setDurationMin] = useState(60)
  const [intensity, setIntensity] = useState('moderate')

  const footInfo = useMemo(() => getFootSizeAndStride(S), [S])
  const distanceKm = (Number(distanceMeters) || 0) / 1000
  const speedKmh = useMemo(() => {
    const hours = (Number(durationMin) || 0) / 60
    if (hours <= 0 || distanceKm <= 0) return 0
    return Math.round((distanceKm / hours) * 10) / 10
  }, [distanceKm, durationMin])

  const calculatedSteps = useMemo(() => stepsFromDistance(distanceKm, S), [distanceKm, S])
  const weightKg = getLatestWeightKg(S)
  const caloriesBurned = useMemo(
    () => estimateCaloriesBurned('climbing', durationMin, intensity, weightKg),
    [durationMin, intensity, weightKg]
  )

  const save = async () => {
    update(s => {
      s.workouts ||= []
      const workout = {
        id: uid(),
        d: todayISO(),
        name: site ? t('Climbing: {0}', site) : t('Climbing'),
        start: Date.now() - durationMin * 60000,
        end: Date.now(),
        kind: 'activity',
        activity: {
          type: 'climbing',
          site: site.trim() || t('Climbing site'),
          distanceMeters: Number(distanceMeters),
          distanceKm,
          minutes: Number(durationMin),
          speedKmh,
          steps: calculatedSteps, // Equivalent steps added to walk tracking!
          intensity,
          calories: caloriesBurned,
          source: 'manual'
        }
      }
      s.workouts.push(workout)
    })
    await useStore.getState().flushPersistence()
    useUI.getState().toast(t('Climbing saved (+{0} steps added to Walk)', calculatedSteps))
    close()
  }

  return (
    <div className="activity-custom-modal">
      <div className="activity-modal-header">
        <span className="activity-modal-badge badge-climbing">
          <Icon name="mountain" />
        </span>
        <div>
          <h3>{t('Climbing')}</h3>
          <div className="dim small">{t('Log route, height/distance and speed')}</div>
        </div>
      </div>

      <label className="field-label">{t('Location / Site climbed')}</label>
      <input
        className="input"
        placeholder={t('e.g. North wall, Climbing gym, El Capitan…')}
        value={site}
        onChange={e => setSite(e.target.value)}
      />

      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        <div style={{ flex: 1 }}>
          <label className="field-label">{t('Distance (m)')}</label>
          <NumberField
            value={distanceMeters}
            onChange={v => setDistanceMeters(Math.max(0, Math.round(v || 0)))}
            aria-label={t('Distance (m)')}
            step={50}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="field-label">{t('Duration (min)')}</label>
          <NumberField
            value={durationMin}
            onChange={v => setDurationMin(Math.max(1, Math.round(v || 1)))}
            aria-label={t('Duration (min)')}
          />
        </div>
      </div>

      <div className="activity-metrics-grid">
        <div className="activity-metric-box">
          <small>{t('Average speed')}</small>
          <b>{speedKmh} km/h</b>
        </div>
        <div className="activity-metric-box">
          <small>{t('Added to Walk')}</small>
          <b>+{calculatedSteps} {t('steps')}</b>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <label className="field-label">{t('Intensity')}</label>
        <Segmented
          options={[
            { value: 'light', label: t('Light') },
            { value: 'moderate', label: t('Moderate') },
            { value: 'vigorous', label: t('Vigorous') }
          ]}
          value={intensity}
          onChange={setIntensity}
        />
      </div>

      <div className="activity-calories-banner">
        <span>{t('Estimated calories burned')}:</span>
        <b>{caloriesBurned} kcal</b>
      </div>

      <div style={{ height: 16 }} />
      <Button variant="primary" style={{ width: '100%' }} onClick={save}>
        {t('Save climbing')}
      </Button>
    </div>
  )
}

/* ==========================================================================
   CYCLING MODAL
   Logs distance and time, live computes average speed, logs intensity & calories.
   ========================================================================== */
export function CyclingModal({ close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [distanceKm, setDistanceKm] = useState(15.0)
  const [durationMin, setDurationMin] = useState(45)
  const [intensity, setIntensity] = useState('moderate')

  const speedKmh = useMemo(() => {
    const hours = (Number(durationMin) || 0) / 60
    const d = Number(distanceKm) || 0
    if (hours <= 0 || d <= 0) return 0
    return Math.round((d / hours) * 10) / 10
  }, [distanceKm, durationMin])

  const weightKg = getLatestWeightKg(S)
  const caloriesBurned = useMemo(
    () => estimateCaloriesBurned('cycling', durationMin, intensity, weightKg),
    [durationMin, intensity, weightKg]
  )

  const save = async () => {
    update(s => {
      s.workouts ||= []
      const workout = {
        id: uid(),
        d: todayISO(),
        name: t('Cycling'),
        start: Date.now() - durationMin * 60000,
        end: Date.now(),
        kind: 'activity',
        activity: {
          type: 'cycling',
          distanceKm: Number(distanceKm),
          minutes: Number(durationMin),
          speedKmh,
          intensity,
          calories: caloriesBurned,
          source: 'manual'
        }
      }
      s.workouts.push(workout)
    })
    await useStore.getState().flushPersistence()
    useUI.getState().toast(t('Cycling saved ({0} km · {1} km/h)', distanceKm, speedKmh))
    close()
  }

  return (
    <div className="activity-custom-modal">
      <div className="activity-modal-header">
        <span className="activity-modal-badge badge-cycling">
          <Icon name="bicycle" />
        </span>
        <div>
          <h3>{t('Cycling')}</h3>
          <div className="dim small">{t('Track distance, time and average speed')}</div>
        </div>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label className="field-label">{t('Distance (km)')}</label>
          <NumberField
            value={distanceKm}
            onChange={v => setDistanceKm(Math.max(0, v || 0))}
            aria-label={t('Distance (km)')}
            precision={2}
            step={0.5}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="field-label">{t('Duration (min)')}</label>
          <NumberField
            value={durationMin}
            onChange={v => setDurationMin(Math.max(1, Math.round(v || 1)))}
            aria-label={t('Duration (min)')}
          />
        </div>
      </div>

      <div className="activity-speed-hero">
        <span className="dim small">{t('Average speed')}</span>
        <b>{speedKmh} <small>km/h</small></b>
      </div>

      <div style={{ marginTop: 14 }}>
        <label className="field-label">{t('Intensity')}</label>
        <Segmented
          options={[
            { value: 'light', label: t('Light') },
            { value: 'moderate', label: t('Moderate') },
            { value: 'vigorous', label: t('Vigorous') }
          ]}
          value={intensity}
          onChange={setIntensity}
        />
      </div>

      <div className="activity-calories-banner">
        <span>{t('Estimated calories burned')}:</span>
        <b>{caloriesBurned} kcal</b>
      </div>

      <div style={{ height: 16 }} />
      <Button variant="primary" style={{ width: '100%' }} onClick={save}>
        {t('Save cycling')}
      </Button>
    </div>
  )
}

/* ==========================================================================
   START WORKOUT / MUSCLE LOGGING MODAL
   Opens defined muscle groups, lets user log exercises, sets, reps, and
   increments that muscle group count in Gym!
   ========================================================================== */
export function MuscleWorkoutModal({ close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const muscleGoals = S.muscleGoals?.goals || {}
  const activeMuscleKeys = Object.keys(muscleGoals).length > 0
    ? Object.keys(muscleGoals)
    : DEFAULT_MUSCLE_GROUPS.map(m => m.id)

  const [selectedMuscle, setSelectedMuscle] = useState(activeMuscleKeys[0] || 'chest')
  const [exerciseName, setExerciseName] = useState('')
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(10)
  const [weight, setWeight] = useState(20)
  const [intensity, setIntensity] = useState('moderate')

  const caloriesBurned = useMemo(() => {
    return estimateCaloriesBurned('gym', sets * 4, intensity, getLatestWeightKg(S))
  }, [sets, intensity, S])

  const save = async () => {
    const finalName = exerciseName.trim() || t('{0} exercise', selectedMuscle)
    update(s => {
      s.workouts ||= []
      s.muscleGoals ||= { period: 'weekly', lastResetPeriod: '', goals: {}, counts: {} }
      s.muscleGoals.counts ||= {}
      // Increment completed count for this muscle group
      s.muscleGoals.counts[selectedMuscle] = (s.muscleGoals.counts[selectedMuscle] || 0) + 1

      // Log workout entry
      const workout = {
        id: uid(),
        d: todayISO(),
        name: finalName,
        start: Date.now() - sets * 4 * 60000,
        end: Date.now(),
        unit: s.unit || 'kg',
        vol: sets * reps * weight,
        activity: {
          type: 'gym',
          minutes: sets * 4,
          intensity,
          calories: caloriesBurned,
          source: 'manual'
        },
        entries: [
          {
            id: uid(),
            n: finalName,
            muscleGroup: selectedMuscle,
            sets: Array.from({ length: sets }, () => ({
              done: true,
              w: Number(weight),
              r: Number(reps)
            }))
          }
        ]
      }
      s.workouts.push(workout)
    })
    await useStore.getState().flushPersistence()
    useUI.getState().toast(t('Exercise logged! +1 to {0}', selectedMuscle))
    close()
  }

  return (
    <div className="activity-custom-modal">
      <div className="activity-modal-header">
        <span className="activity-modal-badge badge-gym">
          <Icon name="dumbbell" />
        </span>
        <div>
          <h3>{t('Log Workout by Muscle')}</h3>
          <div className="dim small">{t('Affects Gym goals and updates PRs')}</div>
        </div>
      </div>

      <label className="field-label">{t('Target muscle group')}</label>
      <div className="muscle-chips-grid">
        {activeMuscleKeys.map(key => {
          const group = DEFAULT_MUSCLE_GROUPS.find(g => g.id === key) || { label: key }
          return (
            <button
              type="button"
              key={key}
              className={`muscle-chip ${selectedMuscle === key ? 'active' : ''}`}
              onClick={() => setSelectedMuscle(key)}
            >
              {t(group.label)}
            </button>
          )
        })}
      </div>

      <label className="field-label" style={{ marginTop: 14 }}>{t('Exercise name')}</label>
      <input
        className="input"
        placeholder={t('e.g. Bench press, Biceps curl, Squats…')}
        value={exerciseName}
        onChange={e => setExerciseName(e.target.value)}
      />

      <div className="row" style={{ gap: 8, marginTop: 14 }}>
        <div style={{ flex: 1 }}>
          <label className="field-label">{t('Sets')}</label>
          <NumberField
            value={sets}
            onChange={v => setSets(Math.max(1, Math.round(v || 1)))}
            aria-label={t('Sets')}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="field-label">{t('Reps')}</label>
          <NumberField
            value={reps}
            onChange={v => setReps(Math.max(1, Math.round(v || 1)))}
            aria-label={t('Reps')}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="field-label">{t('Weight')} ({S.unit || 'kg'})</label>
          <NumberField
            value={weight}
            onChange={v => setWeight(Math.max(0, v || 0))}
            aria-label={t('Weight')}
            step={2.5}
          />
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <label className="field-label">{t('Intensity')}</label>
        <Segmented
          options={[
            { value: 'light', label: t('Light') },
            { value: 'moderate', label: t('Moderate') },
            { value: 'vigorous', label: t('Vigorous') }
          ]}
          value={intensity}
          onChange={setIntensity}
        />
      </div>

      <div className="activity-calories-banner">
        <span>{t('Estimated calories burned')}:</span>
        <b>{caloriesBurned} kcal</b>
      </div>

      <div style={{ height: 18 }} />
      <Button variant="primary" style={{ width: '100%' }} onClick={save}>
        {t('Log exercise')}
      </Button>
    </div>
  )
}
