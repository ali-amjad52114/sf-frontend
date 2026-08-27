import { test, expect, type Page } from '@playwright/test'

/**
 * These run against the real Contacts API, so every test invents its own
 * contact (unique email per browser project + run) and cleans up after itself.
 */

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}

async function createContact(
  page: Page,
  fields: { first: string; last: string; email: string; company?: string },
) {
  await page.goto('/contacts/new')
  await page.getByLabel('First name').fill(fields.first)
  await page.getByLabel('Last name').fill(fields.last)
  await page.getByLabel('Email', { exact: false }).first().fill(fields.email)
  if (fields.company) await page.getByLabel('Company').fill(fields.company)
  await page.getByRole('button', { name: 'Create contact' }).click()

  await expect(
    page.getByRole('heading', { level: 1, name: `${fields.first} ${fields.last}` }),
  ).toBeVisible()
}

async function deleteFromDetailPage(page: Page, fullName: string) {
  await page.getByRole('button', { name: `Delete ${fullName}` }).click()
  await page.getByRole('button', { name: `Confirm deleting ${fullName}` }).click()
  await expect(page).toHaveURL(/\/contacts\/?(\?.*)?$/)
}

test.describe('Contacts', () => {
  test('the root path lands on the contacts list', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/contacts\/?$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Contacts' })).toBeVisible()
  })

  test('the list reports a healthy API', async ({ page }) => {
    await page.goto('/contacts')
    await expect(page.getByText(/^api ok/)).toBeVisible()
  })

  test('creates, finds, edits and deletes a contact', async ({ page }) => {
    const email = uniqueEmail('crud')
    const last = `Crud${Date.now().toString().slice(-6)}`

    await createContact(page, {
      first: 'Testy',
      last,
      email,
      company: 'Playwright Inc',
    })
    await expect(page.getByRole('link', { name: email })).toBeVisible()
    await expect(page.getByText('Playwright Inc').first()).toBeVisible()

    // Search narrows the list to the new contact.
    await page.goto('/contacts')
    await page.getByRole('searchbox').fill(last)
    await expect(page).toHaveURL(new RegExp(`q=${last}`))
    await expect(
      page.getByRole('link', { name: `Testy ${last}`, exact: true }),
    ).toBeVisible()

    // Edit it.
    await page.getByRole('link', { name: `Edit Testy ${last}` }).click()
    await page.getByLabel('Job title').fill('Chief Engineer')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('Chief Engineer').first()).toBeVisible()

    await deleteFromDetailPage(page, `Testy ${last}`)

    // And it is gone.
    await page.goto(`/contacts?q=${last}`)
    await expect(page.getByRole('heading', { name: 'No matching contacts' })).toBeVisible()
  })

  test('creates and edits a multi-address contact through the real API', async ({ page }) => {
    const email = uniqueEmail('addresses')
    const last = `Addresses${Date.now().toString().slice(-6)}`

    await page.goto('/contacts/new')
    await page.getByLabel('First name').fill('Address')
    await page.getByLabel('Last name').fill(last)
    await page.getByLabel('Email', { exact: false }).first().fill(email)
    await page.getByRole('button', { name: 'Add address' }).click()
    await page.getByLabel('Address type').selectOption('Home')
    await page.getByLabel('Street address').fill('1 Create Way')
    await page.getByLabel('City').fill('San Francisco')
    await page.getByLabel('State / region').fill('CA')
    await page.getByLabel('Postal code').fill('94105')
    await page.getByLabel('Country').fill('USA')
    await page.getByRole('button', { name: 'Create contact' }).click()

    const fullName = `Address ${last}`
    await expect(page.getByRole('heading', { level: 1, name: fullName })).toBeVisible()
    await expect(page.getByText('Home', { exact: true })).toBeVisible()
    await expect(page.getByText('1 Create Way, San Francisco, CA 94105, USA')).toBeVisible()

    await page.getByRole('link', { name: 'Edit' }).click()
    await page.getByLabel('Address type').selectOption('Work')
    await page.getByLabel('Street address').fill('2 Update Road')
    await page.getByRole('button', { name: 'Save changes' }).click()

    await expect(page.getByText('Work', { exact: true })).toBeVisible()
    await expect(page.getByText('2 Update Road, San Francisco, CA 94105, USA')).toBeVisible()
    await deleteFromDetailPage(page, fullName)
  })

  test('creates and retains a base64 photo through a PUT edit', async ({ page }) => {
    const email = uniqueEmail('photo')
    const last = `Photo${Date.now().toString().slice(-6)}`

    await page.goto('/contacts/new')
    await page.getByLabel('First name').fill('Photo')
    await page.getByLabel('Last name').fill(last)
    await page.getByLabel('Email', { exact: false }).first().fill(email)
    await page.getByLabel('Upload photo').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL7DwAAAABJRU5ErkJggg==',
        'base64',
      ),
    })
    await expect(page.getByRole('button', { name: 'Create contact' })).toBeEnabled()
    await page.getByRole('button', { name: 'Create contact' }).click()

    const avatar = page.locator('header img')
    await expect(avatar).toHaveAttribute('src', /^data:image\/png;base64,/)
    const originalPhoto = await avatar.getAttribute('src')

    await page.getByRole('link', { name: 'Edit' }).click()
    await page.getByLabel('Job title').fill('Photo Engineer')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(avatar).toHaveAttribute('src', originalPhoto!)

    await deleteFromDetailPage(page, `Photo ${last}`)
  })

  test('rejects a duplicate email with a field-level error', async ({ page }) => {
    const email = uniqueEmail('dupe')
    const last = `Dupe${Date.now().toString().slice(-6)}`

    await createContact(page, { first: 'First', last, email })

    await page.goto('/contacts/new')
    await page.getByLabel('First name').fill('Second')
    await page.getByLabel('Last name').fill(last)
    await page.getByLabel('Email', { exact: false }).first().fill(email.toUpperCase())
    await page.getByRole('button', { name: 'Create contact' }).click()

    await expect(page.getByText(/already/i).first()).toBeVisible()
    await expect(page).toHaveURL(/\/contacts\/new/)

    await page.goto(`/contacts?q=${last}`)
    await page.getByRole('link', { name: `First ${last}`, exact: true }).click()
    await deleteFromDetailPage(page, `First ${last}`)
  })

  test('validates required fields before calling the API', async ({ page }) => {
    await page.goto('/contacts/new')
    await page.getByLabel('First name').fill('OnlyFirst')
    await page.getByRole('button', { name: 'Create contact' }).click()

    await expect(page.getByText('Please fix the highlighted fields.')).toBeVisible()
    await expect(page.getByText('Last name is required')).toBeVisible()
    await expect(page.getByText('Email is required')).toBeVisible()
  })

  test('sorting is a link and survives a reload', async ({ page }) => {
    await page.goto('/contacts')
    await page.getByRole('columnheader', { name: /email/i }).getByRole('link').click()

    await expect(page).toHaveURL(/sort=email/)
    await expect(page.getByRole('columnheader', { name: /email/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )

    await page.reload()
    await expect(page.getByRole('columnheader', { name: /email/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
  })

  test('an unknown contact renders the 404 page', async ({ page }) => {
    const response = await page.goto('/contacts/99999999')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'Not found' })).toBeVisible()
  })

  test('theme toggle switches themes', async ({ page }) => {
    await page.goto('/contacts')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'dark')

    await page.getByRole('button', { name: /switch to light mode/i }).click()
    await expect(html).toHaveAttribute('data-theme', 'light')
  })

  test('mobile viewport renders the list', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/contacts')
    await expect(page.getByRole('heading', { level: 1, name: 'Contacts' })).toBeVisible()
  })
})
