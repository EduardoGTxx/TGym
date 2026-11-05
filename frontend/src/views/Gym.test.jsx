// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import Gym from './Gym.jsx'
import { useStore } from '../store/useStore.js'

describe('Gym view', () => {
  it('renders Gym header, title, and Dribbble styled exercise cards', () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => {
      root.render(
        <MemoryRouter>
          <Gym />
        </MemoryRouter>
      )
    })

    const title = container.querySelector('.dribbble-gym-title')
    expect(title).not.toBeNull()
    expect(title.textContent).toBe('Gym')

    const backBtn = container.querySelector('.dribbble-back-btn')
    expect(backBtn).not.toBeNull()

    const bellBtn = container.querySelector('.dribbble-bell-btn')
    expect(bellBtn).not.toBeNull()

    const cards = container.querySelectorAll('.dribbble-gym-card')
    expect(cards.length).toBeGreaterThan(0)

    const badges = container.querySelectorAll('.dribbble-gym-badge')
    expect(badges.length).toBeGreaterThan(0)

    const fills = container.querySelectorAll('.dribbble-gym-fill')
    expect(fills.length).toBeGreaterThan(0)
  })

  it('renders resume card when a workout is active', () => {
    useStore.setState({
      S: {
        ...useStore.getState().S,
        active: {
          id: 'test-active',
          name: 'Active Push',
          entries: [{ id: '0025', sets: [] }]
        }
      }
    })

    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => {
      root.render(
        <MemoryRouter>
          <Gym />
        </MemoryRouter>
      )
    })

    const activeCard = container.querySelector('.dribbble-gym-active-card')
    expect(activeCard).not.toBeNull()
    expect(activeCard.textContent).toContain('Active Push')
  })
})
