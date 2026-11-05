import { useState, useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { todayISO, uid } from '../lib/format.js'
import Icon from './Icon.jsx'
import { Button, NumberField, Segmented } from './ui.jsx'
import {
  DEFAULT_MUSCLE_GROUPS,
  getTodayMuscleGroups,
  getMuscleLabel,
  estimateCaloriesBurned,
  getLatestWeightKg
} from '../lib/activity-engine.js'
import './DailyMuscleWorkoutModal.css'

export default function DailyMuscleWorkoutModal({ close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const today = todayISO()

  // Get muscle groups scheduled for today, or fallback to any goals configured, or defaults
  const scheduledToday = getTodayMuscleGroups(S)
  const initialMuscles = scheduledToday.length > 0
    ? scheduledToday
    : Object.keys(S.muscleGoals?.goals || {}).slice(0, 2)

  const [activeMuscles, setActiveMuscles] = useState(
    initialMuscles.length > 0 ? initialMuscles : ['chest', 'triceps']
  )
  const [addingMuscleId, setAddingMuscleId] = useState('')

  // Draft exercises logged during this session: { id, muscleGroup, name, sets, reps, weight, intensity, calories }
  const [sessionExercises, setSessionExercises] = useState([])

  // Exercise input form state per muscle group
  const [formMuscle, setFormMuscle] = useState(activeMuscles[0] || 'chest')
  const [exerciseName, setExerciseName] = useState('')
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(10)
  const [weight, setWeight] = useState(20)
  const [intensity, setIntensity] = useState('moderate')

  // Total session stats
  const totalVolume = useMemo(() => {
    return sessionExercises.reduce((acc, ex) => acc + (ex.sets * ex.reps * ex.weight), 0)
  }, [sessionExercises])

  const totalCalories = useMemo(() => {
    return sessionExercises.reduce((acc, ex) => acc + (ex.calories || 0), 0)
  }, [sessionExercises])

  const addExercise = () => {
    const finalName = exerciseName.trim() || t('{0} exercise', t(getMuscleLabel(formMuscle)))
    const cal = estimateCaloriesBurned('gym', sets * 4, intensity, getLatestWeightKg(S))

    const newEx = {
      id: uid(),
      muscleGroup: formMuscle,
      name: finalName,
      sets: Number(sets),
      reps: Number(reps),
      weight: Number(weight),
      intensity,
      calories: cal
    }

    setSessionExercises(prev => [...prev, newEx])
    setExerciseName('')
    useUI.getState().toast(t('{0} logged!', finalName))
  }

  const removeExercise = (id) => {
    setSessionExercises(prev => prev.filter(e => e.id !== id))
  }

  const finishWorkout = async () => {
    if (sessionExercises.length === 0) {
      close()
      return
    }

    const durationMin = Math.max(20, sessionExercises.length * 10)
    const workout = {
      id: uid(),
      d: today,
      name: activeMuscles.map(m => t(getMuscleLabel(m))).join(' & ') + ' ' + t('Workout'),
      start: Date.now() - durationMin * 60000,
      end: Date.now(),
      unit: S.unit || 'kg',
      vol: totalVolume,
      activity: {
        type: 'gym',
        minutes: durationMin,
        intensity,
        calories: totalCalories,
        source: 'manual'
      },
      entries: sessionExercises.map(ex => ({
        id: ex.id,
        n: ex.name,
        muscleGroup: ex.muscleGroup,
        sets: Array.from({ length: ex.sets }, () => ({
          done: true,
          w: ex.weight,
          r: ex.reps
        }))
      }))
    }

    update(s => {
      s.workouts ||= []
      s.workouts.push(workout)
      s.muscleGoals ||= { period: 'weekly', lastResetPeriod: '', goals: {}, counts: {} }
      s.muscleGoals.counts ||= {}
      for (const ex of sessionExercises) {
        if (ex.muscleGroup) {
          s.muscleGoals.counts[ex.muscleGroup] = (Number(s.muscleGoals.counts[ex.muscleGroup]) || 0) + 1
        }
      }
    })

    await useStore.getState().flushPersistence()
    useUI.getState().toast(
      t('Daily workout completed! ({0} exercises, {1} kcal)', sessionExercises.length, totalCalories)
    )
    close()
  }

  const addMuscleGroupToDay = id => {
    if (!id || activeMuscles.includes(id)) return
    setActiveMuscles(prev => [...prev, id])
    setFormMuscle(id)
    setAddingMuscleId('')
  }

  return (
    <div className="daily-muscle-session">
      <div className="daily-session-header">
        <div className="daily-session-title-wrap">
          <span className="daily-session-badge">
            <Icon name="dumbbell" />
          </span>
          <div>
            <h3>{t("Today's Workout")}</h3>
            <div className="dim small">
              {activeMuscles.map(m => t(getMuscleLabel(m))).join(' · ')}
            </div>
          </div>
        </div>

        {/* Live stats banner */}
        <div className="daily-session-stats">
          <div className="session-stat-box">
            <span className="dim xsmall">{t('Exercises')}</span>
            <b>{sessionExercises.length}</b>
          </div>
          <div className="session-stat-box">
            <span className="dim xsmall">{t('Calories')}</span>
            <b>{totalCalories} <small>kcal</small></b>
          </div>
          <div className="session-stat-box">
            <span className="dim xsmall">{t('Volume')}</span>
            <b>{totalVolume} <small>{S.unit || 'kg'}</small></b>
          </div>
        </div>
      </div>

      {/* Target muscle tabs */}
      <div className="daily-muscle-tabs-row">
        <label className="field-label" style={{ margin: 0 }}>{t('Target muscles')}:</label>
        <div className="daily-muscle-tabs">
          {activeMuscles.map(m => (
            <button
              type="button"
              key={m}
              className={`daily-muscle-tab ${formMuscle === m ? 'active' : ''}`}
              onClick={() => setFormMuscle(m)}
            >
              <Icon name="dumbbell" />
              <span>{t(getMuscleLabel(m))}</span>
            </button>
          ))}

          {/* Quick add another muscle to today */}
          <select
            className="daily-add-muscle-select"
            value={addingMuscleId}
            onChange={e => addMuscleGroupToDay(e.target.value)}
          >
            <option value="">+ {t('Add muscle')}</option>
            {DEFAULT_MUSCLE_GROUPS.filter(g => !activeMuscles.includes(g.id)).map(g => (
              <option key={g.id} value={g.id}>{t(g.label)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Exercises logged under current muscle */}
      <div className="daily-logged-list">
        <span className="dim small" style={{ fontWeight: 600 }}>
          {t('Logged for {0}', t(getMuscleLabel(formMuscle)))}:
        </span>
        {sessionExercises.filter(e => e.muscleGroup === formMuscle).length > 0 ? (
          sessionExercises.filter(e => e.muscleGroup === formMuscle).map(e => (
            <div key={e.id} className="daily-logged-item">
              <div className="daily-logged-copy">
                <b>{e.name}</b>
                <span>{e.sets} sets × {e.reps} reps @ {e.weight} {S.unit || 'kg'} · {e.calories} kcal</span>
              </div>
              <button
                type="button"
                className="iconbtn"
                style={{ color: 'var(--red)', width: 28, height: 28 }}
                onClick={() => removeExercise(e.id, e.muscleGroup)}
                aria-label={t('Remove')}
              >
                <Icon name="xmark" />
              </button>
            </div>
          ))
        ) : (
          <div className="daily-logged-empty">
            <span>{t('No exercises logged yet for {0}. Add one below!', t(getMuscleLabel(formMuscle)))}</span>
          </div>
        )}
      </div>

      {/* Exercise input form */}
      <div className="daily-exercise-form">
        <label className="field-label">{t('Exercise name')}</label>
        <input
          className="input"
          placeholder={t('e.g. Bench press, Curls, Pull-ups…')}
          value={exerciseName}
          onChange={e => setExerciseName(e.target.value)}
        />

        <div className="row" style={{ gap: 8, marginTop: 10 }}>
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

        <div style={{ marginTop: 12 }}>
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

        <Button
          size="sm"
          variant="tinted"
          icon="plus"
          style={{ marginTop: 14, width: '100%' }}
          onClick={addExercise}
        >
          {t('Log exercise')}
        </Button>
      </div>

      {/* Big Conclude Workout Button */}
      <div className="daily-finish-section">
        <Button
          variant="primary"
          className="daily-finish-btn"
          icon="check"
          onClick={finishWorkout}
        >
          {sessionExercises.length > 0 ? t('Finish workout') : t('Close')}
        </Button>
      </div>
    </div>
  )
}
