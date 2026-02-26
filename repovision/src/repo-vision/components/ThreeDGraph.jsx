import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const ThreeDGraphViewer = ({ data }) => {
    const containerRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const sceneRef = useRef(null);
    const [focus, setFocus] = useState('all');

    useEffect(() => {
        if (!containerRef.current || !data?.graph?.nodes) return;

        // Clear previous content
        while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
        }

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0e27);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 3000);
        camera.position.set(0, 0, 320);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.sortObjects = true;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Create detailed globe with continents
        const createGlobe = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 4096;
            canvas.height = 2048;
            const ctx = canvas.getContext('2d');

            // Ocean
            ctx.fillStyle = '#0d1b2a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Add stars
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 1000; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = Math.random() * 1.5;
                ctx.fillRect(x, y, size, size);
            }

            // Continents with better detail
            ctx.fillStyle = '#1a4d3e';
            const continents = [
                // North America
                { x: 0.15, y: 0.15, w: 0.15, h: 0.25 },
                // South America
                { x: 0.2, y: 0.5, w: 0.08, h: 0.2 },
                // Europe
                { x: 0.4, y: 0.1, w: 0.1, h: 0.15 },
                // Africa
                { x: 0.4, y: 0.3, w: 0.12, h: 0.28 },
                // Asia
                { x: 0.55, y: 0.15, w: 0.28, h: 0.3 },
                // Australia
                { x: 0.75, y: 0.55, w: 0.08, h: 0.12 },
            ];

            continents.forEach(cont => {
                ctx.fillRect(
                    cont.x * canvas.width,
                    cont.y * canvas.height,
                    cont.w * canvas.width,
                    cont.h * canvas.height
                );
            });

            // Grid lines
            ctx.strokeStyle = 'rgba(100, 150, 180, 0.2)';
            ctx.lineWidth = 1;

            for (let i = 0; i <= 24; i++) {
                ctx.beginPath();
                ctx.moveTo((i / 24) * canvas.width, 0);
                ctx.lineTo((i / 24) * canvas.width, canvas.height);
                ctx.stroke();
            }

            for (let i = 0; i <= 12; i++) {
                ctx.beginPath();
                ctx.moveTo(0, (i / 12) * canvas.height);
                ctx.lineTo(canvas.width, (i / 12) * canvas.height);
                ctx.stroke();
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.LinearFilter;
            const geometry = new THREE.SphereGeometry(150, 128, 64);
            const material = new THREE.MeshPhongMaterial({
                map: texture,
                emissive: 0x0a1a2e,
                emissiveIntensity: 0.4,
            });

            return new THREE.Mesh(geometry, material);
        };

        const globe = createGlobe();
        const globeGroup = new THREE.Group();
        globeGroup.add(globe);
        scene.add(globeGroup);

        // Create two main groups for side-by-side view
        const frontendGroup = new THREE.Group();
        const backendGroup = new THREE.Group();

        frontendGroup.position.x = 280;
        backendGroup.position.x = -280;

        globeGroup.add(frontendGroup);
        globeGroup.add(backendGroup);

        const createDecoratedGlobe = (color, title) => {
            const g = new THREE.Group();

            // Core Sphere
            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(140, 64, 32),
                new THREE.MeshPhongMaterial({
                    color: 0x0a1a2e,
                    emissive: color,
                    emissiveIntensity: 0.2,
                    transparent: true,
                    opacity: 0.8,
                    wireframe: true
                })
            );
            g.add(sphere);

            // Title Label
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            ctx.roundRect(0, 0, 512, 128, 20);
            ctx.fill();
            ctx.font = 'bold 70px "Segoe UI"';
            ctx.textAlign = 'center';
            ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
            ctx.fillText(title, 256, 85);

            const texture = new THREE.CanvasTexture(canvas);
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(120, 30), new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
            mesh.position.set(0, 180, 0);
            g.add(mesh);

            g.isGlobeTrigger = true;
            g.layerType = title.toLowerCase();

            return g;
        };

        const frontendGlobe = createDecoratedGlobe(0xec4899, 'FRONTEND');
        const backendGlobe = createDecoratedGlobe(0x10b981, 'BACKEND');

        frontendGroup.add(frontendGlobe);
        backendGroup.add(backendGlobe);

        // Get all nodes and distribute on globe
        const nodes = data.graph.nodes;
        const links = data.graph.links;

        const nodesMap = new Map();
        const nodesLabels = new Map();
        const arrowsToAnimate = [];

        // Help determine file color based on type
        const getFileColor = (node) => {
            const name = node.name.toLowerCase();
            const id = node.id.toLowerCase();

            if (node.layer === 'frontend') return 0xec4899; // Pink
            if (name.includes('middleware') || id.includes('middleware')) return 0x06b6d4; // Cyan for Middlewares
            if (name.includes('controller') || id.includes('controller')) return 0x3b82f6; // Blue
            if (name.includes('model') || id.includes('model') || name.includes('schema')) return 0x10b981; // Green
            if (name.includes('route') || id.includes('route')) return 0xf97316; // Orange
            if (name.includes('service') || id.includes('service')) return 0xa855f7; // Purple
            if (name.includes('util') || name.includes('helper')) return 0xeab308; // Yellow

            return node.layer === 'backend' ? 0x64748b : 0xec4899; // Default backend slate, frontend pink
        };

        // Distribute nodes evenly on two separate globes
        const frontendNodes = nodes.filter(n => n.layer === 'frontend');
        const backendNodes = nodes.filter(n => n.layer !== 'frontend');

        const placeNodesOnGlobe = (layerNodes, group) => {
            const total = layerNodes.length;
            layerNodes.forEach((node, index) => {
                const color = getFileColor(node);

                const phi = Math.acos(-1 + (2 * index) / Math.max(total, 1));
                const theta = Math.sqrt(Math.PI * total) * phi;
                const radius = 142;

                const x = radius * Math.cos(theta) * Math.sin(phi);
                const y = radius * Math.sin(theta) * Math.sin(phi);
                const z = radius * Math.cos(phi);

                nodesMap.set(node.id, { ...node, x, y, z });

                const pin = new THREE.Mesh(
                    new THREE.SphereGeometry(2.8, 16, 16),
                    new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 1.0 })
                );
                pin.position.set(x, y, z);
                group.add(pin);

                // 2. Create glassmorphism label
                const labelCanvas = document.createElement('canvas');
                labelCanvas.width = 512;
                labelCanvas.height = 100;
                const ctx = labelCanvas.getContext('2d');

                // Background
                ctx.fillStyle = 'rgba(10, 14, 39, 0.85)';
                ctx.roundRect(0, 0, labelCanvas.width, labelCanvas.height, 15);
                ctx.fill();

                // Border with file-type color
                const hexColor = `#${color.toString(16).padStart(6, '0')}`;
                ctx.strokeStyle = hexColor;
                ctx.lineWidth = 6;
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 34px "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const displayName = node.name.length > 30 ? node.name.substring(0, 27) + '...' : node.name;
                ctx.fillText(displayName, labelCanvas.width / 2, labelCanvas.height / 2);

                const labelTexture = new THREE.CanvasTexture(labelCanvas);
                const labelMaterial = new THREE.MeshBasicMaterial({
                    map: labelTexture,
                    transparent: true,
                    side: THREE.DoubleSide
                });

                const labelWidth = 28 + (node.val || 1) * 1.5;
                const labelHeight = labelWidth * (labelCanvas.height / labelCanvas.width);
                const labelGeometry = new THREE.PlaneGeometry(labelWidth, labelHeight);
                const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);

                // Position label slightly further out than the pin
                const labelPos = new THREE.Vector3(x, y, z).normalize().multiplyScalar(155);
                labelMesh.position.copy(labelPos);
                group.add(labelMesh);
                nodesLabels.set(node.id, labelMesh);
            });
        };

        placeNodesOnGlobe(frontendNodes, frontendGroup);
        placeNodesOnGlobe(backendNodes, backendGroup);

        // Draw connection flows (within their respective globes)
        links.forEach((link) => {
            const source = nodesMap.get(link.source);
            const target = nodesMap.get(link.target);

            // Draw connection flows
            if (source && target && source.layer === target.layer) {
                const group = source.layer === 'frontend' ? frontendGroup : backendGroup;
                const sourceVec = new THREE.Vector3(source.x, source.y, source.z);
                const targetVec = new THREE.Vector3(target.x, target.y, target.z);
                const color = getFileColor(source);

                const dist = sourceVec.distanceTo(targetVec);
                const arcHeight = 140 + dist * 0.4;

                const midVec = new THREE.Vector3()
                    .addVectors(sourceVec, targetVec)
                    .multiplyScalar(0.5)
                    .normalize()
                    .multiplyScalar(arcHeight);

                const curve = new THREE.CatmullRomCurve3([
                    sourceVec,
                    sourceVec.clone().normalize().multiplyScalar(145),
                    midVec,
                    targetVec.clone().normalize().multiplyScalar(145),
                    targetVec,
                ]);

                const line = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints(curve.getPoints(50)),
                    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.15 })
                );
                group.add(line);

                const arrows = [];
                for (let i = 0; i < 3; i++) {
                    const arrowGroup = new THREE.Group();
                    arrowGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.2), new THREE.MeshBasicMaterial({ color })));
                    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.8, 5), new THREE.MeshPhongMaterial({ color, emissive: color }));
                    cone.rotateX(Math.PI / 2);
                    arrowGroup.add(cone);
                    group.add(arrowGroup);
                    arrows.push(arrowGroup);
                }
                arrowsToAnimate.push({ arrows, curve });
            }
        });

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(200, 500, 300);
        scene.add(mainLight);

        // Interaction values
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let MathRotation = { x: 0, y: 0 }; // changed from rotation to MathRotation to avoid conflicts if any
        const zoomState = { current: 650, min: 300, max: 1200 };

        const onMouseDown = (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };

            // Raycaster for globe clicking
            if (!containerRef.current || focus !== 'all') return;

            const rect = containerRef.current.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);

            for (const intersect of intersects) {
                let parent = intersect.object;
                while (parent && !parent.isGlobeTrigger) parent = parent.parent;

                if (parent?.layerType) {
                    setFocus(parent.layerType);
                    break;
                }
            }
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            MathRotation.y += deltaX * 0.005;
            MathRotation.x += deltaY * 0.005;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        };

        const onMouseUp = () => isDragging = false;
        const onMouseWheel = (e) => {
            e.preventDefault();
            zoomState.current = Math.max(zoomState.min, Math.min(zoomState.max, zoomState.current + (e.deltaY > 0 ? 25 : -25)));
        };

        renderer.domElement.addEventListener('mousedown', onMouseDown);
        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('mouseup', onMouseUp);
        renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false });

        const handleResize = () => {
            if (!containerRef.current || !camera || !renderer) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // Animation loop variables
        let animationId;
        let time = 0;

        const animate = () => {
            animationId = requestAnimationFrame(animate);
            time += 0.01;

            const groupRotation = new THREE.Quaternion();
            groupRotation.setFromEuler(new THREE.Euler(MathRotation.x, MathRotation.y, 0));

            // Rotate the entire system (including the planet background)
            globeGroup.quaternion.copy(groupRotation);

            // Add continuous rotation to the planet background
            globe.rotation.y += 0.0005;

            // Target values for transitions
            const targetX = { frontend: -450, backend: 450, all: 280 };
            const targetXBack = { frontend: 450, backend: -450, all: -280 };
            const focusX = 0;

            // Lerp positions and scales
            if (focus === 'frontend') {
                frontendGroup.position.x += (focusX - frontendGroup.position.x) * 0.1;
                backendGroup.position.x += (targetX.frontend - backendGroup.position.x) * 0.1;
                backendGroup.scale.lerp(new THREE.Vector3(0.3, 0.3, 0.3), 0.1);
                frontendGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
            } else if (focus === 'backend') {
                backendGroup.position.x += (focusX - backendGroup.position.x) * 0.1;
                frontendGroup.position.x += (targetXBack.backend - frontendGroup.position.x) * 0.1;
                frontendGroup.scale.lerp(new THREE.Vector3(0.3, 0.3, 0.3), 0.1);
                backendGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
            } else {
                frontendGroup.position.x += (280 - frontendGroup.position.x) * 0.1;
                backendGroup.position.x += (-280 - backendGroup.position.x) * 0.1;
                frontendGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
                backendGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
            }

            nodesLabels.forEach((mesh) => {
                mesh.lookAt(camera.position);
            });

            // Animate dependency flows
            arrowsToAnimate.forEach(({ arrows, curve }) => {
                arrows.forEach((arrow, i) => {
                    const t = (time * 0.4 + (i / arrows.length)) % 1;
                    const pos = curve.getPoint(t);
                    arrow.position.copy(pos);
                    arrow.lookAt(curve.getPoint(Math.min(1, t + 0.01)));
                });
            });

            camera.position.z = zoomState.current;
            renderer.render(scene, camera);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationId);
            renderer.domElement.removeEventListener('mousedown', onMouseDown);
            renderer.domElement.removeEventListener('mousemove', onMouseMove);
            renderer.domElement.removeEventListener('mouseup', onMouseUp);
            renderer.domElement.removeEventListener('wheel', onMouseWheel);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            if (containerRef.current?.firstChild === renderer.domElement) {
                containerRef.current.removeChild(renderer.domElement);
            }
        };
    }, [data, focus]);

    return (
        <div className="w-full flex flex-col gap-6 relative">
            <div
                ref={containerRef}
                className="w-full rounded-xl border border-white/10 overflow-hidden bg-[#050816] cursor-pointer"
                style={{ height: '750px', minHeight: '750px', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }}
            />

            {focus !== 'all' && (
                <button
                    onClick={() => setFocus('all')}
                    className="absolute top-6 left-6 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg border border-white/20 transition-all flex items-center gap-2"
                >
                    <span>←</span> Back to Overview
                </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-5 border border-white/10 backdrop-blur-md">
                    <h3 className="font-bold text-slate-100 mb-4 flex items-center gap-2">
                        <span className="w-2 h-4 bg-pink-500 rounded-full"></span>
                        File Type Legend
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-300">
                            <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"></div>
                            <span>Middlewares</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                            <span>Controllers</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span>Models/Schemas</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                            <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                            <span>Routes</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                            <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                            <span>Services</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                            <div className="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]"></div>
                            <span>Frontend</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                            <div className="w-3 h-3 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.5)]"></div>
                            <span>Core/Others</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-5 border border-white/10 backdrop-blur-md">
                    <h3 className="font-bold text-slate-100 mb-4">Architecture Layers</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center text-slate-400">
                            <span>Top Hemisphere</span>
                            <span className="text-green-400 font-mono text-xs">BACKEND</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-green-500 to-pink-500 h-full w-full opacity-50"></div>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                            <span>Bottom Hemisphere</span>
                            <span className="text-pink-400 font-mono text-xs">FRONTEND</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-5 border border-white/10 backdrop-blur-md col-span-1 md:col-span-2 lg:col-span-1">
                    <h3 className="font-bold text-slate-100 mb-4">Navigation Guide</h3>
                    <ul className="text-xs text-slate-400 space-y-2">
                        <li className="flex items-center gap-2">🖱️ <strong>Drag:</strong> Spin the galaxy</li>
                        <li className="flex items-center gap-2">🔍 <strong>Scroll:</strong> Zoom into code clusters</li>
                        <li className="flex items-center gap-2">📍 <strong>Pins:</strong> Precise file locations</li>
                        <li className="flex items-center gap-2">🏹 <strong>Flows:</strong> Live dependency movements</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
