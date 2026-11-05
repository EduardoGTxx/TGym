import { useState, useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { t, dateLocale } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Segmented } from './ui.jsx'
import {
  getDateListForPeriod,
  getBurnedCalories,
  getConsumedCalories,
  getCompletedSteps
} from '../lib/activity-engine.js'
import './CardioAndCalorieBalanceCard.css'

export default function CardioAndCalorieBalanceCard() {
  const S = useStore(s => s.S)
  const [period, setPeriod] = useState('day') // 'day' | 'week' | 'month'

  const dateList = useMemo(() => {
    return getDateListForPeriod(period)
  }, [period])

  const burnedKcal = useMemo(() => {
    return getBurnedCalories(S, dateList)
  }, [S, dateList])

  const consumedKcal = useMemo(() => {
    return getConsumedCalories(S, dateList)
  }, [S, dateList])

  const balance = consumedKcal - burnedKcal
  const isSurplus = balance > 0
  const isDeficit = balance < 0

  const stepsDone = useMemo(() => {
    return getCompletedSteps(S, dateList)
  }, [S, dateList])

  const stepGoalObj = S.stepGoal || { enabled: false, period: 'daily', target: 10000 }
  const goalTarget = Number(stepGoalObj.target) || 10000
  // Adjust goal target to selected period
  const normalizedTarget = useMemo(() => {
    const baseTarget = goalTarget
    const goalPeriod = stepGoalObj.period || 'daily'
    let dailyTarget = baseTarget
    if (goalPeriod === 'weekly') dailyTarget = baseTarget / 7
    else if (goalPeriod === 'monthly') dailyTarget = baseTarget / 30

    if (period === 'day') return Math.round(dailyTarget)
    if (period === 'week') return Math.round(dailyTarget * 7)
    return Math.round(dailyTarget * 30)
  }, [goalTarget, stepGoalObj.period, period])

  const stepPct = Math.min(100, Math.round((stepsDone / (normalizedTarget || 1)) * 100))

  const maxCal = Math.max(1, consumedKcal, burnedKcal)
  const consumedBarPct = Math.min(100, Math.round((consumedKcal / maxCal) * 100))
  const burnedBarPct = Math.min(100, Math.round((burnedKcal / maxCal) * 100))

  return (
    <div className="card calorie-balance-card">
      <div className="row between" style={{ marginBottom: 14 }}>
        <div>
          <h2 className="calorie-balance-title">{t('Cardio & Calorie Balance')}</h2>
          <span className="dim small">
            {period === 'day' ? t('Today') : period === 'week' ? t('Past 7 days') : t('Past 30 days')}
          </span>
        </div>
        <Segmented
          className="seg-range"
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'day', label: t('Day') },
            { value: 'week', label: t('Week') },
            { value: 'month', label: t('Month') }
          ]}
        />
      </div>

      {/* Burned vs Consumed Stat Blocks */}
      <div className="calorie-blocks-grid">
        <div className="calorie-block block-burned">
          <div className="calorie-block-icon">
            <Icon name="flame" />
          </div>
          <div className="calorie-block-info">
            <span className="calorie-block-label">{t('Burned (Cardio)')}</span>
            <b className="calorie-block-value">{burnedKcal.toLocaleString(dateLocale())} <small>kcal</small></b>
          </div>
        </div>

        <div className="calorie-block block-consumed">
          <div className="calorie-block-icon">
            <Icon name="apple" />
          </div>
          <div className="calorie-block-info">
            <span className="calorie-block-label">{t('Consumed (Nutrition)')}</span>
            <b className="calorie-block-value">{consumedKcal.toLocaleString(dateLocale())} <small>kcal</small></b>
          </div>
        </div>
      </div>

      {/* Comparison Balance View */}
      <div className="calorie-comparison-section">
        <div className="row between calorie-comparison-header">
          <span className="calorie-comparison-label">{t('Consumed vs Burned')}</span>
          <span className={`calorie-balance-badge ${isSurplus ? 'surplus' : isDeficit ? 'deficit' : 'even'}`}>
            {isSurplus ? `+${balance.toLocaleString(dateLocale())} kcal (${t('Surplus')})` :
             isDeficit ? `${balance.toLocaleString(dateLocale())} kcal (${t('Deficit')})` :
             t('Even balance')}
          </span>
        </div>

        {/* Dual Bars Comparison */}
        <div className="calorie-bars-container">
          <div className="calorie-bar-row">
            <span className="calorie-bar-label">{t('In')}</span>
            <div className="calorie-bar-track">
              <div
                className="calorie-bar-fill fill-in"
                style={{ width: `${consumedBarPct}%` }}
              />
            </div>
            <span className="calorie-bar-num">{consumedKcal} kcal</span>
          </div>

          <div className="calorie-bar-row">
            <span className="calorie-bar-label">{t('Out')}</span>
            <div className="calorie-bar-track">
              <div
                className="calorie-bar-fill fill-out"
                style={{ width: `${burnedBarPct}%` }}
              />
            </div>
            <span className="calorie-bar-num">{burnedKcal} kcal</span>
          </div>
        </div>
      </div>

      {/* Steps Tracking from Walk & Climbing */}
      <div className="calorie-steps-section">
        <div className="row between" style={{ marginBottom: 6 }}>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span className="steps-section-badge">
              <Icon name="figureWalk" />
            </span>
            <span className="steps-section-title">{t('Steps (Walk + Climbing)')}</span>
          </div>
          <span className="steps-section-count">
            <b>{stepsDone.toLocaleString(dateLocale())}</b> / {normalizedTarget.toLocaleString(dateLocale())}
          </span>
        </div>

        <div className="calorie-bar-track" style={{ height: 8 }}>
          <div
            className="calorie-bar-fill fill-steps"
            style={{ width: `${stepPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
