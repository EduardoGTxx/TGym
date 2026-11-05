import { filteredHistory, historyCsv } from '../lib/history-export.js'
export { filteredHistory, historyCsv } from '../lib/history-export.js'
import { useStore } from '../store/useStore.js'
import { t, dateLocale } from '../lib/i18n.js'
import { WorkoutRow, workoutDetailSheet, activityHistorySheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import ModuleSwitch, { PROGRESS_VIEWS } from '../components/ModuleSwitch.jsx'
import { useState } from 'react'
import { SearchField, Segmented } from '../components/ui.jsx'
import { saveReportFile } from '../lib/report-file.js'
import { loggedWorkouts } from '../lib/daily-plan.js'
import { todayISO } from '../lib/format.js'

function formatMonth(dateStr) {
  const d = new Date(dateStr + (dateStr?.length === 7 ? '-01T12:00:00' : 'T12:00:00'))
  if (isNaN(d.getTime())) return dateStr
  const str = d.toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' })
  return str.charAt(0).toUpperCase() + str.slice(1)
}

async function exportHistory(S, filters) {
  const blob = new Blob([historyCsv(S, filters)], { type: 'text/csv;charset=utf-8' })
  await saveReportFile({ blob, name: `TGym-history-${todayISO()}.csv` })
}

export default function History() {
  const S = useStore(s => s.S)
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState('all')
  const history = loggedWorkouts(S)
  const workouts = filteredHistory(S, { query: q, period }).reverse()

  const byMonth = []
  let curMonth = null
  let curList = []
  workouts.forEach(w => {
    const m = (w.d || '').slice(0, 7)
    if (m !== curMonth) {
      if (curMonth && curList.length) byMonth.push({ month: curMonth, list: curList })
      curMonth = m
      curList = [w]
    } else {
      curList.push(w)
    }
  })
  if (curMonth && curList.length) byMonth.push({ month: curMonth, list: curList })

  return <>
    <div className="hdr">
      <div style={{ flex: 1, minWidth: 0 }}><h1>{t('History')}</h1><div className="sub">{t('{0} workouts', history.length)}</div></div>
      <div className="row" style={{ gap: 4, flex: 'none' }}><button className="iconbtn" onClick={activityHistorySheet} aria-label={t('Activity — last 12 months')} title={t('Activity — last 12 months')}><Icon name="calendar" /></button><button className="iconbtn" onClick={() => exportHistory(S, { query: q, period })} aria-label={t('Export for Excel')} title={t('Export for Excel')}><Icon name="download" /></button></div></div>
    <ModuleSwitch items={PROGRESS_VIEWS} current="/history" />
    <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} placeholder={t('Search workouts or exercises…')} />
    <div style={{ height: 10 }} /><Segmented value={period} onChange={setPeriod} options={[{ value: '30', label: t('30 days') }, { value: '90', label: t('90 days') }, { value: 'all', label: t('All') }]} />
    <div style={{ height: 12 }} />
    {workouts.length ? (
      <div className="history-grouped-list">
        {byMonth.map(group => (
          <div key={group.month}>
            <h2 className="dribbble-gym-month">{formatMonth(group.month)}</h2>
            <div className="list">
              {group.list.map(w => <WorkoutRow key={w.id} w={w} onClick={() => workoutDetailSheet(w)} />)}
            </div>
          </div>
        ))}
      </div>
    ) : <div className="empty"><div className="ico"><Icon name="history" /></div>{t('No workouts yet.')}</div>}
  </>
}
