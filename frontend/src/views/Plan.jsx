import RoutineList from '../components/RoutineList.jsx'
import ModuleSwitch from '../components/ModuleSwitch.jsx'
import { reorderRoutine, orderedRoutines } from '../lib/routine-order.js'
import { routineIds, removeRoutineAssignments } from '../lib/daily-plan.js'
import { TrainingPauseAction } from '../components/TrainingPauseCard.jsx'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { DAYN } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { dayAssignSheet, planToolsSheet, confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { useEffect, useState } from 'react'
import { glyphOf } from '../lib/glyphs.js'
import { routineMuscleSheet } from '../components/RoutineMusclePreview.jsx'
import { MuscleGoalsManager, StepGoalManager } from '../components/PlanGoals.jsx'
import { getMuscleLabel } from '../lib/activity-engine.js'

export default function Plan() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [undoVisible, setUndoVisible] = useState(false)
  useEffect(() => {
    if (!undoVisible) return
    const tm = setTimeout(() => setUndoVisible(false), 6500)
    return () => clearTimeout(tm)
  }, [undoVisible])

  const deleteAll = () => {
    const scheduled = Object.values(S.week || {}).filter(ids=>routineIds(ids).length).length
    confirmSheet({
      title: t('Delete all routines?'),
      message: t('{0} routines will be deleted. {1} scheduled days will be cleared. You can undo this during the current app session.', S.routines.length, scheduled),
      confirmText: t('Delete all'), danger: true,
      onConfirm: () => {
        sessionStorage.setItem('framegym_deleted_routines', JSON.stringify({ routines: S.routines, routineOrder: S.routineOrder, week: S.week, dayPlan: S.dayPlan }))
        sessionStorage.removeItem('framegym_deleted_single_routine')
        update(s => { s.routines = []; s.week = {}; s.dayPlan = {} })
        setUndoVisible(true)
      },
    })
  }
  const restoreAll = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('framegym_deleted_routines'))
      if (!saved?.routines) return
      update(s => { s.routines = saved.routines; s.routineOrder = saved.routineOrder || []; s.week = saved.week || {}; s.dayPlan = saved.dayPlan || {} })
      sessionStorage.removeItem('framegym_deleted_routines'); setUndoVisible(false)
    } catch { sessionStorage.removeItem('framegym_deleted_routines'); setUndoVisible(false) }
  }
  const deleteOne = r => {
    sessionStorage.removeItem('framegym_deleted_routines')
    sessionStorage.setItem('framegym_deleted_single_routine', JSON.stringify({ routine: r, position: orderedRoutines(S).findIndex(row=>row.id===r.id), days: Object.entries(S.week || {}).filter(([, ids]) => routineIds(ids).includes(r.id)), overrides: Object.entries(S.dayPlan || {}).filter(([, ids]) => routineIds(ids).includes(r.id)) }))
    update(s => { s.routines = s.routines.filter(x => x.id !== r.id); removeRoutineAssignments(s,r.id) })
    setUndoVisible(true)
  }
  const restoreDeleted = () => {
    if (sessionStorage.getItem('framegym_deleted_routines')) return restoreAll()
    try {
      const saved = JSON.parse(sessionStorage.getItem('framegym_deleted_single_routine'))
      if (!saved?.routine) return
      update(s => { if (!s.routines.some(r => r.id === saved.routine.id)) s.routines.push(saved.routine); if(Number.isInteger(saved.position)){const ids=orderedRoutines(s).map(r=>r.id).filter(id=>id!==saved.routine.id);ids.splice(Math.max(0,saved.position),0,saved.routine.id);s.routineOrder=ids} (saved.days || []).forEach(([d, id]) => { s.week[d] = id }); (saved.overrides || []).forEach(([d, id]) => { s.dayPlan[d] = id }) })
      sessionStorage.removeItem('framegym_deleted_single_routine'); setUndoVisible(false)
    } catch { sessionStorage.removeItem('framegym_deleted_single_routine'); setUndoVisible(false) }
  }

  return <>
    <div className="hdr hdr-centered plan-header">
      <TrainingPauseAction compact />
      <div className="hdr-center"><h1>{t('Routine')}</h1></div>
      <button className="iconbtn" data-tour="routine-transfer" onClick={() => planToolsSheet({ mode: 'export' })} aria-label={t('Share your plan')} title={t('Share your plan')}><Icon name="upload" /></button>
    </div>
    <ModuleSwitch current="/plan" />
    <div className="cols">
      <div>
        <div className="week-schedule-header">
          <h4 className="sec week-schedule-title">{t('Week schedule')}</h4>
        </div>
        <div className="list week-schedule" data-tour="schedule" style={{ display: 'flex', flexDirection: 'column' }}>
          {[1, 2, 3, 4, 5, 6, 0].map(d => {
            const muscleIds = S.muscleWeek?.[d] || []
            const muscleNames = muscleIds.map(id => t(getMuscleLabel(id))).join(' · ')
            const routines = routineIds(S.week?.[d]).map(id=>S.routines?.find(x=>x.id===id)).filter(Boolean)
            const r = routines[0]

            return <div key={d} className="item" onClick={() => dayAssignSheet(d)}>
              <button type="button" className="week-schedule-open" onClick={e => { e.stopPropagation(); dayAssignSheet(d) }}>
                <div className="grow">
                  <div className="tt">{t(DAYN[d])}</div>
                  {muscleIds.length > 0 ? (
                    <div className="ss schedule-names">{muscleNames}</div>
                  ) : routines.length > 1 ? (
                    <div className="ss schedule-names">{routines.map(r=>r.name).join(' · ')}</div>
                  ) : null}
                </div>
                {muscleIds.length > 0 ? (
                  <span className="tag acc schedule-routine-label">
                    <Icon name="dumbbell" />{muscleNames}
                  </span>
                ) : r ? (
                  <span className="tag acc schedule-routine-label">
                    <Icon name={glyphOf(r.emoji)} />{routines.length>1 ? t('{0} activities',routines.length) : r.name}
                  </span>
                ) : (
                  <span className="tag">{t('Rest')}</span>
                )}
              </button>
              {r && <button className="iconbtn" aria-label={t('Muscles trained')} onClick={e=>{e.stopPropagation();routineMuscleSheet(r.id)}}><Icon name="info" /></button>}
              <Icon name="chevronRight" className="chev" />
            </div>
          })}
        </div>

        <div style={{ marginTop: 20 }}>
          <MuscleGoalsManager />
          <StepGoalManager />
        </div>
      </div>

      <div>
        {S.routines && S.routines.length > 0 ? (
          <div>
            <div className="row between" data-tour="routine" style={{ marginTop: 0, marginBottom: 10 }}>
              <h4 className="sec" style={{ margin: 0 }}>{t('Routines')}</h4>
            </div>
            <RoutineList
              S={S}
              onOpen={id => nav('/plan/r/' + id)}
              onDelete={deleteOne}
              onInfo={routineMuscleSheet}
              onReorder={(id, target) => update(s => reorderRoutine(s, id, target))}
            />
            <div style={{ height: 12 }} />
            <Button variant="danger" icon="trash" onClick={deleteAll}>
              {t('Delete all routines')}
            </Button>
          </div>
        ) : (
          <div className="card plan-goals-card" style={{ marginTop: 0 }}>
            <div className="row" style={{ gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <span className="plan-goal-badge" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}>
                <Icon name="dumbbell" />
              </span>
              <h3 className="plan-goals-title">{t('Muscle training schedule')}</h3>
            </div>
            <p className="dim small" style={{ margin: '0 0 8px 0', lineHeight: 1.5 }}>
              {t('Configure the muscle groups you want to train each day in the weekly calendar on the left. When you start your workout, the assigned muscle groups will appear automatically so you can log your exercises.')}
            </p>
          </div>
        )}
      </div>
    </div>
    {undoVisible && <div className="routine-undo"><span>{t('Routine deleted')}</span><button onClick={restoreDeleted}>{t('Undo')}</button></div>}
  </>
}
