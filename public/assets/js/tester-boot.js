/**
 * Puts the tester ribbon on every screen: vigia.js adds this module to every page but the panel.
 * With a lab key it shows the ribbon in the page's language; tester-ribbon.js hides it while a game
 * is being played. Launched 2026-11-02, its flag gate removed. lab: #seccion-tester-ribbon
 */
import { labAccess } from './lab-access.js';

if (await labAccess().catch(() => false)) {
  const { testerRibbon } = await import('./tester-ribbon.js');
  const lang = (document.documentElement.lang || 'es').slice(0, 2);
  testerRibbon({ lang });
}
