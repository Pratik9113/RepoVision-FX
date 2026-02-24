import React, { useEffect } from 'react';
import * as THREE from 'three';

const ThreeBackground: React.FC = () => {
    useEffect(() => {
        const container = document.getElementById('three-container');
        if (!container) return;

        // Scene setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        // Create floating geometric shapes
        const geometry1 = new THREE.TorusGeometry(10, 3, 16, 100);
        const geometry2 = new THREE.OctahedronGeometry(8, 0);
        const geometry3 = new THREE.IcosahedronGeometry(6, 0);

        const material1 = new THREE.MeshBasicMaterial({
            color: 0x9333ea,
            wireframe: true,
            transparent: true,
            opacity: 0.15
        });
        const material2 = new THREE.MeshBasicMaterial({
            color: 0xec4899,
            wireframe: true,
            transparent: true,
            opacity: 0.1
        });
        const material3 = new THREE.MeshBasicMaterial({
            color: 0x3b82f6,
            wireframe: true,
            transparent: true,
            opacity: 0.12
        });

        const torus = new THREE.Mesh(geometry1, material1);
        const octahedron = new THREE.Mesh(geometry2, material2);
        const icosahedron = new THREE.Mesh(geometry3, material3);

        torus.position.set(-20, 10, -50);
        octahedron.position.set(25, -15, -60);
        icosahedron.position.set(0, 20, -40);

        scene.add(torus);
        scene.add(octahedron);
        scene.add(icosahedron);

        camera.position.z = 30;

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);

            torus.rotation.x += 0.003;
            torus.rotation.y += 0.005;

            octahedron.rotation.x += 0.004;
            octahedron.rotation.y += 0.003;

            icosahedron.rotation.x += 0.002;
            icosahedron.rotation.y += 0.004;

            // Floating motion
            torus.position.y += Math.sin(Date.now() * 0.001) * 0.01;
            octahedron.position.y += Math.cos(Date.now() * 0.0008) * 0.01;
            icosahedron.position.y += Math.sin(Date.now() * 0.0012) * 0.01;

            renderer.render(scene, camera);
        };

        animate();

        // Handle resize
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            geometry1.dispose();
            geometry2.dispose();
            geometry3.dispose();
            material1.dispose();
            material2.dispose();
            material3.dispose();
            renderer.dispose();
        };
    }, []);

    return (
        <div id="three-container" className="fixed inset-0 pointer-events-none z-0"></div>
    );
};

export default ThreeBackground;
