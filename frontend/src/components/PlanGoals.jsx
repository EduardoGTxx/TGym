import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button, Segmented, NumberField } from './ui.jsx'
import { DEFAULT_MUSCLE_GROUPS, getCurrentPeriodKey } from '../lib/activity-engine.js'
import './PlanGoals.css'


function CustomDropdown({ value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <div className={`custom-dropdown-wrap ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="custom-dropdown-field"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className={selected ? 'selected-text' : 'placeholder-text'}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} />
      </button>

      {open && (
        <div className="custom-dropdown-options" role="listbox">
          {options.map(opt => {
            const isSel = opt.value === value
            return (
              <button
                type="button"
                key={opt.value}
                className={`custom-dropdown-option ${isSel ? 'active' : ''}`}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                role="option"
                aria-selected={isSel}
              >
                <span className="opt-label">{opt.label}</span>
                {isSel && <Icon name="check" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function MuscleGoalsManager() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)

  const muscleGoals = S.muscleGoals?.goals || {}
  const period = S.muscleGoals?.period || 'weekly'
  const [selectedToAdd, setSelectedToAdd] = useState('')
  const [customName, setCustomName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const entries = Object.entries(muscleGoals)
  const availableGroups = DEFAULT_MUSCLE_GROUPS.filter(g => !(g.id in muscleGoals))

  const setPeriod = newPeriod => {
    update(s => {
      s.muscleGoals ||= { period: 'weekly', lastResetPeriod: '', goals: {}, counts: {} }
      s.muscleGoals.period = newPeriod
      s.muscleGoals.lastResetPeriod = getCurrentPeriodKey(newPeriod)
    })
    useStore.getState().flushPersistence()
  }

  const addMuscleGroup = (id, target = 10) => {
    if (!id) return
    update(s => {
      s.muscleGoals ||= { period: 'weekly', lastResetPeriod: '', goals: {}, counts: {} }
      s.muscleGoals.goals ||= {}
      s.muscleGoals.counts ||= {}
      s.muscleGoals.goals[id] = target
      if (!(id in s.muscleGoals.counts)) {
        s.muscleGoals.counts[id] = 0
      }
    })
    useStore.getState().flushPersistence()
    setSelectedToAdd('')
    setCustomName('')
    setIsAdding(false)
  }

  const removeMuscleGroup = id => {
    update(s => {
      if (s.muscleGoals?.goals) {
        delete s.muscleGoals.goals[id]
      }
      if (s.muscleGoals?.counts) {
        delete s.muscleGoals.counts[id]
      }
    })
    useStore.getState().flushPersistence()
  }

  const changeTarget = (id, target) => {
    update(s => {
      s.muscleGoals ||= { period: 'weekly', lastResetPeriod: '', goals: {}, counts: {} }
      s.muscleGoals.goals ||= {}
      s.muscleGoals.goals[id] = Math.max(1, Math.round(target || 1))
    })
    useStore.getState().flushPersistence()
  }

  return (
    <div className="card plan-goals-card">
      <div className="row between" style={{ marginBottom: 12 }}>
        <div>
          <h3 className="plan-goals-title">{t('Muscle Group Goals')}</h3>
          <span className="dim small">
            {period === 'weekly' ? t('Target exercises per week') : t('Target exercises per month')}
          </span>
        </div>
        <Segmented
          className="seg-range"
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'weekly', label: t('Weekly') },
            { value: 'monthly', label: t('Monthly') }
          ]}
        />
      </div>

      {entries.length > 0 ? (
        <div className="plan-goals-list">
          {entries.map(([id, target]) => {
            const def = DEFAULT_MUSCLE_GROUPS.find(g => g.id === id)
            const label = def ? t(def.label) : id.charAt(0).toUpperCase() + id.slice(1)
            return (
              <div key={id} className="plan-goal-row">
                <div className="plan-goal-info">
                  <span className="plan-goal-badge">
                    <Icon name="dumbbell" />
                  </span>
                  <span className="plan-goal-name">{label}</span>
                </div>

                <div className="plan-goal-controls">
                  <button
                    type="button"
                    className="plan-goal-step-btn"
                    onClick={() => changeTarget(id, Number(target) - 1)}
                    disabled={Number(target) <= 1}
                    aria-label={t('Decrease goal')}
                  >
                    -
                  </button>
                  <span className="plan-goal-target-val">
                    <b>{target}</b> <small>{t('ex')}</small>
                  </span>
                  <button
                    type="button"
                    className="plan-goal-step-btn"
                    onClick={() => changeTarget(id, Number(target) + 1)}
                    aria-label={t('Increase goal')}
                  >
                    +
                  </button>

                  <button
                    type="button"
                    className="iconbtn"
                    style={{ color: 'var(--red)', width: 32, height: 32, marginLeft: 6 }}
                    onClick={() => removeMuscleGroup(id)}
                    aria-label={t('Remove {0}', label)}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="plan-goals-empty">
          <p>{t('No muscle group goals set yet.')}</p>
          <span className="dim small">{t('Set targets for biceps, chest, back, and more.')}</span>
        </div>
      )}

      {isAdding ? (
        <div className="plan-add-muscle-box">
          <label className="field-label">{t('Choose muscle group')}</label>
          <CustomDropdown
            value={selectedToAdd}
            onChange={setSelectedToAdd}
            placeholder={t('Select a muscle group…')}
            options={[
              ...availableGroups.map(g => ({ value: g.id, label: t(g.label) })),
              { value: '__custom__', label: t('Custom muscle…') }
            ]}
          />

          {selectedToAdd === '__custom__' && (
            <input
              className="input"
              style={{ marginTop: 8 }}
              placeholder={t('Enter muscle name…')}
              value={customName}
              onChange={e => setCustomName(e.target.value)}
            />
          )}

          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <Button
              size="sm"
              variant="primary"
              disabled={!selectedToAdd || (selectedToAdd === '__custom__' && !customName.trim())}
              onClick={() => {
                const finalId = selectedToAdd === '__custom__' ? customName.trim().toLowerCase() : selectedToAdd
                addMuscleGroup(finalId, 10)
              }}
            >
              {t('Add goal')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
              {t('Cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <Button
            size="sm"
            variant="tinted"
            icon="plus"
            onClick={() => setIsAdding(true)}
          >
            {t('Add muscle group')}
          </Button>
        </div>
      )}
    </div>
  )
}

export function StepGoalManager() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)

  const stepGoal = S.stepGoal || { enabled: false, period: 'daily', target: 10000 }
  const [enabled, setEnabled] = useState(Boolean(stepGoal.enabled))
  const [period, setPeriod] = useState(stepGoal.period || 'daily')
  const [target, setTarget] = useState(Number(stepGoal.target) || 10000)

  const save = (newEnabled, newPeriod, newTarget) => {
    setEnabled(newEnabled)
    setPeriod(newPeriod)
    setTarget(newTarget)
    update(s => {
      s.stepGoal = {
        enabled: newEnabled,
        period: newPeriod,
        target: Math.max(500, Math.round(newTarget || 10000))
      }
    })
    useStore.getState().flushPersistence()
  }

  return (
    <div className="card plan-goals-card" style={{ marginTop: 16 }}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <div>
          <h3 className="plan-goals-title">{t('Step Goal')}</h3>
          <span className="dim small">{t('Optional steps target for Walk & Climbing')}</span>
        </div>
        <button
          type="button"
          className={`plan-toggle-btn ${enabled ? 'active' : ''}`}
          onClick={() => save(!enabled, period, target)}
          aria-label={t('Toggle step goal')}
        >
          {enabled ? t('Enabled') : t('Disabled')}
        </button>
      </div>

      {enabled && (
        <div className="plan-step-goal-body">
          <label className="field-label">{t('Period')}</label>
          <Segmented
            className="seg-range"
            value={period}
            onChange={p => save(true, p, target)}
            options={[
              { value: 'daily', label: t('Daily') },
              { value: 'weekly', label: t('Weekly') },
              { value: 'monthly', label: t('Monthly') }
            ]}
          />

          <div style={{ marginTop: 12 }}>
            <label className="field-label">{t('Target steps')}</label>
            <NumberField
              value={target}
              onChange={v => save(true, period, v)}
              aria-label={t('Target steps')}
              step={500}
            />
          </div>
        </div>
      )}
    </div>
  )
}
