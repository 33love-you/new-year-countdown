import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AppStage } from '../types';
import { getPointsForStage } from '../utils/shapeGenerator';

interface ParticleSceneProps {
  stage: AppStage;
}

const ParticleScene: React.FC<ParticleSceneProps> = ({ stage }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  
  // Store target positions
  const targetPositionsRef = useRef<Float32Array | null>(null);
  const targetColorsRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene Setup
    const scene = new THREE.Scene();
    // Deep space black
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;
    camera.position.y = 0;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // --- Main Particles Setup ---
    const particleCount = 4000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    // Extra attribute for random offsets for floating
    const randoms = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      colors[i * 3] = 1.0;
      randoms[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    const material = new THREE.PointsMaterial({
      size: 0.4, // Slightly larger for "pixel" look
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    // --- Background Stars Setup ---
    const starCount = 2000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCols = new Float32Array(starCount * 3);
    
    for(let i=0; i<starCount; i++) {
      // Spread stars far in the background
      starPos[i*3] = (Math.random() - 0.5) * 300;
      starPos[i*3+1] = (Math.random() - 0.5) * 300;
      starPos[i*3+2] = -50 - Math.random() * 100; // Behind the main scene
      
      const starType = Math.random();
      if (starType > 0.9) { // Blue stars
         starCols[i*3] = 0.5; starCols[i*3+1] = 0.7; starCols[i*3+2] = 1.0; 
      } else if (starType > 0.7) { // Reddish stars
         starCols[i*3] = 1.0; starCols[i*3+1] = 0.6; starCols[i*3+2] = 0.6;
      } else { // White
         starCols[i*3] = 1.0; starCols[i*3+1] = 1.0; starCols[i*3+2] = 1.0;
      }
    }
    
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCols, 3));
    
    const starMat = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });
    
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    starsRef.current = stars;


    // Handle Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    const animate = () => {
      const time = Date.now() * 0.001;

      // Animate Main Particles
      if (particlesRef.current && targetPositionsRef.current && targetColorsRef.current) {
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        const colors = particlesRef.current.geometry.attributes.color.array as Float32Array;
        const randoms = particlesRef.current.geometry.attributes.aRandom.array as Float32Array;
        
        const targets = targetPositionsRef.current;
        const targetCols = targetColorsRef.current;
        
        const lerpFactor = 0.08;

        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          
          // Floating effect: Use the random attribute to make each particle float independently
          // but coherently. No global rotation.
          const floatOffset = Math.sin(time + randoms[i] * 10) * 0.2; // Small vertical float
          const floatOffsetX = Math.cos(time * 0.5 + randoms[i] * 10) * 0.1; // Gentle horizontal drift

          // Target Position with floating offset
          const targetX = targets[i3] + floatOffsetX;
          const targetY = targets[i3 + 1] + floatOffset;
          const targetZ = targets[i3 + 2];

          // Position Interpolation
          positions[i3] += (targetX - positions[i3]) * lerpFactor;
          positions[i3 + 1] += (targetY - positions[i3 + 1]) * lerpFactor;
          positions[i3 + 2] += (targetZ - positions[i3 + 2]) * lerpFactor;

          // Color Interpolation
          colors[i3] += (targetCols[i3] - colors[i3]) * lerpFactor;
          colors[i3 + 1] += (targetCols[i3 + 1] - colors[i3 + 1]) * lerpFactor;
          colors[i3 + 2] += (targetCols[i3 + 2] - colors[i3 + 2]) * lerpFactor;
        }

        particlesRef.current.geometry.attributes.position.needsUpdate = true;
        particlesRef.current.geometry.attributes.color.needsUpdate = true;
      }

      // Animate Stars (Slow rotation to simulate universe turning)
      if (starsRef.current) {
          starsRef.current.rotation.z = time * 0.02;
      }

      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      starGeo.dispose();
      starMat.dispose();
    };
  }, []);

  // Update Targets when stage changes
  useEffect(() => {
    const points = getPointsForStage(stage);
    const particleCount = 4000;
    
    const newTargetPositions = new Float32Array(particleCount * 3);
    const newTargetColors = new Float32Array(particleCount * 3);

    points.forEach((p, i) => {
      if (i < particleCount) {
        newTargetPositions[i * 3] = p.x;
        newTargetPositions[i * 3 + 1] = p.y;
        newTargetPositions[i * 3 + 2] = p.z;
        
        newTargetColors[i * 3] = p.color[0];
        newTargetColors[i * 3 + 1] = p.color[1];
        newTargetColors[i * 3 + 2] = p.color[2];
      }
    });

    // Handle extra particles by collapsing them to center or hiding
    for (let i = points.length; i < particleCount; i++) {
       newTargetPositions[i * 3] = 0;
       newTargetPositions[i * 3 + 1] = 0;
       newTargetPositions[i * 3 + 2] = 0;
       newTargetColors[i * 3] = 0; // Hide
       newTargetColors[i * 3 + 1] = 0;
       newTargetColors[i * 3 + 2] = 0;
    }

    targetPositionsRef.current = newTargetPositions;
    targetColorsRef.current = newTargetColors;

  }, [stage]);

  return <div ref={mountRef} className="absolute inset-0 z-0 bg-black" />;
};

export default ParticleScene;