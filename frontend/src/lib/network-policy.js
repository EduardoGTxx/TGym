import { registerPlugin } from '@capacitor/core'

const Installer = registerPlugin('AppInstaller')

let inMemoryPolicy = null

export function setAllowMobilePolicy(enabled) {
  inMemoryPolicy = typeof enabled === 'boolean' ? enabled : null
}

export function getAllowMobilePolicy() {
  if (inMemoryPolicy !== null) return inMemoryPolicy
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem('gym_state_v1')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed?.allowMobileData === 'boolean') return parsed.allowMobileData
      }
    } catch (_) {}
  }
  return false
}

/**
 * Checks whether internet access is permitted under the current connection and mobile data preference.
 * Defaults to false for mobile data: internet access is only allowed when on Wi-Fi/unmetered,
 * unless the user explicitly toggles allowMobileData to true in Settings.
 */
export async function isNetworkPermitted(allowMobileOverride) {
  const allowMobile = allowMobileOverride ?? getAllowMobilePolicy()
  if (allowMobile) return true

  // 1. Native Capacitor on Android: ask the AppInstaller plugin for ConnectivityManager status
  try {
    if (typeof Installer?.getNetworkStatus === 'function') {
      const status = await Installer.getNetworkStatus()
      if (status && typeof status.connected === 'boolean') {
        if (!status.connected) return false
        if (status.isCellular && !status.isWifi) return false
        return !!status.isWifi
      }
    }
  } catch (_) {
    // Native plugin call failed or not running in native app
  }

  // 2. Web / PWA Network Information API
  if (typeof navigator !== 'undefined') {
    if (navigator.onLine === false) return false
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (conn) {
      if (conn.type === 'cellular') return false
      if (conn.type === 'wifi' || conn.type === 'ethernet') return true
    }
  }

  return true
}

export async function assertNetworkPermitted(allowMobileOverride) {
  const permitted = await isNetworkPermitted(allowMobileOverride)
  if (!permitted) {
    const error = new Error('Mobile data is restricted: Wi-Fi connection required')
    error.code = 'MOBILE_DATA_RESTRICTED'
    throw error
  }
}
