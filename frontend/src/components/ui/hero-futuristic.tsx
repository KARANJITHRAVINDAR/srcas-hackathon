'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { useAspect, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Mesh } from 'three';

// TSL & Bloom nodes
import {
  abs,
  blendScreen,
  float,
  mod,
  mx_cell_noise_float,
  oneMinus,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  pass,
  mix,
  add
} from 'three/tsl';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';

const TEXTUREMAP = { src: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1200&auto=format&fit=crop' };
const DEPTHMAP = { src: 'https://i.postimg.cc/2SHKQh2q/raw-4.webp' };

extend(THREE as any);

// Helper for dynamic Three WebGPU class constructors
const getWebGPUClass = (className: string) => {
  return (THREE as Record<string, any>)[className] || null;
};

// Post Processing component
const PostProcessing = ({
  strength = 1,
  threshold = 1,
  fullScreenEffect = true,
}: {
  strength?: number;
  threshold?: number;
  fullScreenEffect?: boolean;
}) => {
  const { gl, scene, camera } = useThree();
  const progressRef = useRef({ value: 0 });

  const render = useMemo(() => {
    try {
      const PostProcessingClass = getWebGPUClass('PostProcessing');
      if (!PostProcessingClass) return null;
      const postProcessing = new PostProcessingClass(gl as any);
      const scenePass = pass(scene, camera);
      const scenePassColor = scenePass.getTextureNode('output');
      const bloomPass = bloom(scenePassColor, strength, 0.5, threshold);

      // Create the scanning effect uniform
      const uScanProgress = uniform(0);
      progressRef.current = uScanProgress;

      // Create a green/cyan overlay that follows the scan line matching application theme
      const scanPos = float(uScanProgress.value);
      const uvY = uv().y;
      const scanWidth = float(0.05);
      const scanLine = smoothstep(0, scanWidth, abs(uvY.sub(scanPos)));
      const themeOverlay = vec3(0, 0.65, 0.45).mul(oneMinus(scanLine)).mul(0.4);

      // Mix the original scene with the theme overlay
      const withScanEffect = mix(
        scenePassColor,
        add(scenePassColor, themeOverlay),
        fullScreenEffect ? smoothstep(0.9, 1.0, oneMinus(scanLine)) : 1.0
      );

      // Add bloom effect after scan effect
      const final = withScanEffect.add(bloomPass);

      postProcessing.outputNode = final;

      return postProcessing;
    } catch (e) {
      return null;
    }
  }, [camera, gl, scene, strength, threshold, fullScreenEffect]);

  useFrame(({ clock }) => {
    if (render) {
      progressRef.current.value = (Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5);
      if (typeof (render as any).renderAsync === 'function') {
        (render as any).renderAsync();
      }
    }
  }, 1);

  return null;
};

const WIDTH = 300;
const HEIGHT = 300;

const Scene = () => {
  const [rawMap, depthMap] = useTexture([TEXTUREMAP.src, DEPTHMAP.src]);

  const meshRef = useRef<Mesh>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (rawMap && depthMap) {
      setVisible(true);
    }
  }, [rawMap, depthMap]);

  const { material, uniforms } = useMemo(() => {
    const uPointer = uniform(new THREE.Vector2(0));
    const uProgress = uniform(0);

    const strength = 0.01;

    const tDepthMap = texture(depthMap);

    const tMap = texture(
      rawMap,
      uv().add(tDepthMap.r.mul(uPointer).mul(strength))
    );

    const aspect = float(WIDTH).div(HEIGHT);
    const tUv = vec2(uv().x.mul(aspect), uv().y);

    const tiling = vec2(120.0);
    const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0);

    const brightness = mx_cell_noise_float(tUv.mul(tiling).div(2));

    const dist = float(tiledUv.length());
    const dot = float(smoothstep(0.5, 0.49, dist)).mul(brightness);

    const depth = tDepthMap;

    const flow = oneMinus(smoothstep(0, 0.02, abs(depth.sub(uProgress))));

    const mask = dot.mul(flow).mul(vec3(0, 10, 6.5));

    const final = blendScreen(tMap, mask);

    const MeshNodeMaterialClass = getWebGPUClass('MeshBasicNodeMaterial');
    const material = MeshNodeMaterialClass 
      ? new MeshNodeMaterialClass({ colorNode: final, transparent: true, opacity: 0 })
      : new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });

    return {
      material,
      uniforms: {
        uPointer,
        uProgress,
      },
    };
  }, [rawMap, depthMap]);

  const [w, h] = useAspect(WIDTH, HEIGHT);

  useFrame(({ clock }) => {
    if (uniforms?.uProgress) {
      uniforms.uProgress.value = (Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5);
    }
    if (meshRef.current && 'material' in meshRef.current && meshRef.current.material) {
      const mat = meshRef.current.material as any;
      if ('opacity' in mat) {
        mat.opacity = THREE.MathUtils.lerp(
          mat.opacity,
          visible ? 1 : 0,
          0.07
        );
      }
    }
  });

  useFrame(({ pointer }) => {
    if (uniforms?.uPointer) {
      uniforms.uPointer.value = pointer;
    }
  });

  const scaleFactor = 0.40;
  return (
    <mesh ref={meshRef} scale={[w * scaleFactor, h * scaleFactor, 1]} material={material}>
      <planeGeometry />
    </mesh>
  );
};

