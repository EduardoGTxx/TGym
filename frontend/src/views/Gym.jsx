import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t, dateLocale, exerciseNameFor } from '../lib/i18n.js'
import { exOr } from '../lib/exercises.js'
import { startFlow, workoutRemindersSheet, workoutDetailSheet, exerciseDetailSheet } from '../sheets.jsx'
import { Button } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { loggedWorkouts } from '../lib/daily-plan.js'
import './Gym.css'

function formatMonthHeader(dateStr) {
  const d = new Date(dateStr + (dateStr.length === 7 ? '-01T12:00:00' : 'T12:00:00'))
  if (isNaN(d.getTime())) return dateStr
  const str = d.toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' })
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Sample items matching Dribbble reference when user has not yet logged gym entries
const SAMPLE_MONTHS = [
  {
    month: new Date().toISOString().slice(0, 7),
    items: [
      { name: 'Incline Inner-Biceps Curl', doneReps: 12, targetReps: 36, pct: 33, colorIdx: 0, exId: '0025' },
      { name: 'Regular-Grip Barbell Curl', doneReps: 8, targetReps: 24, pct: 33, colorIdx: 1, exId: '0030' },
      { name: 'Goblet Squat', doneReps: 32, targetReps: 48, pct: 67, colorIdx: 2, exId: '0040' },
    ]
  },
  {
    month: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 7),
    items: [
      { name: 'Deadlifts', doneReps: 10, targetReps: 62, pct: 16, colorIdx: 3, exId: '0050' },
    ]
  }
]

export default function Gym() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const history = loggedWorkouts(S)
  const activeWorkout = S.active

  const currentMonthTitle = formatMonthHeader(new Date().toISOString().slice(0, 7))

  // Build grouped exercise cards from real history if available
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
          const ex = exOr(entry.id)
          const name = exerciseNameFor(ex, { entry, routineId: w.routineId })
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

  const displayGroups = monthGroups.length > 0 ? monthGroups : SAMPLE_MONTHS

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
        </div>
      )}

      {displayGroups.map(group => (
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
                  } else {
                    startFlow()
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
      ))}
    </div>
  )
}
