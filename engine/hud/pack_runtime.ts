/**
 * AUTUS PackRuntime v1.0
 * Three.js 기반 Pack 렌더 인터페이스
 */

// === Types ===
interface Uniform {
  u_time: number;
  u_energy: number;
  u_flow: number;
  u_risk: number;
  u_entropy: number;
  u_pressure: number;
  u_glowGain: number;
  u_noiseGain: number;
  u_alert: number;
}

interface PackSpec {
  id: string;
  layer: 'HUDLayer' | 'DataLayer' | 'AlertLayer';
  primitives: string[];
  params: Record<string, any>;
  inputs?: Record<string, string>;
  outputs?: Record<string, boolean | string[]>;
}

interface Slot {
  pack: string;
  size: string;
}

interface PageConfig {
  name: string;
  slots: {
    MAIN: Slot;
    LEFT: Slot;
    RIGHT: Slot;
    BOTTOM: Slot;
  };
}

// === Pack Base Class ===
abstract class BasePack {
  protected scene: THREE.Scene;
  protected uniforms: Uniform;
  protected spec: PackSpec;

  constructor(scene: THREE.Scene, spec: PackSpec) {
    this.scene = scene;
    this.spec = spec;
    this.uniforms = this.createUniforms();
  }

  protected createUniforms(): Uniform {
    return {
      u_time: 0,
      u_energy: 0.5,
      u_flow: 0.3,
      u_risk: 0.2,
      u_entropy: 0.1,
      u_pressure: 0.1,
      u_glowGain: 0.5,
      u_noiseGain: 0.1,
      u_alert: 0
    };
  }

  abstract init(): void;
  abstract update(dt: number, state: Partial<Uniform>): void;
  abstract dispose(): void;
}

// === Pack Registry ===
class PackRegistry {
  private packs: Map<string, typeof BasePack> = new Map();

  register(id: string, packClass: typeof BasePack): void {
    this.packs.set(id, packClass);
  }

  create(id: string, scene: THREE.Scene, spec: PackSpec): BasePack | null {
    const PackClass = this.packs.get(id);
    if (!PackClass) return null;
    return new (PackClass as any)(scene, spec);
  }
}

// === Page Manager ===
class PageManager {
  private pages: Map<string, PageConfig> = new Map();
  private activePage: string = '';
  private activePacks: BasePack[] = [];

  constructor(private scene: THREE.Scene, private registry: PackRegistry) {}

  loadPage(pageId: string, config: PageConfig): void {
    this.pages.set(pageId, config);
  }

  switchTo(pageId: string): void {
    // Dispose current
    this.activePacks.forEach(p => p.dispose());
    this.activePacks = [];

    // Load new
    const config = this.pages.get(pageId);
    if (!config) return;

    this.activePage = pageId;

    Object.entries(config.slots).forEach(([slotName, slot]) => {
      const pack = this.registry.create(slot.pack, this.scene, {
        id: slot.pack,
        layer: 'HUDLayer',
        primitives: [],
        params: {}
      });
      if (pack) {
        pack.init();
        this.activePacks.push(pack);
      }
    });
  }

  update(dt: number, state: Partial<Uniform>): void {
    this.activePacks.forEach(p => p.update(dt, state));
  }
}

// === Render Loop ===
class PackRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private pageManager: PageManager;
  private lastTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);

    const registry = new PackRegistry();
    this.pageManager = new PageManager(this.scene, registry);
  }

  start(): void {
    const animate = (time: number) => {
      const dt = (time - this.lastTime) / 1000;
      this.lastTime = time;

      this.pageManager.update(dt, {});
      this.renderer.render(this.scene, this.camera);

      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h);
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }
}

export { BasePack, PackRegistry, PageManager, PackRenderer, Uniform, PackSpec };
