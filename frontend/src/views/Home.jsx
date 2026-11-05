import { calendarDay } from '../lib/calendar-data.js'
import { nextScheduledWorkout } from '../lib/consistency.js'
import { nextDailyRoutine } from '../lib/daily-plan.js'
import { openActivityEditor } from '../components/Activities.jsx'
import { statisticsState, isUntracked } from '../lib/training-history.js'
import { TrainingPauseAction } from '../components/TrainingPauseCard.jsx'
import { isTrainingPaused } from '../lib/training-pause.js'
import { routineConsistency } from '../lib/stats-insights.js'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutineId, effortValue } from '../lib/history.js'
import { fmtWeight, fmtDate, isoOf } from '../lib/format.js'
import { useLocalNow } from '../lib/use-local-now.js'
import { t, dateLocale } from '../lib/i18n.js'
import { bwSheet, goalSheet, dayOverrideSheet, startFlow, bwDeltaColor, streakDetailSheet, homeCalendarSheet, workoutRemindersSheet } from '../sheets.jsx'
import { routineMuscleSheet } from '../components/RoutineMusclePreview.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { deloadStatus, streakTier, trainingStreak } from '../lib/training-plan.js'
import StreakFlame from '../components/StreakFlame.jsx'
import { streakStatusText } from '../components/StreakStatus.jsx'
import TodayWeekCalendar from '../components/TodayWeekCalendar.jsx'
import './TrainingHome.css'

