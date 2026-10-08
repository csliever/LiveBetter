import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { App } from './app'

test('renders app title', () => {
  render(<App />)
  expect(screen.getByText('LiveBetter')).toBeTruthy()
})
