import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {
  test('displays hero content', async ({ page }) => {
    // Assumes the Next.js app is running on http://localhost:3000 during test execution.
    await page.goto('http://localhost:3000/')

    await expect(page.getByRole('heading', { name: 'A minimal canvas for cinematic storytelling' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start Building' })).toBeVisible()
  })

  test('lists primary landing features', async ({ page }) => {
    await page.goto('http://localhost:3000/#features')

    await expect(page.getByRole('heading', { name: 'Designed for creators who value clarity' })).toBeVisible()
    await expect(page.getByLabel('AI-assisted storyboard')).toBeVisible()
    await expect(page.getByLabel('Intentional workspace')).toBeVisible()
    await expect(page.getByLabel('Less manual work')).toBeVisible()
  })
})

