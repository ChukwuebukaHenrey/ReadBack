import type { Page } from '@playwright/test';

export type ViewName = 'Dashboard' | 'Wallet' | 'Send SOL' | 'Activity' | 'Contacts' | 'Learn' | 'Settings';
/** Navigate like a person on this screen size: sidebar on desktop, tab bar (and More) on phones. */
export async function goTo(page: Page, view: ViewName) {
  const side = page.getByRole('navigation', { name: 'Main navigation' });
  if (await side.isVisible()) return side.getByRole('button', { name: view, exact: true }).click();
  const tabs = page.getByRole('navigation', { name: 'Tab navigation' });
  const tab = view === 'Dashboard' ? 'Home' : view;
  if (['Home', 'Activity', 'Send SOL', 'Contacts'].includes(tab)) return tabs.getByRole('button', { name: tab, exact: true }).click();
  await tabs.getByRole('button', { name: 'More' }).click();
  await tabs.getByRole('button', { name: view, exact: true }).click();
}
export const pickContact = (page: Page, name: string) => page.getByRole('radio', { name: new RegExp(`^${name} `) }).check();
