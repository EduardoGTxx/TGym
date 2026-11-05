import { openTrainingHistory } from '../components/TrainingHistory.jsx'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, DEF, hasData } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { ACCENTS, todayISO } from '../lib/format.js'
import { api, webauthnOK, passkeyLogin, passkeyRegister, IS_ANDROID } from '../lib/api.js'
import { t, LANGS, INSTR_LANGS, exerciseNameModeOf } from '../lib/i18n.js'
import { DEMO, REPO, STANDALONE } from '../lib/demo.js'
import { MOBILE, shareExport } from '../lib/mobile.js'
import { plateCalculatorSheet, loadStarterPlan, confirmSheet, importFromApp, equipmentProfileSheet, planImportSheet, planToolsSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Section, Row, SelectRow, Switch, Segmented, Button, TextField } from '../components/ui.jsx'
import { biometricEnabled, checkDeviceBiometry, deviceLockEnabled, enrollDeviceBiometry, removeDevicePin, setBiometricEnabled, setDevicePin, verifyDevicePin } from '../lib/app-lock.js'
import { canUndoImport, restoreImportUndo, saveImportUndo } from '../lib/import-undo.js'
import { parseTGymJson } from '../lib/json-import.js'
import { createBackup } from '../lib/backup.js'
import { convertMeasurementState, convertWeightState } from '../lib/unit-conversion.js'
import { openRestoreSheet } from '../components/RestoreSheet.jsx'
import { UpdateCheckButton } from '../components/AppUpdate.jsx'
import { APP_REPOSITORY, ORIGINAL_OPENGYM_REPOSITORY } from '../lib/app-meta.js'
import MeasurementReminders from '../components/MeasurementReminders.jsx'
import WorkoutReminderSettings from '../components/WorkoutReminderSettings.jsx'
import { openLocalProfile } from '../components/LocalProfile.jsx'

function BackupSheet({ onExport, onImport }) {
  const autoBackup = useStore(s => !!s.S.autoBackup)
  const update = useStore(s => s.update)
  return <><h3>{t('Backup')}</h3><div className="list">
    <Row icon="download" iconTint="var(--blue)" title={t('Export full backup')} accessory="chevron" onClick={onExport} />
    <Row icon="upload" iconTint="var(--blue)" title={t('Import full backup')} accessory="chevron" onClick={onImport} />
    {MOBILE && <Row icon="history" iconTint="var(--blue)" title={t('Auto-backup on changes')}
      subtitle={t('Saves a dated copy to the Documents folder after finishing a workout or editing a routine — point a sync app at it, or copy it out by hand.')}>
      <Switch checked={autoBackup} onChange={v => update(s => { s.autoBackup = v })} />
    </Row>}
  </div></>
}

function DevicePinSheet({ removing, close, onChanged, onBusy }) {
  const [pin, setPin] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false), input = useRef(null)
  useEffect(() => { if (error && !busy) input.current?.focus() }, [error, busy])
  const clean = setter => e => setter(e.target.value.replace(/\D/g, '').slice(0, 4))
  const save = async () => {
    if (pending.current) return
    if (!removing && pin.length !== 4) { setError(t('PIN must contain 4 digits')); return }
    if (!removing && pin !== again) { setError(t('PINs do not match')); return }
    pending.current = true; setBusy(true); onBusy?.(true); setError('')
    try {
    if (removing) {
      const result = await verifyDevicePin(pin)
      if (!result.ok) { setError(result.waitMs ? t('Try again in a moment.') : t('Incorrect PIN')); return }
      removeDevicePin(); onChanged(false); close(); return
    }
    const key = await setDevicePin(pin); onChanged(true); setRecoveryKey(key)
    } catch { setError(t('Could not save. Check available storage and try again.')) }
    finally { pending.current = false; setBusy(false); onBusy?.(false) }
  }
  if (recoveryKey) return <><h3>{t('Save your recovery key')}</h3><div className="muted small" style={{ marginBottom: 14 }}>{t('Keep it somewhere private. It is the only way to enter TGym if you forget the PIN.')}</div>
    <div className="card" style={{ textAlign: 'center', fontSize: 20, letterSpacing: 2, userSelect: 'all' }}><b>{recoveryKey}</b></div><div style={{ height: 14 }} /><Button variant="primary" onClick={close}>{t('I saved it')}</Button></>
  return <>
    <h3>{removing ? t('Disable app lock') : t('Create app PIN')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{removing ? t('Enter your current PIN to continue.') : t('This PIN stays only on this device and is not included in backups.')}</div>
    <input ref={input} className="input" disabled={busy} type="password" inputMode="numeric" placeholder={t('4-digit PIN')} value={pin} onChange={clean(setPin)} maxLength={4} />
    {!removing && <input className="input" disabled={busy} style={{ marginTop: 10 }} type="password" inputMode="numeric" placeholder={t('Repeat PIN')} value={again} onChange={clean(setAgain)} maxLength={4} />}
    {error && <div className="small" role="alert" style={{ color: 'var(--red)', marginTop: 10 }}>{error}</div>}
    <div style={{ height: 14 }} /><Button variant="primary" disabled={busy} aria-busy={busy} onClick={save}>{removing ? t('Disable') : t('Save')}</Button>
  </>
}