export const HeroFuturistic = () => {
  const titleWords = 'Trust, Verified at Every Step.'.split(' ');
  const subtitle = 'From funding to impact, every milestone is backed by cryptographically secure evidence.';
  const [visibleWords, setVisibleWords] = useState(0);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [delays, setDelays] = useState<number[]>([]);
  const [subtitleDelay, setSubtitleDelay] = useState(0);

  useEffect(() => {
    setDelays(titleWords.map(() => Math.random() * 0.07));
    setSubtitleDelay(Math.random() * 0.1);
  }, [titleWords.length]);

  useEffect(() => {
    if (visibleWords < titleWords.length) {
      const timeout = setTimeout(() => setVisibleWords(visibleWords + 1), 250);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => setSubtitleVisible(true), 400);
      return () => clearTimeout(timeout);
    }
  }, [visibleWords, titleWords.length]);

  return (
    <div className="relative min-h-[550px] w-full rounded-3xl overflow-hidden bg-[#061121] border border-slate-800 flex flex-col justify-between p-8 text-white">
      <div className="w-full flex justify-center flex-col items-center text-center relative z-20 pt-6">
        <div className="text-3xl md:text-5xl font-extrabold tracking-tight">
          <div className="flex flex-wrap justify-center gap-2 overflow-hidden text-white">
            {titleWords.map((word, index) => (
              <div
                key={index}
                className={index < visibleWords ? 'fade-in' : ''}
                style={{ animationDelay: `${index * 0.1 + (delays[index] || 0)}s`, opacity: index < visibleWords ? undefined : 0 }}
              >
                {word}
              </div>
            ))}
          </div>
        </div>
        <div className="text-sm md:text-lg mt-4 max-w-2xl text-slate-300 font-semibold leading-relaxed">
          <div
            className={subtitleVisible ? 'fade-in-subtitle' : ''}
            style={{ animationDelay: `${titleWords.length * 0.1 + 0.2 + subtitleDelay}s`, opacity: subtitleVisible ? undefined : 0 }}
          >
            {subtitle}
          </div>
        </div>
      </div>

      <div className="absolute inset-0 z-10 opacity-75">
        <Canvas
          flat
          gl={async (props) => {
            try {
              const WebGPURendererClass = getWebGPUClass('WebGPURenderer');
              if (WebGPURendererClass) {
                const renderer = new WebGPURendererClass(props as any);
                await renderer.init();
                return renderer;
              }
              return new THREE.WebGLRenderer(props as any);
            } catch (e) {
              return new THREE.WebGLRenderer(props as any);
            }
          }}
        >
          <PostProcessing fullScreenEffect={true} />
          <Scene />
        </Canvas>
      </div>
    </div>
  );
};

export default HeroFuturistic;
