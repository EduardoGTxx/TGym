import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t, dateLocale, exerciseNameFor } from '../lib/i18n.js'
import { exOr } from '../lib/exercises.js'
import { startFlow, workoutRemindersSheet, workoutDetailSheet, exerciseDetailSheet, muscleWorkoutSheet } from '../sheets.jsx'
import { Button } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { loggedWorkouts } from '../lib/daily-plan.js'
import { reconcileMuscleGoals, DEFAULT_MUSCLE_GROUPS } from '../lib/activity-engine.js'
import './Gym.css'

function formatMonthHeader(dateStr) {
  const d = new Date(dateStr + (dateStr.length === 7 ? '-01T12:00:00' : 'T12:00:00'))
  if (isNaN(d.getTime())) return dateStr
  const str = d.toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' })
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export default function Gym() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const history = loggedWorkouts(S)
  const activeWorkout = S.active

  // Reconcile weekly/monthly muscle goal rollover on load
  useEffect(() => {
    let rolledOver = false
    update(s => {
      rolledOver = reconcileMuscleGoals(s)
    })
    if (rolledOver) {
      useStore.getState().flushPersistence()
    }
  }, [update])

  const currentMonthTitle = formatMonthHeader(new Date().toISOString().slice(0, 7))

  // Muscle goals
  const muscleGoalsObj = S.muscleGoals?.goals || {}
  const muscleCountsObj = S.muscleGoals?.counts || {}
  const musclePeriod = S.muscleGoals?.period || 'weekly'
  const muscleKeys = Object.keys(muscleGoalsObj)

  const adjustCount = (muscleKey, delta) => {
    update(s => {
      s.muscleGoals ||= { period: 'weekly', lastResetPeriod: '', goals: {}, counts: {} }
      s.muscleGoals.counts ||= {}
      const cur = Number(s.muscleGoals.counts[muscleKey]) || 0
      s.muscleGoals.counts[muscleKey] = Math.max(0, cur + delta)
    })
    useStore.getState().flushPersistence()
  }

  const adjustGoal = (muscleKey, delta) => {
    update(s => {
      s.muscleGoals ||= { period: 'weekly', lastResetPeriod: '', goals: {}, counts: {} }
      s.muscleGoals.goals ||= {}
      const cur = Number(s.muscleGoals.goals[muscleKey]) || 10
      s.muscleGoals.goals[muscleKey] = Math.max(1, cur + delta)
    })
    useStore.getState().flushPersistence()
  }

  // Build grouped exercise cards from real history
  const monthGroups = []
  if (history.length > 0) {
    const byMonth = {}
    history.slice().reverse().forEach(w => {
      const m = (w.d || '').slice(0, 7) || new Date().toISOString().slice(0, 7)
      if (!byMonth[m]) byMonth[m] = []
      byMonth[m].push(w)
    })

    let colorCounter = 0
    Object.keys(byMonth).forEach(m => {
      const workoutsInMonth = byMonth[m]
      const items = []
      workoutsInMonth.forEach(w => {
        (w.entries || []).forEach(entry => {
          const ex = entry.id ? exOr(entry.id) : null
          const name = entry.n || (ex ? exerciseNameFor(ex, { entry, routineId: w.routineId }) : t('Exercise'))
          const doneReps = (entry.sets || []).filter(s => s.done).reduce((acc, s) => acc + (Number(s.r) || 0), 0)
          const targetReps = (entry.target?.reps ? entry.target.reps * (entry.target.sets || entry.sets?.length || 3) : 0) || Math.max(doneReps, 24)
          const pct = Math.min(100, Math.max(10, Math.round((doneReps / targetReps) * 100)))
          const colorIdx = colorCounter % 4
          colorCounter++
          items.push({
            name,
            doneReps,
            targetReps,
            pct,
            colorIdx,
            workout: w,
            ex
          })
        })
      })
      if (items.length > 0) {
        monthGroups.push({ month: m, items })
      }
    })
  }

  return (
    <div className="dribbble-gym-view">
      <header className="dribbble-gym-header">
        <button
          type="button"
          className="dribbble-back-btn"
          onClick={() => nav(-1)}
          aria-label={t('Back')}
        >
          <Icon name="chevronLeft" />
        </button>
        <button
          type="button"
          className="dribbble-bell-btn"
          onClick={workoutRemindersSheet}
          aria-label={t('Notifications and reminders')}
        >
          <Icon name="bell" />
          <span className="dribbble-bell-dot" />
        </button>
      </header>

      <div className="dribbble-gym-titles">
        <h1 className="dribbble-gym-title">{t('Gym')}</h1>
        <div className="dribbble-gym-subtitle">{currentMonthTitle}</div>
      </div>

      {activeWorkout ? (
        <div className="dribbble-gym-active-card" role="button" tabIndex={0} onClick={() => nav('/workout')}>
          <div>
            <span className="dribbble-gym-active-tag">{t('In progress')}</span>
            <div className="dribbble-gym-active-title">{activeWorkout.name || t('Workout')}</div>
            <div className="dribbble-gym-active-sub">
              {t('{0} exercises', activeWorkout.entries?.length || 0)}
            </div>
          </div>
          <Button variant="primary" style={{ background: '#FFFFFF', color: '#0077B6', fontWeight: 700 }} onClick={() => nav('/workout')}>
            {t('Resume')}
          </Button>
        </div>
      ) : (
        <div className="dribbble-gym-actions">
          <Button
            variant="primary"
            className="dribbble-gym-start-btn"
            icon="play"
            onClick={() => startFlow()}
          >
            {t('Start workout')}
          </Button>
          <Button
            variant="tinted"
            className="dribbble-gym-muscle-btn"
            icon="dumbbell"
            onClick={muscleWorkoutSheet}
          >
            {t('Log exercise')}
          </Button>
        </div>
      )}

      {/* Muscle Goals Section */}
      <section className="dribbble-gym-section">
        <div className="dribbble-gym-section-header">
          <h2 className="dribbble-gym-section-title">
            {t('Muscle goals')} <small>({musclePeriod === 'monthly' ? t('Monthly') : t('Weekly')})</small>
          </h2>
          <Button size="sm" variant="ghost" icon="pencil" onClick={() => nav('/plan')}>
            {t('Configure')}
          </Button>
        </div>

        {muscleKeys.length > 0 ? (
          <div className="dribbble-muscle-goals-list">
            {muscleKeys.map((key, idx) => {
              const labelDef = DEFAULT_MUSCLE_GROUPS.find(g => g.id === key)
              const name = labelDef ? t(labelDef.label) : key.charAt(0).toUpperCase() + key.slice(1)
              const count = Number(muscleCountsObj[key]) || 0
              const goal = Number(muscleGoalsObj[key]) || 1
              const pct = Math.min(100, Math.round((count / goal) * 100))
              const colorIdx = idx % 4

              return (
                <div key={key} className="dribbble-muscle-card">
                  <div className={`dribbble-gym-badge badge-${colorIdx}`}>
                    <Icon name="dumbbell" />
                  </div>
                  <div className="dribbble-muscle-card-body">
                    <div className="dribbble-muscle-header-row">
                      <span className="dribbble-muscle-name">{name}</span>
                      <span className="dribbble-muscle-stat">
                        <b>{count}</b> / {goal} {t('exercises')}
                      </span>
                    </div>

                    <div className="dribbble-gym-track">
                      <div
                        className={`dribbble-gym-fill color-${colorIdx}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="dribbble-muscle-controls">
                      <div className="dribbble-control-group">
                        <span className="dim xsmall">{t('Done')}:</span>
                        <button
                          type="button"
                          className="dribbble-step-btn"
                          onClick={() => adjustCount(key, -1)}
                          disabled={count <= 0}
                          aria-label={t('Decrease count')}
                        >
                          -
                        </button>
                        <span className="dribbble-step-val">{count}</span>
                        <button
                          type="button"
                          className="dribbble-step-btn"
                          onClick={() => adjustCount(key, 1)}
                          aria-label={t('Increase count')}
                        >
                          +
                        </button>
                      </div>

                      <div className="dribbble-control-group">
                        <span className="dim xsmall">{t('Goal')}:</span>
                        <button
                          type="button"
                          className="dribbble-step-btn"
                          onClick={() => adjustGoal(key, -1)}
                          disabled={goal <= 1}
                          aria-label={t('Decrease goal')}
                        >
                          -
                        </button>
                        <span className="dribbble-step-val">{goal}</span>
                        <button
                          type="button"
                          className="dribbble-step-btn"
                          onClick={() => adjustGoal(key, 1)}
                          aria-label={t('Increase goal')}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="dribbble-muscle-empty-card" onClick={() => nav('/plan')}>
            <Icon name="plus" />
            <div>
              <b>{t('No muscle goals configured')}</b>
              <div className="dim small">{t('Tap to set weekly or monthly targets by muscle group in Routine')}</div>
            </div>
          </div>
        )}
      </section>

      {/* Workout History Section */}
      {monthGroups.length > 0 ? (
        monthGroups.map(group => (
          <section key={group.month}>
            <h2 className="dribbble-gym-month">{formatMonthHeader(group.month)}</h2>
            <div className="dribbble-gym-list">
              {group.items.map((item, idx) => (
                <div
                  key={idx}
                  className="dribbble-gym-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (item.workout) {
                      workoutDetailSheet(item.workout)
                    } else if (item.ex) {
                      exerciseDetailSheet(item.ex)
                    }
                  }}
                >
                  <div className={`dribbble-gym-badge badge-${item.colorIdx}`}>
                    <Icon name="dumbbell" />
                  </div>
                  <div className="dribbble-gym-card-body">
                    <div className="dribbble-gym-card-title">{item.name}</div>
                    <div className="dribbble-gym-reps-row">
                      <span>{item.doneReps}{t('reps')}</span>
                      <div className="dribbble-gym-track">
                        <div
                          className={`dribbble-gym-fill color-${item.colorIdx}`}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                      <span>{item.targetReps}{t('reps')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      ) : (
        <section className="dribbble-gym-empty-section">
          <div className="dribbble-gym-empty">
            <div className="dribbble-gym-empty-icon">
              <Icon name="dumbbell" />
            </div>
            <p className="dribbble-gym-empty-title">{t('No workouts logged yet')}</p>
            <span className="dribbble-gym-empty-sub">{t('Start a workout or log an exercise above to see your monthly exercise history.')}</span>
          </div>
        </section>
      )}
    </div>
  )
}