function VerifyDevicePinSheet({ close, onVerified, onBusy }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false), input = useRef(null)
  useEffect(() => { if (error && !busy) input.current?.focus() }, [error, busy])
  const verify = async () => {
    if (pending.current) return
    pending.current = true; setBusy(true); onBusy?.(true); setError('')
    try {
    const result = await verifyDevicePin(pin)
    if (!result.ok) { setPin(''); setError(result.waitMs ? t('Try again in a moment.') : t('Incorrect PIN')); return }
    close(); onVerified()
    } catch { setError(t('Could not unlock. Try again.')) }
    finally { pending.current = false; setBusy(false); onBusy?.(false) }
  }
  return <><h3>{t('Confirm your PIN')}</h3><div className="muted small" style={{ marginBottom: 14 }}>{t('Authentication is required for this action.')}</div>
    <input ref={input} disabled={busy} className="input" type="password" inputMode="numeric" placeholder={t('4-digit PIN')} value={pin} maxLength={4}
      onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={e => { if (e.key === 'Enter' && pin.length === 4) verify() }} />
    {error && <div className="small" role="alert" style={{ color: 'var(--red)', marginTop: 10 }}>{error}</div>}
    <div style={{ height: 14 }} /><Button variant="primary" disabled={busy || pin.length !== 4} aria-busy={busy} onClick={verify}>{t('Confirm')}</Button></>
}

