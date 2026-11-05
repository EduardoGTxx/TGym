import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { DAYN } from '../lib/format.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'
import { DEFAULT_MUSCLE_GROUPS, setDayMuscleGroups, getMuscleLabel } from '../lib/activity-engine.js'
import './DayMuscleScheduleModal.css'

export default function DayMuscleScheduleModal({ day, close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)

  const currentMuscles = S.muscleWeek?.[day] || []
  const [selected, setSelected] = useState(new Set(currentMuscles))

  // Combine default muscle groups with any custom ones defined in muscleGoals
  const allGroups = [...DEFAULT_MUSCLE_GROUPS]
  const customKeys = Object.keys(S.muscleGoals?.goals || {}).filter(
    k => !DEFAULT_MUSCLE_GROUPS.some(g => g.id === k)
  )
  customKeys.forEach(k => {
    allGroups.push({ id: k, label: k.charAt(0).toUpperCase() + k.slice(1) })
  })

  const toggle = id => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const setRest = () => {
    setSelected(new Set())
  }

  const save = async () => {
    const list = Array.from(selected)
    update(s => {
      setDayMuscleGroups(s, day, list)
    })
    await useStore.getState().flushPersistence()
    close()
  }

  const dayName = t(DAYN[day])

  return (
    <div className="day-muscle-modal">
      <div className="day-muscle-header">
        <div className="day-muscle-title-box">
          <span className="day-muscle-badge">
            <Icon name="calendar" />
          </span>
          <div>
            <h3>{t('Schedule for {0}', dayName)}</h3>
            <div className="dim small">
              {t('Select the muscle groups to train on {0}', dayName)}
            </div>
          </div>
        </div>
      </div>

      <div className="day-muscle-chips-section">
        <label className="field-label">{t('Muscle groups')}</label>
        <div className="day-muscle-chips">
          {allGroups.map(group => {
            const isSelected = selected.has(group.id)
            return (
              <button
                type="button"
                key={group.id}
                className={`day-muscle-chip ${isSelected ? 'active' : ''}`}
                onClick={() => toggle(group.id)}
                aria-pressed={isSelected}
              >
                <Icon name={isSelected ? 'check' : 'dumbbell'} />
                <span>{t(group.label)}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="day-muscle-status-summary">
        {selected.size > 0 ? (
          <div className="day-muscle-summary-text">
            <span className="dim small">{t('Scheduled')}:</span>
            <b>{Array.from(selected).map(id => t(getMuscleLabel(id))).join(' · ')}</b>
          </div>
        ) : (
          <div className="day-muscle-summary-rest">
            <Icon name="moon" />
            <span>{t('Rest day (no muscle groups scheduled)')}</span>
          </div>
        )}
      </div>

      <div className="row" style={{ gap: 10, marginTop: 16 }}>
        <Button
          size="sm"
          variant="tinted"
          onClick={setRest}
          disabled={selected.size === 0}
        >
          {t('Set as rest day')}
        </Button>
        <Button
          size="sm"
          variant="primary"
          style={{ flex: 1 }}
          onClick={save}
        >
          {t('Save day schedule')}
        </Button>
      </div>
    </div>
  )
}
