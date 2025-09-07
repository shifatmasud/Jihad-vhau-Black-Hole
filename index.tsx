// Fix: The previous named imports for Three.js were causing module resolution errors.
// Switched to a namespace import (`import * as THREE from 'three'`) which is a more robust
// way to import Three.js and resolves the "has no exported member" errors.
// All Three.js types and classes have been prefixed with `THREE.` accordingly.
import * as THREE from 'three';
import { raymarcherFragmentShader } from './modules/shaders/raymarcher.ts';

class App {
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private renderer: THREE.WebGLRenderer;
    private material: THREE.ShaderMaterial;
    private clock: THREE.Clock;

    // Interaction state
    private isDragging: boolean = false;
    private dragStart: THREE.Vector2 = new THREE.Vector2();
    private rotation: THREE.Vector2 = new THREE.Vector2(0.2, 0); // initial pitch, yaw
    private targetRotation: THREE.Vector2 = new THREE.Vector2(0.2, 0);
    private zoom: number = 15.0;
    private targetZoom: number = 15.0;
    private canvas: HTMLCanvasElement;

    constructor() {
        this.canvas = document.querySelector('#webgl-canvas') as HTMLCanvasElement;
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
        this.clock = new THREE.Clock();

        this.init();
    }

    private init(): void {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        const planeGeometry = new THREE.PlaneGeometry(2, 2);

        // Load texture for the shader's iChannel0 (nebula background)
        const textureLoader = new THREE.TextureLoader();
        const nebulaTexture = textureLoader.load('https://threejs.org/examples/textures/cube/MilkyWay/dark-s_px.jpg');
        nebulaTexture.wrapS = THREE.RepeatWrapping;
        nebulaTexture.wrapT = THREE.RepeatWrapping;

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                iTime: { value: 0.0 },
                iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                iRotation: { value: this.rotation },
                iZoom: { value: this.zoom },
                iChannel0: { value: nebulaTexture },
            },
            vertexShader: `
                void main() {
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: raymarcherFragmentShader,
        });

        const mesh = new THREE.Mesh(planeGeometry, this.material);
        this.scene.add(mesh);
        
        // Bind event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        window.addEventListener('mouseleave', this.onMouseUp.bind(this)); // End drag if mouse leaves window
        window.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        
        this.animate();
    }

    private onWindowResize(): void {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
    }
    
    private onMouseDown(event: MouseEvent): void {
        this.isDragging = true;
        this.canvas.style.cursor = 'grabbing';
        this.dragStart.set(event.clientX, event.clientY);
        // Add move listener only when dragging
        window.addEventListener('mousemove', this.onDragMove);
    }
    
    // Use an arrow function property to automatically bind `this` for the event listener
    private onDragMove = (event: MouseEvent): void => {
        if (!this.isDragging) return;

        const deltaX = event.clientX - this.dragStart.x;
        const deltaY = event.clientY - this.dragStart.y;
        
        // Update target rotation based on drag delta (inverted)
        this.targetRotation.y -= deltaX * 0.005;
        this.targetRotation.x -= deltaY * 0.005;

        // Clamp pitch to avoid flipping upside down
        this.targetRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotation.x));

        // Update drag start for the next frame
        this.dragStart.set(event.clientX, event.clientY);
    }

    private onMouseUp(): void {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
            // Remove move listener when not dragging
            window.removeEventListener('mousemove', this.onDragMove);
        }
    }

    private onWheel(event: WheelEvent): void {
        event.preventDefault();
        this.targetZoom += event.deltaY * 0.05; // Increased from 0.02
        // Clamp zoom level
        this.targetZoom = Math.max(5.0, Math.min(50.0, this.targetZoom));
    }

    private animate(): void {
        requestAnimationFrame(this.animate.bind(this));

        const easing = 0.3; // Increased from 0.08 for faster response
        // Ease current values towards targets for smooth animation
        this.rotation.x += (this.targetRotation.x - this.rotation.x) * easing;
        this.rotation.y += (this.targetRotation.y - this.rotation.y) * easing;
        this.zoom += (this.targetZoom - this.zoom) * easing;
        
        this.material.uniforms.iTime.value = this.clock.getElapsedTime();
        this.material.uniforms.iRotation.value.copy(this.rotation);
        this.material.uniforms.iZoom.value = this.zoom;
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Global styles to ensure canvas fills the screen
const style = document.createElement('style');
style.innerHTML = `
    body {
        margin: 0;
        overflow: hidden;
        background-color: #000;
    }
    canvas {
        display: block;
        cursor: grab;
    }
`;
document.head.appendChild(style);

new App();