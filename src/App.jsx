import { Canvas } from '@react-three/fiber'
import { useGLTF, useAnimations, OrbitControls, Environment } from '@react-three/drei'
import { Suspense, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './App.css'

function Model({ scrollProgress }) {
  const group = useRef()
  const actionRef = useRef()
  const { scene, animations } = useGLTF('/models/scene.gltf')
  const { mixer, actions } = useAnimations(animations, group)

  useEffect(() => {
    if (!actions || !animations.length) return
    const actionName = Object.keys(actions)[0]
    if (!actionName) return
    const action = actions[actionName]
    action.play()
    action.paused = true
    action.setLoop(THREE.LoopOnce)
    action.clampWhenFinished = true
    actionRef.current = action
  }, [actions, animations])

  useEffect(() => {
    const action = actionRef.current
    if (!action || !mixer) return
    const clip = action.getClip()
    action.paused = false
    action.time = scrollProgress * clip.duration
    mixer.update(0)
    action.paused = true
  }, [scrollProgress, mixer])

  return <primitive ref={group} object={scene} scale={0.3} />
}

function App() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const heroRef = useRef()

  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) return
      const wrapper = heroRef.current
      const wrapperTop = wrapper.offsetTop
      const wrapperHeight = wrapper.offsetHeight - window.innerHeight
      const scrollTop = window.scrollY - wrapperTop
      const progress = wrapperHeight > 0 ? scrollTop / wrapperHeight : 0
      setScrollProgress(Math.min(Math.max(progress, 0), 1))
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div id="app">
      <div className="hero-wrapper" ref={heroRef}>
        <section className="hero">
          <div className="hero-text">
            <p className="hero-greeting">Bienvenido a</p>
            <h1>Mi Portafolio</h1>
            <div className="hero-line"></div>
            <p className="hero-subtitle">Paulo | Desarrollador Full Stack</p>
          </div>
          <div className="hero-canvas">
            <Canvas camera={{ position: [0, 0, 15], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[5, 5, 5]} intensity={1} />
              <Suspense fallback={null}>
                <Model scrollProgress={scrollProgress} />
                <Environment preset="city" />
              </Suspense>
              <OrbitControls enableZoom={false} />
            </Canvas>
          </div>
          <div className="scroll-indicator">
            <span>Scroll</span>
            <div className="scroll-arrow"></div>
          </div>
        </section>
      </div>
      <section className="section">
        <h2>Sobre mí</h2>
      </section>
      <section className="section">
        <h2>Proyectos</h2>
      </section>
      <section className="section">
        <h2>Contacto</h2>
      </section>
    </div>
  )
}

export default App
