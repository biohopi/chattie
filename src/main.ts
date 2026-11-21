import * as THREE from 'three';
import './styles.css';

type Screen = 'launch' | 'offline' | 'online' | 'settings' | 'customize' | 'match';
type Quality = 'auto' | 'low' | 'balanced' | 'high';

class MenuWorld {
  private renderer: THREE.WebGLRenderer | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180);
  private readonly skyline = new THREE.Group();
  private observer: ResizeObserver | null = null;
  private frame = 0;
  private clock = new THREE.Clock();
  private disposed = false;
  private readonly root = document.querySelector<HTMLElement>('#scene');

  constructor(private quality: Quality = 'auto') {}

  initialize(): boolean {
    if (!this.root) return false;
    try {
      const antialias = this.quality === 'high';
      this.renderer = new THREE.WebGLRenderer({ antialias, alpha: true, powerPreference: 'high-performance', stencil: false });
      this.applyPixelRatio();
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.08;
      this.root.appendChild(this.renderer.domElement);
      this.scene.background = new THREE.Color('#111c25');
      this.scene.fog = new THREE.FogExp2('#111c25', 0.018);
      this.camera.position.set(0, 5.2, 17);
      this.camera.lookAt(0, 1.5, -8);
      this.buildEnvironment();
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(this.root);
      this.resize();
      this.animate();
      return true;
    } catch (error) {
      console.warn('3D environment unavailable; interface remains active.', error);
      this.dispose();
      return false;
    }
  }

  setQuality(quality: Quality): void {
    this.quality = quality;
    this.applyPixelRatio();
    this.resize();
  }

  private applyPixelRatio(): void {
    if (!this.renderer) return;
    const cap = this.quality === 'high' ? 1.6 : this.quality === 'low' ? 1 : 1.25;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
  }

  private buildEnvironment(): void {
    this.scene.add(new THREE.HemisphereLight(0x9bb7c5, 0x18221e, 2));
    const sun = new THREE.DirectionalLight(0xffd0a0, 3.2);
    sun.position.set(-12, 18, 8);
    this.scene.add(sun);

    const geometry = new THREE.PlaneGeometry(180, 180, 48, 48);
    const vertices = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i);
      vertices.setZ(i, Math.sin(x * .075) * 1.1 + Math.cos(y * .052) * 1.4 + Math.sin(x * .21 + y * .13) * .22);
    }
    geometry.computeVertexNormals();
    const ground = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x4a5549, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -1.4, -30);
    this.scene.add(ground);

    const ridgeMaterial = new THREE.MeshStandardMaterial({ color: 0x263b3c, roughness: 1 });
    for (let i = 0; i < 9; i++) {
      const ridge = new THREE.Mesh(new THREE.ConeGeometry(9 + (i % 3) * 3, 9 + (i % 4) * 2, 5), ridgeMaterial);
      ridge.position.set((i - 4) * 13 + (i % 2) * 5, -.2, -47 - (i % 3) * 10);
      ridge.rotation.y = i * .72;
      this.skyline.add(ridge);
    }
    this.scene.add(this.skyline);

    const haze = new THREE.Mesh(new THREE.PlaneGeometry(150, 20),
      new THREE.MeshBasicMaterial({ color: 0xc18d68, transparent: true, opacity: .1, depthWrite: false }));
    haze.position.set(0, 3, -34);
    this.scene.add(haze);

    const count = this.quality === 'low' ? 100 : 220;
    const points = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      points[i * 3] = (Math.random() - .5) * 55;
      points[i * 3 + 1] = Math.random() * 12 - 1;
      points[i * 3 + 2] = -Math.random() * 55;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    this.scene.add(new THREE.Points(dustGeometry, new THREE.PointsMaterial({
      color: 0xd4b18b, size: .055, transparent: true, opacity: .48,
    })));
  }

  private resize(): void {
    if (!this.renderer || !this.root) return;
    const width = Math.max(1, this.root.clientWidth || innerWidth);
    const height = Math.max(1, this.root.clientHeight || innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private animate = (): void => {
    if (this.disposed || !this.renderer) return;
    this.frame = requestAnimationFrame(this.animate);
    const t = this.clock.getElapsedTime();
    this.camera.position.x = Math.sin(t * .075) * .7;
    this.camera.position.y = 5.2 + Math.sin(t * .11) * .12;
    this.camera.lookAt(0, 1.4, -8);
    this.skyline.rotation.y = Math.sin(t * .025) * .012;
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.renderer = null;
  }
}

class Application {
  private screen: Screen = 'launch';
  private teams = 2;
  private bots = 0;
  private world = new MenuWorld();
  private readonly app = document.querySelector<HTMLElement>('#app')!;

  constructor() {
    this.world.initialize();
    this.bindEvents();
    this.syncOrientation();
    addEventListener('orientationchange', this.syncOrientation);
    addEventListener('resize', this.syncOrientation);
    this.show('launch');
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
    quality?.addEventListener('change', () => this.world.setQuality((quality.value || 'auto') as Quality));
    const sensitivity = document.querySelector<HTMLInputElement>('#sensitivity');
    sensitivity?.addEventListener('input', () => {
      document.querySelector<HTMLOutputElement>('#sensitivity-value')!.value = sensitivity.value;
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.world.dispose();
      else if (this.screen !== 'match') this.restoreWorld();
    });
  }

  private show(next: Screen): void {
    this.screen = next;
    document.querySelectorAll<HTMLElement>('#app > .panel, #app > .hero').forEach((node) => node.classList.add('hidden'));
    const selector = next === 'launch' ? '#launch-screen' : `#${next}-screen`;
    document.querySelector<HTMLElement>(selector)?.classList.remove('hidden');
    document.body.classList.toggle('in-match', next === 'match');
    if (next === 'match') this.world.dispose();
    else this.restoreWorld();
  }

  private restoreWorld(): void {
    if (!document.querySelector('#scene canvas')) {
      const quality = (document.querySelector<HTMLSelectElement>('#quality-select')?.value || 'auto') as Quality;
      this.world = new MenuWorld(quality);
      this.world.initialize();
    }
  }

  private step(key: string, delta: number): void {
    if (key === 'teams') this.teams = THREE.MathUtils.clamp(this.teams + delta, 2, 8);
    if (key === 'bots') this.bots = THREE.MathUtils.clamp(this.bots + delta, 0, 24);
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
