const { test, expect } = require('@playwright/test');

test('mobile visitors can open search and find a destination without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/');

    const searchButton = page.getByRole('button', {
        name: 'Search destinations, dates, and guests'
    });
    await expect(searchButton).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

    await searchButton.click();
    await expect(page.getByRole('dialog', { name: 'Search stays' })).toBeVisible();
    await expect(page.locator('#searchModal .demo-note')).toContainText(
        'live availability is not checked'
    );
    await page.locator('#searchDestination').fill('New York');
    await page.locator('#executeSearch').click();
    const newYorkListing = page.getByRole('group', {
        name: /Stay: Modern Downtown Apartment, New York City, NY/
    });
    await expect(newYorkListing).toBeVisible();
    await newYorkListing.click();
    await expect(page.locator('#reservationForm .demo-note')).toContainText(
        'This is not a booking or confirmation'
    );
    await expect(page.locator('#summaryNights')).toHaveText('Select dates to estimate');

    await page.locator('#bookingCheckIn').fill('2026-11-01');
    await page.locator('#bookingCheckOut').fill('2026-11-03');
    await expect(page.locator('#summaryNights')).toHaveText('$295 x 2 nights');
    await expect(page.locator('#summarySubtotal')).toHaveText('$590');
    await expect(page.locator('#summaryCleaningFee')).toHaveText('$50');
    await expect(page.locator('#summaryServiceFee')).toHaveText('$71');
    await expect(page.locator('#summaryTotal')).toHaveText('$711');

    await page.locator('#bookingCheckOut').fill('2026-11-04');
    await expect(page.locator('#summaryNights')).toHaveText('$295 x 3 nights');
    await expect(page.locator('#summaryTotal')).toHaveText('$1,041');
});

test('signed-in favorites sync to the account and sign-out restores the signed-out menu', async ({ page }) => {
    await page.route(
        'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm',
        route => route.fulfill({
            status: 200,
            contentType: 'application/javascript',
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: `
                export function createClient() {
                    let user = null;
                    const listeners = [];
                    const notify = event => listeners.forEach(listener => listener(event, user ? { user } : null));
                    const auth = {
                        onAuthStateChange(listener) {
                            listeners.push(listener);
                            queueMicrotask(() => listener('INITIAL_SESSION', user ? { user } : null));
                            return { data: { subscription: { unsubscribe() {} } } };
                        },
                        async getUser() {
                            return { data: { user }, error: null };
                        },
                        async signInWithPassword({ email }) {
                            user = { email, user_metadata: { display_name: 'Test Guest' } };
                            notify('SIGNED_IN');
                            return { error: null };
                        },
                        async updateUser({ data }) {
                            user.user_metadata = data;
                            notify('USER_UPDATED');
                            return { data: { user }, error: null };
                        },
                        async signOut() {
                            user = null;
                            notify('SIGNED_OUT');
                            return { error: null };
                        }
                    };
                    window.__airBreakfastSupabaseMock = { getUser: () => user };
                    return { auth };
                }
            `
        })
    );
    await page.goto('/');
    await page.locator('#userMenu').click();
    await page.locator('#loginBtn').click();
    await expect(page.locator('.auth-subtitle')).toHaveText('Sign in with your email and password.');
    await expect(page.locator('.auth-divider')).toBeHidden();
    await expect(page.locator('.auth-options')).toBeHidden();
    await expect(page.locator('#googleAuth')).toBeAttached();
    await expect(page.locator('#googleAuth')).toBeHidden();

    await page.locator('#authEmail').fill('guest@example.test');
    await page.locator('#authPassword').fill('test-password');
    await page.locator('#authForm button[type="submit"]').click();

    await expect(page.locator('#userMenu')).toHaveAttribute(
        'aria-label',
        'Account menu for guest@example.test'
    );
    await page.locator('.listing-favorite').first().click();
    await expect.poll(async () => page.evaluate(() => (
        window.__airBreakfastSupabaseMock.getUser()?.user_metadata.saved_properties?.length
    ))).toBe(1);

    await page.locator('#userMenu').click();
    await page.locator('#signOutBtn').click();
    await expect(page.locator('#loginBtn')).toHaveJSProperty('hidden', false);
    await page.locator('#userMenu').click();
    await expect(page.locator('#loginBtn')).toBeVisible();
    await expect(page.locator('#signOutBtn')).toBeHidden();
});
