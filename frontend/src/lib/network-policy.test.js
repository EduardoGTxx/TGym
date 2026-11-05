/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isNetworkPermitted, assertNetworkPermitted, setAllowMobilePolicy, getAllowMobilePolicy } from './network-policy.js'

describe('network-policy', () => {
  const originalNavigator = globalThis.navigator

  beforeEach(() => {
    setAllowMobilePolicy(false)
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    })
    setAllowMobilePolicy(null)
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('permits connection if allowMobileData is true regardless of connection type', async () => {
    setAllowMobilePolicy(true)
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true, connection: { type: 'cellular' } },
      configurable: true,
      writable: true,
    })
    expect(await isNetworkPermitted()).toBe(true)
  })

  it('blocks connection on cellular when allowMobileData is false', async () => {
    setAllowMobilePolicy(false)
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true, connection: { type: 'cellular' } },
      configurable: true,
      writable: true,
    })
    expect(await isNetworkPermitted()).toBe(false)
    await expect(assertNetworkPermitted()).rejects.toThrow('Mobile data is restricted')
  })

  it('permits connection on wifi when allowMobileData is false', async () => {
    setAllowMobilePolicy(false)
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true, connection: { type: 'wifi' } },
      configurable: true,
      writable: true,
    })
    expect(await isNetworkPermitted()).toBe(true)
    await expect(assertNetworkPermitted()).resolves.toBeUndefined()
  })

  it('permits connection on ethernet when allowMobileData is false', async () => {
    setAllowMobilePolicy(false)
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true, connection: { type: 'ethernet' } },
      configurable: true,
      writable: true,
    })
    expect(await isNetworkPermitted()).toBe(true)
  })

  it('blocks connection when navigator is offline', async () => {
    setAllowMobilePolicy(false)
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false, connection: { type: 'wifi' } },
      configurable: true,
      writable: true,
    })
    expect(await isNetworkPermitted()).toBe(false)
  })

  it('reads allowMobileData directly from localStorage when inMemoryPolicy is null', () => {
    setAllowMobilePolicy(null)
    localStorage.setItem('gym_state_v1', JSON.stringify({ allowMobileData: true }))
    expect(getAllowMobilePolicy()).toBe(true)
    localStorage.setItem('gym_state_v1', JSON.stringify({ allowMobileData: false }))
    expect(getAllowMobilePolicy()).toBe(false)
  })
})