export default function Settings() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const serverSyncError = useStore(s => s.serverSyncError)
  const [serverSyncBusy, setServerSyncBusy] = useState(false)
  const serverSyncPending = useRef(false)
  const { update, replaceState, setUser, pullState, pushState, signOut, signOutAll, resetDemo, setGuest } = useStore()
  const toast = useUI(s => s.toast)
  const fileRef = useRef(null)
  const importRef = useRef(null)
  const [lockOn, setLockOn] = useState(() => deviceLockEnabled())
  const [bioOn, setBioOn] = useState(() => biometricEnabled())
  const [bioAvailable, setBioAvailable] = useState(false)
  useEffect(() => { if (MOBILE || STANDALONE) checkDeviceBiometry().then(info => setBioAvailable(info.available)) }, [])
  const editDeviceLock = () => {
    let handle
    handle = useUI.getState().openSheet(close => <DevicePinSheet removing={lockOn} close={close} onBusy={value => handle.lock(value)} onChanged={v => { setLockOn(v); if (!v) setBioOn(false) }} />)
    return handle
  }
  const toggleBiometry = async enabled => {
    if (!enabled) { setBiometricEnabled(false); setBioOn(false); return }
    try {
      await enrollDeviceBiometry()
      setBiometricEnabled(true); setBioOn(true); toast(t('Biometric unlock enabled'))
    } catch { toast(t('Biometric authentication was not completed')) }
  }
  const authorize = action => {
    if (!lockOn) return action()
    let handle
    handle = useUI.getState().openSheet(close => <VerifyDevicePinSheet close={close} onVerified={action} onBusy={value => handle.lock(value)} />)
    return handle
  }

  const exportNow = async () => {
    const json = JSON.stringify(createBackup(S), null, 2)
    const name = 'TGym-full-backup-' + todayISO() + '.json'
    // WKWebView can't download blob URLs — the native build hands the file to the share sheet.
    if (MOBILE) {
      try { await shareExport(json, name); toast(t('Backup exported')) } catch (e) { /* share sheet dismissed */ }
      return
    }
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href)
    toast(t('Backup exported'))
  }
  const doExport = () => authorize(exportNow)
  const doImport = ev => {
    const f = ev.target.files[0]; ev.target.value = ''; if (!f) return
    const rd = new FileReader()
    rd.onload = () => {
      try {
        const imported = parseTGymJson(rd.result)
        if (imported.kind === 'plan') { planImportSheet(imported.bundle); return }
        confirmSheet({ title: t('Import backup?'), message: t('This replaces all current data with the backup file.'), confirmText: t('Import'), danger: true, onConfirm: () => {
          if (!saveImportUndo(useStore.getState().S)) { toast(t('Could not save. Check available storage and try again.')); return }
          replaceState(Object.assign(JSON.parse(JSON.stringify(DEF)), imported.data), true)
          toast(t('Backup imported'))
        } })
      } catch (e) { toast(t('Import failed: {0}', e.message)) }
    }
    rd.readAsText(f)
  }
  const openLoadRoutine = () => useUI.getState().openSheet(close => <>
    <h3>{t('Load Routine')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Create, import or export routines from one place.')}</div>
    <div className="list">
      <Row icon="sparkles" iconTint="var(--acc)" title={t('Load starter plan (PPL)')} accessory="chevron" onClick={() => { close(); loadStarterPlan() }} />
      <Row icon="folder" iconTint="var(--blue)" title={t('Import or export routine')} subtitle={t('TGym routine files contain no workout history.')} accessory="chevron" onClick={() => { close(); planToolsSheet({ mode: 'import' }) }} />
      <Row icon="shuffle" iconTint="var(--teal)" title={t('Import from another app')} subtitle={t('FitNotes, Strong, Hevy — or body weight from Apple Health')} accessory="chevron" onClick={() => { close(); requestAnimationFrame(() => importRef.current?.click()) }} />
    </div>
  </>)
  const signInHere = async () => {
    try { const u = await passkeyLogin(); setUser(u); const synced = await pullState(); toast(synced === false ? t('Server synchronization failed. Your local data was kept.') : t('Welcome back, {0}', u.name)) }
    catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') toast(e.message || t('Sign-in failed')) }
  }
  const registerHere = () => useUI.getState().openSheet(close => <RegisterInline close={close} setUser={setUser} pushState={pushState} pullState={pullState} toast={toast} />)
  // Ends the profile's sessions on every device — this one included, so on success it lands in
  // the same place as the plain sign-out above (home, local data cleared). On failure nothing
  // local is touched: still signed in here, and say so rather than leaving a half-signed-out app.
  const signOutEverywhere = () => confirmSheet({
    title: t('Sign out everywhere?'),
    message: t('Signs this profile out on every device, including this one. Your passkeys keep working — sign in with them again anytime.'),
    confirmText: t('Sign out everywhere'), danger: true,
    onConfirm: async () => {
      try { const cleared = await signOutAll(); nav('/home'); toast(t(cleared === false ? 'Sign-out completed. Your local data was kept on this device.' : 'Signed out on all devices')) }
      catch (e) { toast(t('Could not sign out everywhere — you are still signed in.')) }
    },
  })

  return <div className="narrow settings-page">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/home')} aria-label={t('Home')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, minWidth: 0, marginLeft: 10 }}><h1>{t('Settings')}</h1></div>
    </div>

    <div data-tour="profile"><Section title={t('Profile')}><Row icon="personCircle" iconTint="var(--acc)" title={S.profile?.name || user?.name || t('Profile')} subtitle={t('Name, photo and personal data')} accessory="chevron" onClick={openLocalProfile} /></Section></div>
    {/* ---------- account (demo and mobile builds have nothing to sign in to) ---------- */}
    {!(MOBILE || STANDALONE) && <Section title={DEMO ? t('Demo') : t('Account')}>
      {DEMO ? <>
        <Row icon="sparkles" iconTint="var(--acc)" title={t('You’re in the demo')} subtitle={t('Example data, stored only in this browser — change anything you like.')} />
        <Row icon="reset" iconTint="var(--blue)" title={t('Reset demo data')} accessory="chevron"
          onClick={() => confirmSheet({ title: t('Reset demo data?'), message: t('Puts the example plan, workouts and weigh-ins back the way they started.'), confirmText: t('Reset'), onConfirm: () => { resetDemo(); nav('/home'); toast(t('Demo data reset')) } })} />
        <Row icon="rocket" iconTint="var(--indigo)" title={t('Self-host TGym')} subtitle={t('Passkey sign-in, sync across your devices, your own data.')} accessory="chevron"
          onClick={() => window.open(REPO, '_blank', 'noopener')} />
      </> : user ? <>
        <Row icon="personCircle" iconTint="var(--grey)" title={user.name} subtitle={t('Signed in with passkey — data syncs to this profile.')} />
        {user.admin && <Row icon="wrench" iconTint="var(--indigo)" title={t('Admin dashboard')} accessory="chevron" onClick={() => nav('/admin')} />}
        <Row icon="signOut" iconTint="var(--red)" title={t('Sign out')} danger onClick={() => confirmSheet({ title: t('Sign out?'), message: t('Your saved data is synced first. Active workouts and unsent changes stay on this device.'), confirmText: t('Sign out'), danger: true, onConfirm: async () => { try { const cleared = await signOut(); nav('/home'); if (cleared === false) toast(t('Sign-out completed. Your local data was kept on this device.')) } catch { toast(t('Could not sign out. Your local data was kept. Check your connection and try again.')) } } })} />
        <Row icon="shield" iconTint="var(--red)" title={t('Sign out everywhere')} subtitle={t('Ends this profile’s sessions on all your devices.')} danger onClick={signOutEverywhere} />
      </> : <>
        <Row icon="shield" iconTint="var(--acc)" title={t('Private local mode')} subtitle={t('Your data is stored only on this device.')} />
        {webauthnOK() && !(MOBILE || STANDALONE) && <>
          <Row icon="sparkles" iconTint="var(--acc)" title={t('Create passkey profile')} subtitle={t('Keeps your data safe and separate per person.')} accessory="chevron" onClick={registerHere} />
          <Row icon="person" iconTint="var(--blue)" title={t('Sign in with passkey')} accessory="chevron" onClick={signInHere} />
        </>}
        <Row icon="signOut" iconTint="var(--red)" title={t('Leave local profile')} danger onClick={() => confirmSheet({
          title: t('Leave local profile?'),
          message: t('You will return to the welcome screen. Your local data stays safely on this device.'),
          confirmText: t('Leave local profile'),
          danger: true,
          onConfirm: () => { setGuest(false); nav('/home'); toast(t('Back at the welcome screen')) }
        })} />
      </>}
    </Section>}


    {/* ---------- general ---------- */}
    <Section className="profile-preferences" title={t('General')} footer={t('Changing a unit automatically converts all saved values, including history and active workouts.')}>
      <SelectRow
        icon="globe" iconTint="var(--blue)" title={t('Language')}
        value={Object.hasOwn(LANGS, S.lang) ? S.lang : 'en'} onChange={v => update(s => { s.lang = v })}
        options={Object.entries(LANGS).map(([k, name]) => ({
          value: k, label: name,
          subtitle: INSTR_LANGS.includes(k) ? null : t("Exercise instructions aren't available in this language yet — they stay in English."),
        }))}
      />
      <SelectRow icon="dumbbell" iconTint="var(--purple)" title={t('Exercise names')}
        value={exerciseNameModeOf(S)} onChange={v => update(s => { s.exerciseNameMode = v })}
        options={[{ value: 'aliases', label: t('My aliases') }, { value: 'original', label: t('Original names') }]} />
      <p className="sect-f" style={{ margin: '8px 16px 12px' }}>{t('Choose which names appear throughout TGym. Missing aliases use the original name; your aliases are kept.')}</p>
      <Row icon="scale" iconTint="var(--teal)" title={t('Weight unit')}>
        <Segmented className="seg-inline"
          options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]}
          value={S.unit} onChange={v => update(s => { convertWeightState(s, v) })} />
      </Row>
      <Row icon="figureStrength" iconTint="var(--purple)" title={t('Measurement unit')}><Segmented className="seg-inline" options={[{ value: 'cm', label: 'cm' }, { value: 'in', label: 'in' }]} value={S.measurementUnit || 'cm'} onChange={v => update(s => { convertMeasurementState(s, v) })} /></Row>
    </Section>

    <Section data-tour="privacy" title={t('Privacy')} footer={t('When enabled, TGym locks after being in the background for 5 minutes.')}>
      <Row icon="lock" iconTint="var(--red)" title={t('App lock')} subtitle={lockOn ? t('4-digit PIN · locks after 5 minutes') : t('Protect TGym on this device')} accessory="chevron" onClick={editDeviceLock} />
      {(MOBILE || STANDALONE) && <Row icon="personCircle" iconTint="var(--blue)" title={t('Fingerprint or Face ID')}
        subtitle={!lockOn ? t('Create the TGym PIN first.') : bioAvailable ? t('Unlock with the biometrics enrolled on this phone.') : t('No compatible biometric authentication is enrolled.')}>
        <Switch checked={bioOn} disabled={!lockOn || !bioAvailable} onChange={toggleBiometry} />
      </Row>}
    </Section>

    <Section data-tour="reminders" title={t('Reminders')} className="settings-reminders">
      <MeasurementReminders settingsOnly />
      {(MOBILE || !user) && <WorkoutReminderSettings />}
    </Section>

    {/* ---------- appearance ---------- */}
    <Section data-tour="preferences" title={t('Appearance')} footer={DEMO || MOBILE ? undefined : t('synced with your profile')}>
      <Row icon="moon" iconTint="var(--indigo)" title={t('Theme')} className="lrow-theme">
        <Segmented
          className="seg-inline"
          options={[
            { value: 'amoled', icon: 'moon', label: t('Dark') },
            { value: 'light', icon: 'sun', label: t('Light') },
          ]}
          value={S.theme === 'light' ? 'light' : 'amoled'}
          onChange={v => update(s => { s.theme = v })}
        />
      </Row>
      {/* Purely how the muscle map is drawn — nothing else in the app reads this. */}
      <Row icon="figureStrength" iconTint="var(--teal)" title={t('Body diagram')}>
        <Segmented
          className="seg-inline"
          options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]}
          value={S.body === 'female' ? 'female' : 'male'}
          onChange={v => update(s => { s.body = v })}
        />
      </Row>
      <div className="lrow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, paddingTop: 13, paddingBottom: 14 }}>
        <span className="lrow-t">{t('Accent color')}</span>
        <div className="swatches">
          {Object.entries(ACCENTS).map(([k, c]) => (
            <button key={k} className={'swatch' + ((S.accent || 'red') === k ? ' on' : '')}
              style={{ background: c }} onClick={() => update(s => { s.accent = k })} aria-label={k} />
          ))}
        </div>
      </div>
    </Section>

    {/* ---------- data: fill it, bring things over, back it up, wipe it ---------- */}
    <Section data-tour="data" title={t('Data')}>
      <Row icon="lock" iconTint="var(--acc)" title={t('All Data stays on this device')} subtitle={user
        ? t('This profile also syncs with your connected server. Cloud backups and exported copies leave this device when you choose them.')
        : t('Stored locally by default. Connecting a server, enabling cloud backup or sharing an export sends a copy outside this device.')} />
      {user && serverSyncError && <div className="reminder-feedback warning" role="alert">
        <span>{t('Server synchronization failed. Your local data was kept.')}</span>
        <Button size="sm" disabled={serverSyncBusy} onClick={async () => {
          if (serverSyncPending.current) return
          serverSyncPending.current = true; setServerSyncBusy(true)
          try { await pullState() } finally { serverSyncPending.current = false; setServerSyncBusy(false) }
        }}>{t('Sync now')}</Button>
      </div>}
      <Row icon="history" title={t('Training history settings')} accessory="chevron" onClick={openTrainingHistory} />
      <Row icon="folder" iconTint="var(--blue)" title={t('Backup')} accessory="chevron" onClick={() => useUI.getState().openSheet(() => <BackupSheet onExport={doExport} onImport={() => authorize(() => fileRef.current?.click())} />)} />
      <Row icon="cloud" iconTint="var(--blue)" title={t('Restore')} subtitle={t('Back up, synchronize or restore your TGym data.')} accessory="chevron" onClick={() => openRestoreSheet(authorize)} />
      <Row icon="folder" iconTint="var(--acc)" title={t('Load Routine')} subtitle={t('Create, import or export routines from one place.')} accessory="chevron" onClick={openLoadRoutine} />
      {canUndoImport() && <Row icon="reset" iconTint="var(--orange)" title={t('Undo last import')} subtitle={t('Available until this app session ends.')} accessory="chevron" onClick={() => confirmSheet({ title: t('Undo last import?'), message: t('Restores the data that was present immediately before the import.'), confirmText: t('Restore'), onConfirm: () => {
        try { if (restoreImportUndo(replaceState)) toast(t('Import undone')) }
        catch { toast(t('Could not save. Check available storage and try again.')) }
      } })} />}
            <Row icon="globe" iconTint="var(--cyan)" title={t('Allow mobile data')} subtitle={t('Allow internet connection over mobile data when Wi-Fi is unavailable.')}>
        <Switch checked={!!S.allowMobileData} onChange={v => update(s => { s.allowMobileData = v })} />
      </Row>
      <Row icon="trash" iconTint="var(--red)" title={t('Reset everything')} danger onClick={() => authorize(() => confirmSheet({ title: t('Reset everything?'), message: t('Deletes your plan, workouts and body weight on this device. This cannot be undone.'), confirmText: t('Delete everything'), danger: true, onConfirm: () => { replaceState(JSON.parse(JSON.stringify(DEF)), true); nav('/home'); toast(t('All data reset')) } }))} />
    </Section>

    <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={doImport} />
    {/* Reset after reading so picking the same file twice still fires onChange. */}
    <input ref={importRef} type="file" accept=".csv,.xml,text/csv,text/xml" style={{ display: 'none' }}
      onChange={ev => { const f = ev.target.files[0]; if (f) importFromApp(f); ev.target.value = '' }} />

    {/* "Add to Home screen" makes no sense inside the native app */}
    {!MOBILE && <Section title={t('Tip')}>
      <Row icon="lightbulb" iconTint="var(--yellow)"
        title={IS_ANDROID ? t('In Chrome: ⋮ menu → Add to Home screen') : t('In Safari: Share → Add to Home Screen')}
        subtitle={t('to install TGym as a full-screen app.') + ' ' + (user ? t('Your data syncs with your profile — sign in anywhere to see it.') : t('Guest data stays on this device — export a backup now and then!'))} />
    </Section>}

    {/* The version, at the bottom of Settings — which is where the support template has been
        telling people to look for it, and where it was not. On the phone build there is no
        address bar and no about box, so without this there is no way to tell which build you
        are running, or whether an update actually installed. */}
    <div className="settings-credits dim small" style={{ textAlign: 'center', marginTop: 4, lineHeight: 1.6 }}>
      TGym v{__APP_VERSION__} · {t('free & open source (AGPL v3)')}<br />
      <UpdateCheckButton />
      {APP_REPOSITORY && <><a href={APP_REPOSITORY} target="_blank" rel="noopener">GitHub</a><br /></>}
      {t('Based on openGym')} · <a href={ORIGINAL_OPENGYM_REPOSITORY} target="_blank" rel="noopener">{t('original source')}</a> · exercise data: hasaneyldrm/exercises-dataset (MIT)<br />
      catalog exercise images and animations © <a href="https://gymvisual.com/" target="_blank" rel="noopener">Gym visual</a>
    </div>
  </div>
}

