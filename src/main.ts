import './styles.css';
import type { MenuWorld, Quality } from './rendering/menu-world';

type Screen = 'launch' | 'offline' | 'online' | 'settings' | 'customize' | 'match';

class Application {
  private screen: Screen = 'launch';
  private teams = 2;
  private bots = 0;
  private world: MenuWorld | null = null;
  private worldLoad: Promise<void> | null = null;
  private readonly app = document.querySelector<HTMLElement>('#app')!;

  constructor() {
    this.bindEvents();
    this.syncOrientation();
    addEventListener('orientationchange', this.syncOrientation);
    addEventListener('resize', this.syncOrientation);
    this.show('launch');
    void this.restoreWorld();
  }

  private bindEvents(): void {
    this.app.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-screen], [data-action], [data-step]');
      if (!target) return;
      if (target.dataset.screen) this.show(target.dataset.screen as Screen);
      if (target.dataset.action) void this.handleAction(target.dataset.action);
      if (target.dataset.step) this.step(target.dataset.step, Number(target.dataset.delta));
    });

    const quality = document.querySelector<HTMLSelectElement>('#quality-select');
    quality?.addEventListener('change', () => { void this.restoreWorld().then(() => this.world?.setQuality((quality.value || 'auto') as Quality)); });
    const sensitivity = document.querySelector<HTMLInputElement>('#sensitivity');
    sensitivity?.addEventListener('input', () => {
      document.querySelector<HTMLOutputElement>('#sensitivity-value')!.value = sensitivity.value;
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.world?.dispose(); this.world = null; }
      else if (this.screen !== 'match') void this.restoreWorld();
    });
  }

  private show(next: Screen): void {
    this.screen = next;
    document.querySelectorAll<HTMLElement>('#app > .panel, #app > .hero').forEach((node) => node.classList.add('hidden'));
    const selector = next === 'launch' ? '#launch-screen' : `#${next}-screen`;
    document.querySelector<HTMLElement>(selector)?.classList.remove('hidden');
    document.body.classList.toggle('in-match', next === 'match');
    if (next === 'match') { this.world?.dispose(); this.world = null; }
    else void this.restoreWorld();
  }

  private async restoreWorld(): Promise<void> {
    if (this.world || this.worldLoad || document.hidden || this.screen === 'match') return;
    this.worldLoad = import('./rendering/menu-world').then(({ MenuWorld }) => {
      if (document.hidden || this.screen === 'match') return;
      const quality = (document.querySelector<HTMLSelectElement>('#quality-select')?.value || 'auto') as Quality;
      this.world = new MenuWorld(quality);
      this.world.initialize();
    }).finally(() => { this.worldLoad = null; });
    await this.worldLoad;
  }

  private step(key: string, delta: number): void {
    if (key === 'teams') this.teams = Math.min(8, Math.max(2, this.teams + delta));
    if (key === 'bots') this.bots = Math.min(24, Math.max(0, this.bots + delta));
    const value = key === 'teams' ? this.teams : this.bots;
    document.querySelector<HTMLOutputElement>(`#${key}-value`)!.value = String(value);
  }

  private async handleAction(action: string): Promise<void> {
    if (action === 'fullscreen') {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
      } catch { this.toast('Fullscreen is not available in this browser.'); }
    }
    if (action === 'start-match') {
      document.querySelector('#match-summary')!.textContent =
        `${this.teams} teams · ${this.bots} bots per team · gameplay systems are the next milestone.`;
      this.show('match');
    }
    if (action === 'end-match') this.show('launch');
    if (action === 'pause') this.toast('Pause overlay will arrive with the match HUD milestone.');
  }

  private toast(message: string): void {
    let toast = document.querySelector<HTMLElement>('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      this.app.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    window.setTimeout(() => toast?.classList.remove('visible'), 2600);
  }

  private syncOrientation = (): void => {
    document.querySelector<HTMLElement>('#orientation-gate')
      ?.classList.toggle('visible', innerHeight > innerWidth && innerWidth < 900);
  };
}

new Application();
