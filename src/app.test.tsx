import { expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/preact'
import { App } from './app'

test('默认在挑页；底部 4 Tab；⚙ 打开设置页', async () => {
  render(<App />)
  expect(await screen.findByText(/已评估 0\/\d+/)).toBeTruthy()
  expect(screen.getByRole('navigation').querySelectorAll('button')).toHaveLength(4)
  fireEvent.click(screen.getByLabelText('设置'))
  expect(await screen.findByText('不做（0）')).toBeTruthy()
})
