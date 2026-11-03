import { MONTHS_LONG } from './format.js'
import { calendarGrid, calendarSvgLegend, calendarText as text, calendarRect as rect, escapeCalendarText as escape } from './calendar-grid.js'
import { TRACKING_START_MARKER } from './calendar-visual.js'
import { STREAK_FLAME_PATH } from './streak-flame-path.js'

const NAVY = '#18324f', MUTED = '#52647c', BLUE = '#115bb2'
export const calendarTextWidth = (value, size) => [...String(value)].reduce((width, char) => width + size * (/\s/.test(char) ? .3 : /[ilIt.,:!|]/.test(char) ? .3 : /[MW@%]/.test(char) ? .85 : char.codePointAt(0) > 0x2e80 ? 1 : .57), 0)
export function calendarWrappedText(x, y, value, maxWidth, size, lineHeight, weight = 400, fill = MUTED) {
  const lines = []
  const push = word => {
    if (!lines.length || calendarTextWidth(lines.at(-1) + ' ' + word, size) > maxWidth) lines.push(word)
    else lines[lines.length - 1] += ' ' + word
  }
  for (const word of String(value).split(/\s+/)) {
    if (calendarTextWidth(word, size) <= maxWidth) push(word)
    else { let part = ''; for (const char of word) { if (part && calendarTextWidth(part + char, size) > maxWidth) { push(part); part = '' }; part += char }; if (part) push(part) }
  }
  return lines.map((line, i) => text(x, y + i * lineHeight, line, size, weight, 'start', fill)).join('')
}

function flame(value, x, y) {
  const active = Number(value) > 0
  return `<svg data-streak-flame="${active ? 'active' : 'inactive'}" x="${x}" y="${y}" width="66" height="72" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="report-streak-fill" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffd60a"/><stop offset="100%" stop-color="#ff9f0a"/></linearGradient></defs><path d="${STREAK_FLAME_PATH}" fill="${active ? 'url(#report-streak-fill)' : '#e3e8ef'}" stroke="${active ? '#9b4a06' : '#718096'}" stroke-width="1" stroke-linejoin="round"/></svg>`
}

function reportProfile(profile, start, end, context) {
  if (!profile) return null
  // The local editor limits names to 80 characters and stores raster photos.
  // Imported profiles remain read-only; an unsafe photo falls back to initials.
  const name = typeof profile.name === 'string' ? [...profile.name.trim()].slice(0, 80).join('') : ''
  const photo = typeof profile.photo === 'string' && profile.photo.length <= 350000 && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(profile.photo) ? profile.photo : ''
  if (!name && !photo) return null
  const initials = name.split(/\s+/).slice(0, 2).map(part => [...part][0]).join('').toLocaleUpperCase()
  const nameMarkup = name ? calendarWrappedText(250, 161, name, 702, 38, 44, 750, NAVY) : ''
  const nameHeight = (nameMarkup.match(/<text /g)?.length || 0) * 44
  const periodY = name ? 161 + nameHeight + 8 : 187
  const extra = Math.max(302, periodY + 38) + 20 - 181
  let markup = '<g data-report-profile="true"><defs><clipPath id="report-profile-circle"><circle cx="136" cy="214" r="88"/></clipPath></defs>'
  markup += '<circle cx="136" cy="214" r="88" fill="#eef3fa" stroke="#dce3ec" stroke-width="3"/>'
  markup += `<text data-profile-initials="true" x="136" y="214" dominant-baseline="central" text-anchor="middle" font-size="58" font-weight="700" fill="${BLUE}">${escape(initials)}</text>`
  if (photo) markup += `<image data-profile-photo="true" x="48" y="126" width="176" height="176" href="${escape(photo)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#report-profile-circle)"/>`
  markup += `<g data-profile-name="true">${nameMarkup}</g>` + text(250, periodY, `${start} – ${end}`, 23, 500, 'start', NAVY) + text(250, periodY + 28, context, 19, 400, 'start', MUTED) + '</g>'
  return { markup, extra }
}

