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
        scene.background = new THREE.Color(0x06060c);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 4000);
        camera.position.set(0, 0, 400);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
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

            // Deep Space Background
            ctx.fillStyle = '#06060c';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Add faint grid
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 36; i++) {
                ctx.beginPath();
                ctx.moveTo((i / 36) * canvas.width, 0);
                ctx.lineTo((i / 36) * canvas.width, canvas.height);
                ctx.stroke();
            }
            for (let i = 0; i <= 18; i++) {
                ctx.beginPath();
                ctx.moveTo(0, (i / 18) * canvas.height);
                ctx.lineTo(canvas.width, (i / 18) * canvas.height);
                ctx.stroke();
            }

            // Continents (Low-poly stylized)
            ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
            const continents = [
                { x: 0.15, y: 0.15, w: 0.15, h: 0.25 }, // NA
                { x: 0.2, y: 0.5, w: 0.08, h: 0.2 },   // SA
                { x: 0.45, y: 0.1, w: 0.1, h: 0.15 },  // EU
                { x: 0.45, y: 0.3, w: 0.12, h: 0.28 }, // AF
                { x: 0.6, y: 0.15, w: 0.25, h: 0.3 },  // AS
                { x: 0.78, y: 0.6, w: 0.08, h: 0.12 }, // AU
            ];

            continents.forEach(cont => {
                ctx.shadowBlur = 40;
                ctx.shadowColor = 'rgba(56, 189, 248, 0.3)';
                ctx.fillRect(cont.x * canvas.width, cont.y * canvas.height, cont.w * canvas.width, cont.h * canvas.height);
            });

            const texture = new THREE.CanvasTexture(canvas);
            const geometry = new THREE.SphereGeometry(140, 64, 64);
            const material = new THREE.MeshPhongMaterial({
                map: texture,
                transparent: true,
                opacity: 0.8,
                emissive: 0x0e7490,
                emissiveIntensity: 0.1
            });

            return new THREE.Mesh(geometry, material);
        };

        const globe = createGlobe();
        const globeGroup = new THREE.Group();
        globeGroup.add(globe);
        scene.add(globeGroup);

        // Core Glowing Center
        const glowCore = new THREE.Mesh(
            new THREE.SphereGeometry(138, 32, 32),
            new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.05, wireframe: true })
        );
        globeGroup.add(glowCore);

        // Sub-Groups for Layers
        const frontendGroup = new THREE.Group();
        const backendGroup = new THREE.Group();
        frontendGroup.position.x = 280;
        backendGroup.position.x = -280;
        globeGroup.add(frontendGroup);
        globeGroup.add(backendGroup);

        const createLayerLabel = (color, title) => {
            const g = new THREE.Group();
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 160;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = 'rgba(14, 14, 26, 0.9)';
            ctx.roundRect(0, 0, 512, 160, 24);
            ctx.fill();
            
            const hexColor = `#${color.toString(16).padStart(6, '0')}`;
            ctx.strokeStyle = hexColor;
            ctx.lineWidth = 12;
            ctx.stroke();

            ctx.font = 'black 80px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = hexColor;
            ctx.fillText(title, 256, 105);

            const texture = new THREE.CanvasTexture(canvas);
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(100, 32), new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
            mesh.position.set(0, 180, 0);
            g.add(mesh);
            g.isGlobeTrigger = true;
            g.layerType = title.toLowerCase();
            return g;
        };

        const frontendGlobe = createLayerLabel(0x0ea5e9, 'FRONTEND');
        const backendGlobe = createLayerLabel(0x8b5cf6, 'BACKEND');
        frontendGroup.add(frontendGlobe);
        backendGroup.add(backendGlobe);

        const nodes = data.graph.nodes;
        const links = data.graph.links;
        const nodesMap = new Map();
        const nodesLabels = new Map();
        const arrowsToAnimate = [];

        const getFileColor = (node) => {
            if (node.layer === 'frontend') return 0x0ea5e9;
            const name = node.name.toLowerCase();
            if (name.includes('router') || name.includes('api')) return 0x6366f1; // Indigo
            if (name.includes('service')) return 0x8b5cf6; // Purple
            if (name.includes('model') || name.includes('db')) return 0x22c55e; // Green
            return 0x8b5cf6; 
        };

        const placeNodes = (layerNodes, group) => {
            const total = layerNodes.length;
            layerNodes.forEach((node, index) => {
                const color = getFileColor(node);
                const phi = Math.acos(-1 + (2 * index) / Math.max(total, 1));
                const theta = Math.sqrt(Math.PI * total) * phi;
                const radius = 145;

                const x = radius * Math.cos(theta) * Math.sin(phi);
                const y = radius * Math.sin(theta) * Math.sin(phi);
                const z = radius * Math.cos(phi);
                nodesMap.set(node.id, { ...node, x, y, z });

                // Node Point
                const pin = new THREE.Mesh(
                    new THREE.SphereGeometry(2.5, 12, 12),
                    new THREE.MeshStandardMaterial({ 
                        color, 
                        emissive: color, 
                        emissiveIntensity: 2,
                        roughness: 0,
                        metalness: 1
                    })
                );
                pin.position.set(x, y, z);
                group.add(pin);

                // Label
                const labelCanvas = document.createElement('canvas');
                labelCanvas.width = 400; labelCanvas.height = 80;
                const ctx = labelCanvas.getContext('2d');
                ctx.fillStyle = 'rgba(6, 6, 12, 0.8)';
                ctx.roundRect(0, 0, 400, 80, 12);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 32px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(node.name.length > 20 ? node.name.substring(0, 17) + '...' : node.name, 200, 50);

                const labelTexture = new THREE.CanvasTexture(labelCanvas);
                const labelMesh = new THREE.Mesh(
                    new THREE.PlaneGeometry(35, 7), 
                    new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, side: THREE.DoubleSide })
                );
                const labelPos = new THREE.Vector3(x, y, z).normalize().multiplyScalar(158);
                labelMesh.position.copy(labelPos);
                group.add(labelMesh);
                nodesLabels.set(node.id, labelMesh);
            });
        };

        placeNodes(nodes.filter(n => n.layer === 'frontend'), frontendGroup);
        placeNodes(nodes.filter(n => n.layer !== 'frontend'), backendGroup);

        links.forEach((link) => {
            const s = nodesMap.get(link.source);
            const t = nodesMap.get(link.target);
            if (s && t && s.layer === t.layer) {
                const group = s.layer === 'frontend' ? frontendGroup : backendGroup;
                const sV = new THREE.Vector3(s.x, s.y, s.z);
                const tV = new THREE.Vector3(t.x, t.y, t.z);
                const color = getFileColor(s);

                const curve = new THREE.CatmullRomCurve3([
                    sV,
                    sV.clone().normalize().multiplyScalar(150),
                    new THREE.Vector3().addVectors(sV, tV).multiplyScalar(0.5).normalize().multiplyScalar(160),
                    tV.clone().normalize().multiplyScalar(150),
                    tV,
                ]);

                const line = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints(curve.getPoints(30)),
                    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.1 })
                );
                group.add(line);

                const arrows = [];
                for(let i=0; i<2; i++) {
                    const a = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4), new THREE.MeshBasicMaterial({ color }));
                    a.rotateX(Math.PI/2);
                    group.add(a);
                    arrows.push(a);
                }
                arrowsToAnimate.push({ arrows, curve });
            }
        });

        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const pL = new THREE.PointLight(0x0ea5e9, 1.5);
        pL.position.set(500, 500, 500);
        scene.add(pL);

        let isDragging = false, prevM = { x: 0, y: 0 }, rot = { x: 0, y: 0 }, zoom = 700;
        const onMD = (e) => {
            isDragging = true; prevM = { x: e.clientX, y: e.clientY };
            if (focus !== 'all') return;
            const rect = containerRef.current.getBoundingClientRect();
            const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
            const ray = new THREE.Raycaster(); ray.setFromCamera(mouse, camera);
            const ih = ray.intersectObjects(scene.children, true);
            for (const h of ih) {
                let p = h.object; while (p && !p.isGlobeTrigger) p = p.parent;
                if (p?.layerType) { setFocus(p.layerType); break; }
            }
        };
        const onMM = (e) => {
            if (!isDragging) return;
            rot.y += (e.clientX - prevM.x) * 0.005;
            rot.x += (e.clientY - prevM.y) * 0.005;
            prevM = { x: e.clientX, y: e.clientY };
        };
        const onW = (e) => { e.preventDefault(); zoom = Math.max(300, Math.min(1500, zoom + (e.deltaY > 0 ? 30 : -30))); };
        
        renderer.domElement.addEventListener('mousedown', onMD);
        window.addEventListener('mousemove', onMM);
        window.addEventListener('mouseup', () => isDragging = false);
        renderer.domElement.addEventListener('wheel', onW, { passive: false });

        let aid, tCount = 0;
        const animate = () => {
            aid = requestAnimationFrame(animate);
            tCount += 0.01;
            globeGroup.quaternion.setFromEuler(new THREE.Euler(rot.x, rot.y, 0));
            globe.rotation.y += 0.001;

            if (focus === 'frontend') {
                frontendGroup.position.x += (0 - frontendGroup.position.x) * 0.1;
                backendGroup.position.x += (-500 - backendGroup.position.x) * 0.1;
                backendGroup.scale.lerp(new THREE.Vector3(0.2,0.2,0.2), 0.1);
            } else if (focus === 'backend') {
                backendGroup.position.x += (0 - backendGroup.position.x) * 0.1;
                frontendGroup.position.x += (500 - frontendGroup.position.x) * 0.1;
                frontendGroup.scale.lerp(new THREE.Vector3(0.2,0.2,0.2), 0.1);
            } else {
                frontendGroup.position.x += (280 - frontendGroup.position.x) * 0.1;
                backendGroup.position.x += (-280 - backendGroup.position.x) * 0.1;
                frontendGroup.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
                backendGroup.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
            }

            nodesLabels.forEach(m => m.lookAt(camera.position));
            arrowsToAnimate.forEach(({ arrows, curve }) => {
                arrows.forEach((a, i) => {
                    const t = (tCount * 0.5 + (i / arrows.length)) % 1;
                    a.position.copy(curve.getPoint(t));
                    a.lookAt(curve.getPoint(Math.min(1, t + 0.01)));
                });
            });

            camera.position.z = zoom;
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(aid);
            renderer.dispose();
            if (containerRef.current) containerRef.current.innerHTML = '';
        };
    }, [data, focus]);

    return (
        <div className="w-full flex flex-col gap-6 relative flex-grow overflow-hidden">
            <div ref={containerRef} className="w-full flex-grow rounded-2xl bg-black/20 cursor-grab active:cursor-grabbing border border-white/[0.05]" />

            {focus !== 'all' && (
                <button
                    onClick={() => setFocus('all')}
                    className="absolute top-6 left-6 z-10 bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-xl border-none shadow-lg shadow-sky-600/20 transition-all font-bold text-xs uppercase tracking-widest cursor-pointer"
                >
                    ← Back to Topology
                </button>
            )}

            <div className="absolute bottom-6 right-6 grid grid-cols-1 gap-4 max-w-[300px] pointer-events-none">
                <div className="bg-[#0e0e1a]/80 backdrop-blur-xl rounded-2xl p-5 border border-white/10 shadow-2xl pointer-events-auto">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">Topology Key</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]" />
                            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Frontend Nodes</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Service Logic</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Routing / API</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Data Models</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