// Home = what to do now + a quick glance. Deep charts & history live in Stats.
export default function Home() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const today = useLocalNow(), todayIso = isoOf(today)
  const statsState = statisticsState(S,todayIso)
  const [weekOffset, setWeekOffset] = useState(0)

  const nextDate = nextScheduledWorkout(S, today)
  const routine = nextDate ? nextDailyRoutine(S, nextDate) : null
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const nextLabel = S.active ? t('Today') : nextDate === todayIso ? t('Today') : nextDate === isoOf(tomorrow) ? t('Tomorrow') : nextDate ? fmtDate(nextDate, true) : t('Next workout')
  const todayOvr = nextDate && S.dayPlan[nextDate] !== undefined
  const weightRows = [...statsState.bodyweight].sort((a,b)=>String(a.d).localeCompare(String(b.d)) || (Number(a.t)||0)-(Number(b.t)||0))
  const bw = weightRows.at(-1)
  const prevBW = weightRows.at(-2)
  const delta = bw && prevBW ? bw.w - prevBW.w : null
  const streak = trainingStreak(S,today)
  const deload = deloadStatus(S,todayIso)
  const paused = isTrainingPaused(S,todayIso)
  const consistency = routineConsistency(S, 56, today)
  const consistencyPct = consistency.rate == null ? null : Math.round(consistency.rate * 100)

  const weekDayState = (_date, iso) => {
    const eff = effectiveRoutineId(S, iso), ovr = S.dayPlan[iso] !== undefined, status = calendarDay(S,iso,today).status, done = status === 'completed'
    const pausedDay = isTrainingPaused(S,iso)
    const dot = isUntracked(S,iso,todayIso) ? '' : done ? ' done' : ovr && eff ? ' ovr' : eff ? ' plan' : ''
    return { className: pausedDay ? 'paused' : status === 'partial' ? 'partial' : '', dotClassName: dot.trim(), title: pausedDay ? t('Training paused') : undefined }
  }

  // today's session shown right under the week strip
  const onToday = () => { if (S.active) nav('/workout'); else if (routine && nextDate === todayIso) startFlow(routine.id); else if (routine) dayOverrideSheet(nextDate); else dayOverrideSheet(todayIso) }

  const user = useStore(s => s.user)
  const userName = user?.name || S.profile?.name || (S.lang === 'es' ? 'Atleta' : 'Athlete')
  const initials = userName.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'TG'
  const firstName = userName.split(' ')[0]
  const greetingTitle = (S.lang === 'es' ? 'Hola ' : 'Hi ') + firstName
  const greetingSub = S.lang === 'es' ? 'Bienvenido de nuevo' : 'Welcome back'

  const walkWorkouts = (S.workouts || []).filter(w => w.activity?.type === 'walking')
  const stepsLogged = walkWorkouts.filter(w => w.d === todayIso).reduce((acc, w) => acc + Number(w.activity?.steps || 0), 0)
  const displaySteps = stepsLogged > 0 ? stepsLogged : 8128
  const stepsGoal = 10000
  const stepsPct = Math.min(100, Math.round((displaySteps / stepsGoal) * 100))
  const strokeDashoffset = Math.round(226.2 * (1 - stepsPct / 100))

  const cyclingWorkouts = (S.workouts || []).filter(w => w.activity?.type === 'cycling')
  const cyclingDistance = cyclingWorkouts.reduce((acc, w) => acc + Number(w.activity?.distanceKm || 0), 0)
  const cyclingKmStr = cyclingDistance > 0 ? Number(cyclingDistance.toFixed(1)).toLocaleString(dateLocale()) : '42,8'
  const cyclingBars = [40, 65, 30, 85, 45, 95, 60]

  const strengthWorkouts = (S.workouts || []).filter(w => !w.activity || w.activity?.type === 'strength')
  const strengthMinutes = Math.round(strengthWorkouts.slice(-7).reduce((acc, w) => acc + (w.end && w.start ? (w.end - w.start) / 60000 : 45), 0))
  const gymMinStr = strengthMinutes > 0 ? String(strengthMinutes) : '84'

  const climbWorkouts = (S.workouts || []).filter(w => w.activity?.type === 'climbing' || w.activity?.type === 'hiking')
  const climbDistance = climbWorkouts.reduce((acc, w) => acc + Number(w.activity?.distanceKm || 0), 0)
  const climbStr = climbDistance > 0 ? Number(climbDistance.toFixed(1)).toLocaleString(dateLocale()) : '42,8'

  return <div className="narrow">
    <div className="hdr dribbble-top-header" id="training-top">
      <div className="dribbble-user-profile">
        <div className="dribbble-avatar">
          {S.profile?.photo ? <img src={S.profile.photo} alt={userName} className="dribbble-avatar-img" /> : <span>{initials}</span>}
        </div>
        <div className="dribbble-greeting">
          <h1 className="dribbble-greeting-title">{greetingTitle}</h1>
          <div className="dribbble-greeting-sub">{greetingSub} · <span className="training-date">{today.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
        </div>
      </div>
      <div className="dribbble-header-actions">
        <button className={'header-streak streak-' + streakTier(streak.current)} data-tour="streak" data-streak-state={streak.state} onClick={streakDetailSheet} aria-label={`${t('Training days in this streak')}: ${streak.current}. ${streakStatusText(streak)}`} title={streakStatusText(streak)}><StreakFlame value={streak.current} /><b>{streak.current}</b></button>
        <button type="button" className="dribbble-bell-btn" onClick={workoutRemindersSheet} aria-label={t('Reminders')}>
          <Icon name="bell" />
          <span className="dribbble-bell-dot" />
        </button>
        <button type="button" className="dribbble-settings-btn" onClick={() => nav('/settings')} aria-label={t('Settings')}>
          <Icon name="gear" />
        </button>
      </div>
    </div>

    {/* Dribbble 2x2 Activity Grid */}
    <div className="dribbble-activity-grid">
      <div className="dribbble-card dribbble-card-walk" role="button" tabIndex={0} onClick={() => openActivityEditor({ defaultType: 'walking' })} aria-label={t('Walk')}>
        <div className="dribbble-card-header">
          <span className="dribbble-badge"><Icon name="figureWalk" />{t('Walk')}</span>
        </div>
        <div className="dribbble-walk-center">
          <div className="dribbble-radial-wrap">
            <svg width="86" height="86" viewBox="0 0 86 86" aria-hidden="true">
              <circle cx="43" cy="43" r="36" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="6" />
              <circle cx="43" cy="43" r="36" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeDasharray="226.2" strokeDashoffset={strokeDashoffset} strokeLinecap="round" transform="rotate(-90 43 43)" />
            </svg>
            <div className="dribbble-radial-copy">
              <b>{displaySteps.toLocaleString(dateLocale())}</b>
              <small>{t('steps')}</small>
            </div>
          </div>
        </div>
      </div>

      <div className="dribbble-card dribbble-card-cycling" role="button" tabIndex={0} onClick={() => openActivityEditor({ defaultType: 'cycling' })} aria-label={t('Cycling')}>
        <div className="dribbble-card-header">
          <span className="dribbble-badge"><Icon name="bicycle" />{t('Cycling')}</span>
        </div>
        <div className="dribbble-card-stat">
          <b>{cyclingKmStr}</b>
          <small>{t('km')}</small>
        </div>
        <div className="dribbble-barchart" aria-hidden="true">
          {cyclingBars.map((h, i) => <div key={i} className={'dribbble-barchart-bar' + (i === 5 ? ' highlight' : '')} style={{ height: `${h}%` }} />)}
        </div>
      </div>

      <div className="dribbble-card dribbble-card-gym" role="button" tabIndex={0} onClick={() => nav('/gym')} aria-label={t('Gym')}>
        <div className="dribbble-card-header">
          <span className="dribbble-badge"><Icon name="dumbbell" />{t('Gym')}</span>
        </div>
        <div className="dribbble-card-stat">
          <b>{gymMinStr}</b>
          <small>{t('min')}</small>
        </div>
        <div className="dribbble-splits" aria-hidden="true">
          <div className="dribbble-split-row"><span>{t('Biceps')}</span><span>5/20</span></div>
          <div className="dribbble-split-track"><div className="dribbble-split-fill" style={{ width: '25%' }} /></div>
          <div className="dribbble-split-row"><span>{t('Chest')}</span><span>12/20</span></div>
          <div className="dribbble-split-track"><div className="dribbble-split-fill" style={{ width: '60%' }} /></div>
          <div className="dribbble-split-row"><span>{t('Legs')}</span><span>4/20</span></div>
          <div className="dribbble-split-track"><div className="dribbble-split-fill" style={{ width: '20%' }} /></div>
        </div>
      </div>

      <div className="dribbble-card dribbble-card-climbing" role="button" tabIndex={0} onClick={() => openActivityEditor({ defaultType: 'climbing' })} aria-label={t('Climbing')}>
        <div className="dribbble-card-header">
          <span className="dribbble-badge"><Icon name="mountain" />{t('Climbing')}</span>
        </div>
        <div className="dribbble-card-stat">
          <b>{climbStr}</b>
          <small>{t('km')}</small>
        </div>
        <svg className="dribbble-wave-chart" viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,35 Q20,15 40,25 T80,10 T120,20 L120,40 L0,40 Z" fill="rgba(255,255,255,0.3)" />
          <path d="M0,35 Q20,15 40,25 T80,10 T120,20" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>

    {S.deload?.on && (deload.active || (deload.daysUntil != null && deload.daysUntil <= 7)) && <div className="card" style={{ border: '1px solid color-mix(in srgb,var(--orange) 55%,transparent)' }}><div className="row" style={{ gap: 9 }}><Icon name="arrowDown" style={{ color: 'var(--orange)' }} /><div><b>{deload.active ? t('Deload week') : t('Deload week starts soon')}</b><div className="small dim">{deload.active ? t('Load {0}% · Working sets {1}% · RIR {2}', deload.config.loadPct, deload.config.setPct, effortValue('rir', deload.config.targetRir)) : t('Starts in {0} days.', deload.daysUntil) + ' · ' + deload.start + ' – ' + deload.end}</div></div></div></div>}

    <TodayWeekCalendar data-tour="calendar" id="training-calendar" today={today} weekOffset={weekOffset} onWeekOffsetChange={setWeekOffset}
      onExpand={homeCalendarSheet} onDay={dayOverrideSheet} getDayState={weekDayState}>
      <div className="today-row home-next-workout">
        {routine ? <button type="button" className="lrow-i today-row-icon highlighted" style={{ background: S.active ? 'var(--orange)' : 'var(--acc)' }} aria-label={t('Muscles trained')} title={t('Muscles trained')} onClick={() => routineMuscleSheet(routine.id)}><Icon name="info" /></button>
          : <span className={'lrow-i today-row-icon' + (S.active ? ' highlighted' : '')} style={{ background: S.active ? 'var(--orange)' : 'var(--surface-3)' }}><Icon name={S.active ? 'timer' : 'moon'} /></span>}
        <button type="button" className="today-row-main" onClick={onToday}>
            <div className="today-row-copy" style={{ minWidth: 0 }}>
              <div className="lbl2">{nextLabel}</div>
              <div className="ttl">{S.active ? t('{0} — in progress', S.active.name)
                : routine ? routine.name : paused ? t('Training paused') : t('No upcoming workout')}{todayOvr && routine ? ' · ' + t('rescheduled') : ''}</div>
            </div>
          {S.active ? <span className="tag" style={{ color: 'var(--orange)', background: 'color-mix(in srgb,var(--orange) 16%,transparent)' }}>{t('Resume')}</span>
            : routine ? <span className="tag acc">{t(nextDate === todayIso ? 'Start' : 'Scheduled')}</span>
            : <Icon name="plus" className="chev" />}
        </button>
      </div>
    </TodayWeekCalendar>

    <section className="card home-bodyweight-card" id="training-bodyweight" aria-labelledby="home-bodyweight-title">
      <div className="home-bodyweight-heading">
        <div className="home-bodyweight-heading-copy">
          <h2 id="home-bodyweight-title" className="body-weight-title">{t('Body Weight')}</h2>
        </div>
        <Button size="sm" className="home-bodyweight-log" icon="plus" aria-label={t('Log body weight')} onClick={() => bwSheet()}>{t('Log')}</Button>
      </div>
      <div className="home-bodyweight-summary">
        <div className="home-bodyweight-current">
          <span className="home-bodyweight-metric">
            <span className="home-bodyweight-label">{t('Current')}</span>
            <span className="home-bodyweight-value"><b>{bw ? fmtWeight(bw.w) : '—'}</b>{bw && <span>{S.unit}</span>}</span>
          </span>
        </div>
        <div className="home-bodyweight-target">
          <Button className="home-bodyweight-goal" aria-label={t('Target weight')} onClick={goalSheet}>
            <span className="home-bodyweight-metric">
              <span className="home-bodyweight-label"><Icon name="target" />{t('Target weight')}</span>
              <span className={'home-bodyweight-value' + (S.targetW ? ' has-goal' : '')}><b>{S.targetW ? fmtWeight(S.targetW) : t('Goal')}</b>{!!S.targetW && <span>{S.unit}</span>}</span>
            </span>
          </Button>
        </div>
      </div>
      {bw && !!delta && <span className="home-bodyweight-change" style={{ color: bwDeltaColor(delta, bw.w) }}>
          <Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} />
          <span>{t('Since previous: {0}', fmtWeight(Math.abs(delta)) + ' ' + S.unit)}</span>
        </span>}
      {!bw && <p className="muted small home-bodyweight-empty">{t("No entries yet — log your weight to start the curve. It's also asked before every workout.")}</p>}
      {bw && <footer className="home-bodyweight-footer"><time className="home-bodyweight-last" dateTime={bw.d}>{fmtDate(bw.d, false)}</time></footer>}
    </section>

    <TrainingPauseAction onlyPaused />
    <dl hidden><dt>{t('Completion')}</dt><dd>{consistencyPct ?? '–'}{consistencyPct != null && '%'}</dd></dl>
  </div>
}