function RegisterInline({ close, setUser, pushState, pullState, toast }) {
  const nameRef = useRef(null)
  const [code, setCode] = useState('')
  const [inviteOnly, setInviteOnly] = useState(false)
  useEffect(() => { api('/api/config').then(c => setInviteOnly(!!c.invite_only)).catch(() => {}) }, [])
  const go = async () => {
    const n = (nameRef.current.value || '').trim()
    if (!n) { toast(t('Enter a name')); return }
    if (inviteOnly && !code.trim()) { toast(t('An invite code is required')); return }
    try {
      const u = await passkeyRegister(n, code.trim()); setUser(u); close()
      if (hasData(useStore.getState().S)) { await pushState({strict:true}); toast(t('Profile created — data moved into it')) }
      else { const synced = await pullState(); toast(synced === false ? t('Server synchronization failed. Your local data was kept.') : t('Welcome, {0}', u.name)) }
    } catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') toast(e.message || t('Registration failed')) }
  }
  return <>
    <h3>{t('Create your profile')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Pick a name, then confirm with your device.')}</div>
    <TextField ref={nameRef} placeholder={t('Your name')} maxLength={40} />
    {inviteOnly && <>
      <div style={{ height: 10 }} />
      <input className="input" placeholder={t('Invite code')} maxLength={40} value={code}
        onChange={e => setCode(e.target.value.toUpperCase())} style={{ letterSpacing: '.14em', fontWeight: 600, textAlign: 'center' }} />
      <div className="dim small" style={{ marginTop: 6 }}>{t('This app is invite-only — enter the code you were given.')}</div>
    </>}
    <div style={{ height: 12 }} /><Button variant="primary" onClick={go}>{t('Create passkey')}</Button>
  </>
}