// Shared by every Streak/Consistency export and their combined-report sections.
// Streak years are a complete 3×4 overview. Other calendar reports retain their
// paginated presentation; every layout keeps complete months and square dates.
export function calendarReportLayout({ kind, days, start, end, metrics, context = '', trackingSince = '', note = '', emptyMessage = '', format = 'pdf', week = false, layout = 'calendar', year, profile, t = x => x }) {
  const identity = kind === 'streak' ? reportProfile(profile, start, end, context) : null
  const profileExtra = identity?.extra || 0
  const grouped = new Map()
  for (const day of days) {
    const key = week ? 'week' : day.iso.slice(0, 7)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(day)
  }
  const months = [...grouped.values()], chunks = []
  const limit = format === 'png' ? months.length : kind === 'streak' ? 12 : 4
  for (let i = 0; i < months.length; i += limit) chunks.push(months.slice(i, i + limit))
  return chunks.map((groups, pageIndex) => {
    const columns = kind === 'streak' ? groups.length > 4 ? 3 : groups.length > 1 ? 2 : 1 : format === 'pdf' && groups.length > 1 ? 2 : 1
    const annual = columns === 3, compact = columns > 1
    const rowHeight = annual ? 318 : compact ? 420 : week ? 200 : 706
    const columnWidth = annual ? (904 - 48) / 3 : compact ? 440 : 904
    const columnStep = annual ? columnWidth + 24 : 464
    const cardWidth = (904 - 16 * (metrics.length - 1)) / metrics.length
    const metricLabels = metrics.map(([label], i) => calendarWrappedText(0, 0, t(label), cardWidth - (kind === 'streak' && i === 0 ? 102 : 36), 20, 22, 500, NAVY))
    const metricExtra = Math.max(0, ...metricLabels.map(label => (label.match(/<text /g)?.length || 1) - 1)) * 22
    const noteMarkup = calendarWrappedText(48, 306 + metricExtra + profileExtra, note, 904, 20, 23)
    const noteLines = noteMarkup.match(/<text /g)?.length || 1
    // Reserve actual wrapped header space in every language before the month title.
    const headerExtra = metricExtra + profileExtra + Math.max(0, (noteLines - 1) * 23 - 4)
    const bodyEnd = 330 + headerExtra + Math.ceil(groups.length / columns) * rowHeight
    const height = !annual && compact && groups.length > 2 ? 1414 + headerExtra : Math.max(720, bodyEnd + 190)
    const legendY = !annual && compact && groups.length > 2 ? 1215 + headerExtra : bodyEnd + 35
    const title = t(kind === 'streak' ? 'Streak Report' : 'Consistency Report')
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${height}" viewBox="0 0 1000 ${height}" role="img" aria-label="${escape(title)}" data-layout="${layout}" data-columns="${columns}" data-part="${pageIndex + 1}"${year ? ` data-year="${year}"` : ''}><g font-family="Arial, sans-serif">`
    svg += rect(0, 0, 1000, height, '#ffffff', 0) + rect(48, 30, 5, 24, BLUE, 2) + text(66, 50, 'TGym', 24, 750, 'start', BLUE)
    svg += text(48, 98, title, 38, 750, 'start', NAVY)
    svg += identity ? identity.markup : text(48, 134, `${start} – ${end}`, 23, 500, 'start', NAVY) + text(48, 161, context, 19, 400, 'start', MUTED)
    metrics.forEach(([label, value], i) => {
      const x = 48 + i * (cardWidth + 16), hasFlame = kind === 'streak' && i === 0, left = x + (hasFlame ? 84 : 18)
      svg += `<g data-summary="${escape(label)}" data-value="${escape(value)}">` + rect(x, 181 + profileExtra, cardWidth, 96 + metricExtra, '#eef3fa', 12)
      if (hasFlame) svg += flame(value, x + 8, 192 + profileExtra + metricExtra / 2)
      svg += calendarWrappedText(left, 208 + profileExtra, t(label), cardWidth - (hasFlame ? 102 : 36), 20, 22, 500, NAVY)
      svg += text(left, 258 + metricExtra + profileExtra, value, 40, 750, 'start', BLUE) + '</g>'
    })
    svg += `<g data-report-note="true">${noteMarkup}</g>`
    groups.forEach((monthDays, i) => {
      const date = new Date(monthDays[0].iso + 'T12:00:00')
      const title = week ? `${monthDays[0].iso} – ${monthDays.at(-1).iso}` : `${t(MONTHS_LONG[date.getMonth()])} ${date.getFullYear()}`
      const x = 48 + i % columns * columnStep, y = 360 + headerExtra + Math.floor(i / columns) * rowHeight
      svg += `<g data-month="${monthDays[0].iso.slice(0, 7)}">`
      svg += calendarGrid({ days: monthDays, title, period: week ? 'week' : 'month', x, y, width: columnWidth, kind, t,
        geometry: annual
          ? { cell: 36, gap: 4, daySize: 26, titleSize: 22, weekdaySize: 16, weekdayOffset: 30, daysOffset: 44, titleFill: NAVY }
          : { cell: compact ? 48 : 92, gap: compact ? 7 : 10, daySize: compact ? 30 : 34, titleSize: compact ? 26 : 30, weekdaySize: compact ? 21 : 23, weekdayOffset: 36, daysOffset: 54, titleFill: NAVY } }) + '</g>'
    })
    svg += `<line x1="48" y1="${legendY - 36}" x2="952" y2="${legendY - 36}" stroke="#dce3ec"/>` + calendarSvgLegend({ y: legendY, kind, t })
    if (emptyMessage) svg += text(48, height - 55, emptyMessage, 19, 400, 'start', MUTED)
    svg += trackingSince
      ? `<g data-tracking-start="${escape(trackingSince)}"><circle cx="53" cy="${height - 31}" r="5" fill="${TRACKING_START_MARKER.fill}" stroke="${TRACKING_START_MARKER.border}"/>` + text(66, height - 25, t('Tracking since {0}').replace('{0}', trackingSince), 17, 500, 'start', MUTED) + '</g>'
      : text(48, height - 25, 'TGym', 17, 600, 'start', MUTED)
    svg += text(952, height - 25, `${pageIndex + 1} / ${chunks.length}`, 18, 500, 'end', MUTED)
    return { svg: svg + '</g></svg>', width: 1000, height }
  })
}
