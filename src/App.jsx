import { Canvas, useFrame, extend } from '@react-three/fiber'
import { useGLTF, useAnimations, useTexture, OrbitControls, Environment, Lightformer } from '@react-three/drei'
import { Physics, RigidBody, BallCollider, CuboidCollider, useRopeJoint, useSphericalJoint } from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import emailjs from '@emailjs/browser'
import * as THREE from 'three'
import {
  SiReact, SiJavascript, SiNodedotjs, SiHtml5, SiCss3,
  SiGit, SiPython, SiTypescript, SiMongodb, SiTailwindcss,
  SiGithub, SiLinkedin, SiNextdotjs, SiExpo
} from 'react-icons/si'
import { HiOutlineMail, HiBriefcase, HiAcademicCap, HiHome, HiUser, HiCode, HiMail, HiX, HiExternalLink, HiCheckCircle } from 'react-icons/hi'
import './App.css'

extend({ MeshLineGeometry, MeshLineMaterial })

const LOGOS = [
  { icon: <SiReact />, name: 'React' },
  { icon: <SiJavascript />, name: 'JavaScript' },
  { icon: <SiTypescript />, name: 'TypeScript' },
  { icon: <SiNodedotjs />, name: 'Node.js' },
  { icon: <SiHtml5 />, name: 'HTML5' },
  { icon: <SiCss3 />, name: 'CSS3' },
  { icon: <SiTailwindcss />, name: 'Tailwind' },
  { icon: <SiPython />, name: 'Python' },
  { icon: <SiMongodb />, name: 'MongoDB' },
  { icon: <SiGit />, name: 'Git' },
]

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`'

function DecryptedText({ text, speed = 50, delay = 0, revealSpeed = 80, scrambleDuration = 600, onDone }) {
  const [output, setOutput] = useState(() => Array(text.length).fill(''))
  const [started, setStarted] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(timeout)
  }, [delay])

  useEffect(() => {
    if (!started) return

    const revealed = new Set()
    const intervals = []

    // Start scrambling all characters
    const scrambleInterval = setInterval(() => {
      setOutput(prev => prev.map((ch, i) => {
        if (revealed.has(i)) return text[i]
        if (text[i] === ' ') return ' '
        return CHARS[Math.floor(Math.random() * CHARS.length)]
      }))
    }, speed)

    // Reveal characters one by one
    text.split('').forEach((_, i) => {
      const revealTimeout = setTimeout(() => {
        revealed.add(i)
        if (revealed.size === text.length) {
          clearInterval(scrambleInterval)
          setOutput(text.split(''))
          if (!doneRef.current) {
            doneRef.current = true
            onDone?.()
          }
        }
      }, scrambleDuration + i * revealSpeed)
      intervals.push(revealTimeout)
    })

    return () => {
      clearInterval(scrambleInterval)
      intervals.forEach(clearTimeout)
    }
  }, [started, text, speed, revealSpeed, scrambleDuration, onDone])

  if (!started) return <span className="decrypted-text-placeholder">{'\u00A0'.repeat(text.length)}</span>

  return (
    <span className="decrypted-text">
      {output.map((char, i) => (
        <span
          key={i}
          className={char === text[i] ? 'decrypted-char revealed' : 'decrypted-char scrambling'}
        >
          {char || '\u00A0'}
        </span>
      ))}
    </span>
  )
}

function LogoLoop() {
  const items = [...LOGOS, ...LOGOS]
  return (
    <div className="logo-loop">
      <div className="logo-loop-track">
        {items.map((logo, i) => (
          <div key={i} className="logo-loop-item">
            <span className="logo-loop-icon">{logo.icon}</span>
            <span className="logo-loop-name">{logo.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Model({ scrollProgress }) {
  const group = useRef()
  const actionRef = useRef()
  const { scene, animations } = useGLTF('/models/scene-draco.gltf', 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
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

function TargetCursor() {
  const canvasRef = useRef(null)
  const mousePos = useRef({ x: -100, y: -100 })
  const targetRect = useRef(null)
  const smoothRect = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const dotPos = useRef({ x: -100, y: -100 })
  const isHovering = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pad = 8
    const bracketLen = 12

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouse = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY }
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (el) {
        const clickable = el.closest('a, button, [role="button"], .logo-loop-item')
        if (clickable) {
          const rect = clickable.getBoundingClientRect()
          targetRect.current = {
            x: rect.left - pad,
            y: rect.top - pad,
            w: rect.width + pad * 2,
            h: rect.height + pad * 2,
          }
          isHovering.current = true
          return
        }
      }
      isHovering.current = false
      targetRect.current = null
    }
    window.addEventListener('mousemove', handleMouse)

    let animId
    const lerp = 0.15

    const drawBrackets = (x, y, w, h, alpha) => {
      ctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`
      ctx.lineWidth = 2

      // Top-left
      ctx.beginPath()
      ctx.moveTo(x + bracketLen, y)
      ctx.lineTo(x, y)
      ctx.lineTo(x, y + bracketLen)
      ctx.stroke()

      // Top-right
      ctx.beginPath()
      ctx.moveTo(x + w - bracketLen, y)
      ctx.lineTo(x + w, y)
      ctx.lineTo(x + w, y + bracketLen)
      ctx.stroke()

      // Bottom-right
      ctx.beginPath()
      ctx.moveTo(x + w - bracketLen, y + h)
      ctx.lineTo(x + w, y + h)
      ctx.lineTo(x + w, y + h - bracketLen)
      ctx.stroke()

      // Bottom-left
      ctx.beginPath()
      ctx.moveTo(x + bracketLen, y + h)
      ctx.lineTo(x, y + h)
      ctx.lineTo(x, y + h - bracketLen)
      ctx.stroke()
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Smooth dot position
      dotPos.current.x += (mousePos.current.x - dotPos.current.x) * 0.2
      dotPos.current.y += (mousePos.current.y - dotPos.current.y) * 0.2

      // Center dot
      ctx.beginPath()
      ctx.arc(dotPos.current.x, dotPos.current.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(212, 175, 55, 0.9)'
      ctx.shadowColor = 'rgba(212, 175, 55, 0.6)'
      ctx.shadowBlur = 10
      ctx.fill()
      ctx.shadowBlur = 0

      if (isHovering.current && targetRect.current) {
        const t = targetRect.current
        smoothRect.current.x += (t.x - smoothRect.current.x) * lerp
        smoothRect.current.y += (t.y - smoothRect.current.y) * lerp
        smoothRect.current.w += (t.w - smoothRect.current.w) * lerp
        smoothRect.current.h += (t.h - smoothRect.current.h) * lerp

        drawBrackets(
          smoothRect.current.x,
          smoothRect.current.y,
          smoothRect.current.w,
          smoothRect.current.h,
          0.8
        )
      } else {
        // Shrink brackets to cursor when not hovering
        const cx = dotPos.current.x
        const cy = dotPos.current.y
        smoothRect.current.x += (cx - 15 - smoothRect.current.x) * lerp
        smoothRect.current.y += (cy - 15 - smoothRect.current.y) * lerp
        smoothRect.current.w += (30 - smoothRect.current.w) * lerp
        smoothRect.current.h += (30 - smoothRect.current.h) * lerp

        drawBrackets(
          smoothRect.current.x,
          smoothRect.current.y,
          smoothRect.current.w,
          smoothRect.current.h,
          0.35
        )
      }

      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouse)
    }
  }, [])

  return <canvas ref={canvasRef} className="cursor-canvas" />
}

function createBadgeTexture(originalMap, photoImage) {
  const canvas = document.createElement('canvas')
  const img = originalMap.image
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height

  // Front face = left half, Back face = right half
  const fw = w / 2
  const cx = fw / 2

  // Dark background full texture
  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, w, h)

  // === FRONT FACE (left half) ===
  // Gold border
  const m = Math.round(fw * 0.06)
  ctx.beginPath()
  ctx.roundRect(m, m, fw - m * 2, h - m * 2, Math.round(fw * 0.04))
  ctx.strokeStyle = '#d4af37'
  ctx.lineWidth = Math.max(2, fw * 0.006)
  ctx.stroke()

  ctx.textAlign = 'center'

  // Top label
  ctx.fillStyle = 'rgba(212, 175, 55, 0.5)'
  ctx.font = `500 ${Math.round(h * 0.03)}px Rajdhani, sans-serif`
  ctx.fillText('D E V E L O P E R   B A D G E', cx, h * 0.07)

  // Gold line top
  ctx.fillStyle = '#d4af37'
  ctx.fillRect(fw * 0.1, h * 0.09, fw * 0.8, 2)

  // Avatar circle
  const avatarR = h * 0.07
  ctx.beginPath()
  ctx.arc(cx, h * 0.22, avatarR, 0, Math.PI * 2)
  ctx.strokeStyle = '#d4af37'
  ctx.lineWidth = 2
  ctx.stroke()

  // Initials
  ctx.fillStyle = '#d4af37'
  ctx.font = `bold ${Math.round(h * 0.06)}px Orbitron, sans-serif`
  ctx.fillText('PJ', cx, h * 0.245)

  // Name
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.round(h * 0.065)}px Orbitron, sans-serif`
  ctx.fillText('PAULO', cx, h * 0.4)

  // Role
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.font = `500 ${Math.round(h * 0.032)}px Rajdhani, sans-serif`
  ctx.fillText('FULL STACK DEVELOPER', cx, h * 0.46)

  // Divider
  ctx.fillStyle = 'rgba(212, 175, 55, 0.3)'
  ctx.fillRect(fw * 0.15, h * 0.51, fw * 0.7, 2)

  // Skills
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.font = `400 ${Math.round(h * 0.025)}px Rajdhani, sans-serif`
  ctx.fillText('React • Node.js • TypeScript', cx, h * 0.56)
  ctx.fillText('Python • MongoDB • Git', cx, h * 0.60)

  // Logo
  ctx.fillStyle = '#d4af37'
  ctx.font = `bold ${Math.round(h * 0.05)}px Orbitron, sans-serif`
  ctx.fillText('<DevJack/>', cx, h * 0.72)

  // Gold line bottom
  ctx.fillStyle = '#d4af37'
  ctx.fillRect(fw * 0.1, h * 0.88, fw * 0.8, 2)

  // Bottom text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.font = `400 ${Math.round(h * 0.025)}px Rajdhani, sans-serif`
  ctx.fillText('P O R T A F O L I O   2 0 2 5', cx, h * 0.93)

  // === BACK FACE (right half) - photo ===
  if (photoImage) {
    const bx = fw
    const imgW = photoImage.width
    const imgH = photoImage.height
    const scale = Math.max(fw / imgW, h / imgH)
    const sw = imgW * scale
    const sh = imgH * scale
    const ox = bx + (fw - sw) / 2
    const oy = (h - sh) / 2
    ctx.save()
    ctx.beginPath()
    ctx.rect(fw, 0, fw, h)
    ctx.clip()
    ctx.drawImage(photoImage, ox, oy, sw, sh)
    ctx.restore()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.flipY = originalMap.flipY
  tex.colorSpace = originalMap.colorSpace
  tex.needsUpdate = true
  return tex
}

function Band({ maxSpeed = 50, minSpeed = 0 }) {
  const band = useRef()
  const fixed = useRef()
  const j1 = useRef()
  const j2 = useRef()
  const j3 = useRef()
  const card = useRef()
  const vec = new THREE.Vector3()
  const ang = new THREE.Vector3()
  const rot = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const segmentProps = { type: 'dynamic', canSleep: true, colliders: false, angularDamping: 4, linearDamping: 4 }
  const { nodes, materials } = useGLTF('/lanyard/card.glb')
  const texture = useTexture('/lanyard/lanyard.png')
  const photo = useTexture('/lanyard/yo.jpeg')
  const badgeTexture = useState(() => createBadgeTexture(materials.base.map, photo.image))[0]
  const [curve] = useState(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
    ])
  )
  const [dragged, drag] = useState(false)
  const [hovered, hover] = useState(false)

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1])
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.5, 0]])

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab'
      return () => void (document.body.style.cursor = 'auto')
    }
  }, [hovered, dragged])

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      dir.copy(vec).sub(state.camera.position).normalize()
      vec.add(dir.multiplyScalar(state.camera.position.length()))
        ;[card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp())
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      })
    }
    if (fixed.current) {
      ;[j1, j2].forEach((ref) => {
        if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation())
        const clampedDistance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())))
        ref.current.lerped.lerp(ref.current.translation(), delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed)))
      })
      curve.points[0].copy(j3.current.translation())
      curve.points[1].copy(j2.current.lerped)
      curve.points[2].copy(j1.current.lerped)
      curve.points[3].copy(fixed.current.translation())
      band.current.geometry.setPoints(curve.getPoints(32))
      ang.copy(card.current.angvel())
      rot.copy(card.current.rotation())
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z })
    }
  })

  curve.curveType = 'chordal'
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[2, 0, 0]} ref={card} {...segmentProps} type={dragged ? 'kinematicPosition' : 'dynamic'}>
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e) => (e.target.releasePointerCapture(e.pointerId), drag(false))}
            onPointerDown={(e) => (
              e.target.setPointerCapture(e.pointerId),
              drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())))
            )}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={badgeTexture}
                map-anisotropy={16}
                clearcoat={1}
                clearcoatRoughness={0.15}
                roughness={0.9}
                metalness={0.8}
              />
            </mesh>
            <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="white"
          depthTest={false}
          resolution={[1000, 1000]}
          useMap
          map={texture}
          repeat={[-4, 1]}
          lineWidth={1}
        />
      </mesh>
    </>
  )
}

function Lanyard() {
  return (
    <div className="lanyard-wrapper">
      <Canvas
        camera={{ position: [0, 0, 14], fov: 20 }}
        dpr={[1, 2]}
        gl={{ alpha: true }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), 0)}
      >
        <ambientLight intensity={Math.PI} />
        <Physics gravity={[0, -40, 0]} timeStep={1 / 60}>
          <Band />
        </Physics>
        <Environment blur={0.75}>
          <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={10} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
        </Environment>
      </Canvas>
    </div>
  )
}

function ProjectModal({ project, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  if (!project) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><HiX /></button>
        <div className="modal-image" style={{ backgroundImage: `url(${project.image})` }} />
        <div className="modal-body">
          <h3 className="modal-title">{project.title}</h3>
          <div className="modal-techs">
            {project.techs.map((tech, j) => (
              <span key={j} className="modal-tech">
                {tech.icon}
                {tech.name}
              </span>
            ))}
          </div>
          <p className="modal-description">{project.description}</p>
          {project.link && project.link !== '#' && (
            <a href={project.link} target="_blank" rel="noopener noreferrer" className="modal-link">
              <HiExternalLink /> Ver proyecto
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function ChromaCard({ project, onClick }) {
  const cardRef = useRef(null)

  const handleMouseMove = (e) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    card.style.setProperty('--mouse-x', `${x}px`)
    card.style.setProperty('--mouse-y', `${y}px`)
  }

  return (
    <div
      ref={cardRef}
      className="project-card chroma-card"
      onMouseMove={handleMouseMove}
      onClick={onClick}
    >
      <div className="chroma-glow" />
      <div className="chroma-border" />
      <div className="chroma-content">
        <div className="project-card-img-wrapper">
          <div className="project-card-img" style={{ backgroundImage: `url(${project.image})` }} />
          <div className="project-card-overlay" />
        </div>
        <div className="project-card-info">
          <h3 className="project-card-title">{project.title}</h3>
          <div className="project-card-techs">
            {project.techs.map((tech, j) => (
              <span key={j} className="project-card-tech">
                {tech.icon}
                {tech.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const PROJECTS_DATA = [
  {
    title: 'Sumaq Mayu - Casa Hotel',
    image: '/projects/sumaqmayu.jpeg',
    description: 'Desarrollo de la página web para Sumaq Mayu Casa Hotel. Incluye sistema de reservas, galería de habitaciones, información de servicios y diseño responsivo optimizado para atraer turistas a la región.',
    techs: [
      { icon: <SiReact />, name: 'React' },
      { icon: <SiJavascript />, name: 'JavaScript' },
      { icon: <SiCss3 />, name: 'CSS3' },
    ],
    link: 'https://pagina-web-sumaqmayu.vercel.app/',
  },
  {
    title: 'Sistema de Convocatorias - Poder Judicial',
    image: '/projects/convocatoria-pj.png',
    description: 'Sistema web para gestionar convocatorias de personal del Poder Judicial. Permite publicar convocatorias, recibir postulaciones, evaluar candidatos y generar resultados. Panel administrativo con autenticación y roles de usuario.',
    techs: [
      { icon: <SiNextdotjs />, name: 'Next.js' },
      { icon: <SiReact />, name: 'React' },
      { icon: <SiTypescript />, name: 'TypeScript' },
    ],
    link: 'https://sistema-convocatoria-pj.vercel.app/login',
  },
  {
    title: 'App Delivery de Agua - Iquitos',
    image: '/projects/agua-iquitos.jpeg',
    description: 'Aplicación móvil para una empresa de reparto de agua en la ciudad de Iquitos. Los clientes pueden realizar pedidos, hacer seguimiento en tiempo real de su delivery y gestionar sus direcciones de entrega. Desarrollada con Expo Go y React Native.',
    techs: [
      { icon: <SiExpo />, name: 'Expo Go' },
      { icon: <SiReact />, name: 'React Native' },
      { icon: <SiJavascript />, name: 'JavaScript' },
    ],
    link: '#',
  },
  {
    title: 'Automatización de Reportes - CSJL',
    image: '/projects/reportes-csjl.jpeg',
    description: 'Herramienta de automatización de reportes judiciales para la Corte Superior de Justicia de Loreto. Genera reportes automáticos a partir de datos del sistema judicial, reduciendo significativamente el tiempo de elaboración manual de documentos.',
    techs: [
      { icon: <SiPython />, name: 'Python' },
    ],
    link: '#',
  },
]

const TIMELINE_DATA = [
  {
    year: '2024',
    type: 'work',
    title: 'Full Stack Developer',
    subtitle: 'Empresa Tech',
    description: 'Desarrollo de aplicaciones web con React, Node.js y MongoDB. Liderazgo técnico en proyectos internos.',
    image: '/timeline/work-2024.jpeg',
  },
  {
    year: '2023',
    type: 'education',
    title: 'Certificación React Advanced',
    subtitle: 'Plataforma Online',
    description: 'Patrones avanzados, rendimiento, testing y arquitectura de aplicaciones React.',
    image: '/timeline/edu-2023.jpeg',
  },
  {
    year: '2022',
    type: 'work',
    title: 'Frontend Developer',
    subtitle: 'Startup XYZ',
    description: 'Diseño e implementación de interfaces responsivas y accesibles con React y Tailwind CSS.',
    image: '/timeline/work-2022.jpeg',
  },
  {
    year: '2021',
    type: 'education',
    title: 'Ingeniería en Sistemas',
    subtitle: 'Universidad Nacional',
    description: 'Fundamentos de programación, bases de datos, redes y arquitectura de software.',
    image: '/timeline/edu-2021.jpeg',
  },
]

function Timeline() {
  return (
    <div className="timeline">
      {TIMELINE_DATA.map((item, i) => (
        <div
          key={i}
          className="timeline-item"
          style={{ top: `${6 + i * 2.5}rem`, zIndex: i + 1 }}
        >
          <div className="timeline-node">
            <span className="timeline-node-icon">
              {item.type === 'work' ? <HiBriefcase /> : <HiAcademicCap />}
            </span>
          </div>
          <div className="timeline-content">
            <div className="timeline-img-wrapper">
              <div className="timeline-img" style={{ backgroundImage: `url(${item.image})` }} />
            </div>
            <div className="timeline-body">
              <span className="timeline-year">{item.year}</span>
              <h3 className="timeline-title">{item.title}</h3>
              <span className="timeline-subtitle">{item.subtitle}</span>
              <p className="timeline-desc">{item.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function GooeyNav({ items, animationTime = 600, particleCount = 15, particleDistances = [90, 10], particleR = 100, timeVariance = 300, colors = [1, 2, 3, 1, 2, 3, 1, 4], initialActiveIndex = 0 }) {
  const containerRef = useRef(null)
  const navRef = useRef(null)
  const filterRef = useRef(null)
  const textRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex)

  const noise = (n = 1) => n / 2 - Math.random() * n

  const getXY = (distance, pointIndex, totalPoints) => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180)
    return [distance * Math.cos(angle), distance * Math.sin(angle)]
  }

  const createParticle = (i, t, d, r) => {
    let rotate = noise(r / 10)
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
    }
  }

  const makeParticles = (element) => {
    const d = particleDistances
    const r = particleR
    const bubbleTime = animationTime * 2 + timeVariance
    element.style.setProperty('--time', `${bubbleTime}ms`)

    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2)
      const p = createParticle(i, t, d, r)
      element.classList.remove('active')

      setTimeout(() => {
        const particle = document.createElement('span')
        const point = document.createElement('span')
        particle.classList.add('particle')
        particle.style.setProperty('--start-x', `${p.start[0]}px`)
        particle.style.setProperty('--start-y', `${p.start[1]}px`)
        particle.style.setProperty('--end-x', `${p.end[0]}px`)
        particle.style.setProperty('--end-y', `${p.end[1]}px`)
        particle.style.setProperty('--time', `${p.time}ms`)
        particle.style.setProperty('--scale', `${p.scale}`)
        particle.style.setProperty('--color', `var(--color-${p.color}, white)`)
        particle.style.setProperty('--rotate', `${p.rotate}deg`)
        point.classList.add('point')
        particle.appendChild(point)
        element.appendChild(particle)
        requestAnimationFrame(() => { element.classList.add('active') })
        setTimeout(() => { try { element.removeChild(particle) } catch { } }, t)
      }, 30)
    }
  }

  const updateEffectPosition = (element) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const pos = element.getBoundingClientRect()
    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`
    }
    Object.assign(filterRef.current.style, styles)
    Object.assign(textRef.current.style, styles)
    textRef.current.innerText = element.innerText
  }

  const handleClick = (e, index) => {
    const liEl = e.currentTarget
    if (activeIndex === index) return
    setActiveIndex(index)
    updateEffectPosition(liEl)
    if (filterRef.current) {
      filterRef.current.querySelectorAll('.particle').forEach((p) => filterRef.current.removeChild(p))
    }
    if (textRef.current) {
      textRef.current.classList.remove('active')
      void textRef.current.offsetWidth
      textRef.current.classList.add('active')
    }
    if (filterRef.current) makeParticles(filterRef.current)
  }

  useEffect(() => {
    if (!navRef.current || !containerRef.current) return
    const activeLi = navRef.current.querySelectorAll('li')[activeIndex]
    if (activeLi) {
      updateEffectPosition(activeLi)
      textRef.current?.classList.add('active')
    }
    const resizeObserver = new ResizeObserver(() => {
      const currentActiveLi = navRef.current?.querySelectorAll('li')[activeIndex]
      if (currentActiveLi) updateEffectPosition(currentActiveLi)
    })
    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [activeIndex])

  return (
    <div className="gooey-nav-container" ref={containerRef}>
      <nav>
        <ul ref={navRef}>
          {items.map((item, index) => (
            <li key={index} className={activeIndex === index ? 'active' : ''} onClick={(e) => handleClick(e, index)}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <span className="effect filter" ref={filterRef} />
      <span className="effect text" ref={textRef} />
    </div>
  )
}

function ProfileCard({ avatarUrl, name, title, handle, status, contactText, onContactClick, showUserInfo = true }) {
  const cardRef = useRef(null)
  const [isActive, setIsActive] = useState(false)

  const handlePointerMove = (e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const pointerFromLeft = x / rect.width
    const pointerFromTop = y / rect.height
    const pointerFromCenter = Math.sqrt(
      Math.pow((x - centerX) / centerX, 2) +
      Math.pow((y - centerY) / centerY, 2)
    )

    const rotateX = ((x - centerX) / centerX) * 15
    const rotateY = ((y - centerY) / centerY) * -15

    const bgX = 50 + ((x - centerX) / centerX) * 20
    const bgY = 50 + ((y - centerY) / centerY) * 20

    cardRef.current.style.setProperty('--pointer-x', `${(x / rect.width) * 100}%`)
    cardRef.current.style.setProperty('--pointer-y', `${(y / rect.height) * 100}%`)
    cardRef.current.style.setProperty('--pointer-from-center', pointerFromCenter.toFixed(2))
    cardRef.current.style.setProperty('--pointer-from-left', pointerFromLeft.toFixed(2))
    cardRef.current.style.setProperty('--pointer-from-top', pointerFromTop.toFixed(2))
    cardRef.current.style.setProperty('--rotate-x', `${rotateX}deg`)
    cardRef.current.style.setProperty('--rotate-y', `${rotateY}deg`)
    cardRef.current.style.setProperty('--background-x', `${bgX}%`)
    cardRef.current.style.setProperty('--background-y', `${bgY}%`)
  }

  const handlePointerEnter = () => setIsActive(true)
  const handlePointerLeave = () => {
    setIsActive(false)
    if (cardRef.current) {
      cardRef.current.style.setProperty('--rotate-x', '0deg')
      cardRef.current.style.setProperty('--rotate-y', '0deg')
    }
  }

  return (
    <div
      ref={cardRef}
      className={`pc-card-wrapper ${isActive ? 'active' : ''}`}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <div className="pc-behind" />
      <div className="pc-card-shell">
        <div className={`pc-card ${isActive ? 'active' : ''}`}>
          <div className="pc-inside" />
          <div className="pc-shine" />
          <div className="pc-glare" />
          <div className="pc-content pc-avatar-content">
            <img src={avatarUrl} alt={name} className="avatar" />
          </div>
          <div className="pc-content">
            <div className="pc-details">
              <h3>{name}</h3>
              <p>{title}</p>
            </div>
          </div>
          {showUserInfo && (
            <div className="pc-user-info">
              <div className="pc-user-details">
                <div className="pc-mini-avatar">
                  <img src={avatarUrl} alt={name} />
                </div>
                <div className="pc-user-text">
                  <span className="pc-handle">{handle}</span>
                  <span className="pc-status">{status}</span>
                </div>
              </div>
              <button className="pc-contact-btn" onClick={onContactClick}>
                {contactText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SuccessModal({ onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    const autoClose = setTimeout(onClose, 5000)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
      clearTimeout(autoClose)
    }
  }, [onClose])

  return (
    <div className="success-modal-backdrop" onClick={onClose}>
      <div className="success-modal" onClick={(e) => e.stopPropagation()}>
        <div className="success-modal-icon">
          <HiCheckCircle />
        </div>
        <h3 className="success-modal-title">¡Mensaje enviado!</h3>
        <p className="success-modal-text">
          Paulo Meza se pondrá en contacto contigo en breve.
        </p>
        <button className="success-modal-btn" onClick={onClose}>Entendido</button>
      </div>
    </div>
  )
}

const NAV_ITEMS = [
  { label: 'Inicio', href: '#' },
  { label: 'Sobre mí', href: '#sobre-mi' },
  { label: 'Proyectos', href: '#proyectos' },
  { label: 'Contacto', href: '#contacto' },
]

function App() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const heroRef = useRef()
  const aboutRef = useRef()
  const [aboutVisible, setAboutVisible] = useState(false)
  const [radialOpen, setRadialOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [line1Done, setLine1Done] = useState(false)
  const [line2Done, setLine2Done] = useState(false)
  const [line3Done, setLine3Done] = useState(false)
  const formRef = useRef()
  const [formStatus, setFormStatus] = useState('idle') // idle | sending | error
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const onLine1Done = useCallback(() => setLine1Done(true), [])
  const onLine2Done = useCallback(() => setLine2Done(true), [])
  const onLine3Done = useCallback(() => setLine3Done(true), [])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
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

  useEffect(() => {
    if (!aboutRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAboutVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.01 }
    )
    observer.observe(aboutRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div id="app">
      <TargetCursor />
      <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
        <a href="#" className="header-logo">
          <span className="header-logo-bracket">&lt;</span>
          DevJack
          <span className="header-logo-bracket">/&gt;</span>
        </a>
        <GooeyNav
          items={NAV_ITEMS}
          particleCount={12}
          colors={[1, 2, 3, 1, 2, 3, 1, 4]}
        />
      </header>
      <div className="radial-menu">
        <div className={`radial-backdrop ${radialOpen ? 'visible' : ''}`} onClick={() => setRadialOpen(false)} />
        <button className={`radial-toggle ${radialOpen ? 'active' : ''}`} onClick={() => setRadialOpen(!radialOpen)}>
          <span /><span /><span />
        </button>
        <div className={`radial-items ${radialOpen ? 'open' : ''}`}>
          <a href="#" className="radial-item" onClick={() => setRadialOpen(false)}><HiHome /><span className="radial-label">Inicio</span></a>
          <a href="#sobre-mi" className="radial-item" onClick={() => setRadialOpen(false)}><HiUser /><span className="radial-label">Sobre mí</span></a>
          <a href="#proyectos" className="radial-item" onClick={() => setRadialOpen(false)}><HiCode /><span className="radial-label">Proyectos</span></a>
          <a href="#contacto" className="radial-item" onClick={() => setRadialOpen(false)}><HiMail /><span className="radial-label">Contacto</span></a>
        </div>
      </div>
      <div className="hero-wrapper" ref={heroRef}>
        <section className="hero">
          <div className="hero-text">
            <p className="hero-greeting">
              <DecryptedText text="Bienvenido a" speed={40} delay={500} revealSpeed={70} scrambleDuration={400} onDone={onLine1Done} />
            </p>
            <h1>
              {line1Done && <DecryptedText text="Mi Portafolio" speed={35} delay={200} revealSpeed={80} scrambleDuration={500} onDone={onLine2Done} />}
            </h1>
            <div className={`hero-line ${line2Done ? 'hero-line--visible' : ''}`}></div>
            <p className="hero-subtitle">
              {line2Done && <DecryptedText text="Paulo | Desarrollador Full Stack" speed={30} delay={400} revealSpeed={45} scrambleDuration={400} onDone={onLine3Done} />}
            </p>
            <div className={`hero-extras ${line3Done ? 'hero-extras--visible' : ''}`}>
              <div className="hero-status">
                <span className="hero-status-dot" />
                <span className="hero-status-text">Disponible para trabajar</span>
              </div>
              <div className="hero-socials">
                <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="hero-social-link" aria-label="GitHub">
                  <SiGithub />
                </a>
                <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" className="hero-social-link" aria-label="LinkedIn">
                  <SiLinkedin />
                </a>
                <a href="mailto:tu@email.com" className="hero-social-link" aria-label="Email">
                  <HiOutlineMail />
                </a>
              </div>
            </div>
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
          <LogoLoop />
        </section>
      </div>
      <section id="sobre-mi" className="about-section" ref={aboutRef}>
        <div className="about-header">
          <h2 className="about-title">Sobre mí</h2>
          <div className="about-title-line" />
        </div>
        <div className="about-content">
          <div className="about-left">
            <Timeline />
          </div>
          <div className="about-right">
            {aboutVisible && <Lanyard />}
          </div>
        </div>
        <div className="quote-block">
          <div className="quote-line-left" />
          <blockquote className="quote-text">
            Transformo ideas en experiencias digitales
          </blockquote>
          <span className="quote-author">— Paulo Meza</span>
          <div className="quote-line-right" />
        </div>
      </section>
      <section id="proyectos" className="projects-section">
        <div className="projects-header">
          <h2 className="projects-title">Proyectos</h2>
          <div className="projects-title-line" />
        </div>
        <div className="projects-grid chroma-grid">
          {PROJECTS_DATA.map((project, i) => (
            <ChromaCard key={i} project={project} onClick={() => setSelectedProject(project)} />
          ))}
        </div>
      </section>
      {selectedProject && (
        <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
      {showSuccessModal && (
        <SuccessModal onClose={() => setShowSuccessModal(false)} />
      )}
      <section id="contacto" className="contact-section">
        <div className="contact-header">
          <h2 className="contact-title">Contacto</h2>
          <div className="contact-title-line" />
        </div>
        <div className="contact-content">
          <div className="contact-form-wrapper">
            <h3 className="contact-form-title">Envíame un mensaje</h3>
            <p className="contact-form-subtitle">¿Tienes un proyecto en mente? ¡Hablemos!</p>
            <form
              ref={formRef}
              className="contact-form"
              onSubmit={(e) => {
                e.preventDefault()
                if (formStatus === 'sending') return
                setFormStatus('sending')
                emailjs.sendForm(
                  import.meta.env.VITE_EMAILJS_SERVICE_ID,
                  import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
                  formRef.current,
                  import.meta.env.VITE_EMAILJS_PUBLIC_KEY
                )
                  .then(() => {
                    setFormStatus('idle')
                    formRef.current.reset()
                    setShowSuccessModal(true)
                  })
                  .catch(() => {
                    setFormStatus('error')
                    setTimeout(() => setFormStatus('idle'), 4000)
                  })
              }}
            >
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Nombre</label>
                  <input type="text" id="name" name="from_name" placeholder="Tu nombre" required />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="reply_to" placeholder="tu@email.com" required />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="subject">Asunto</label>
                <input type="text" id="subject" name="subject" placeholder="¿De qué quieres hablar?" required />
              </div>
              <div className="form-group">
                <label htmlFor="message">Mensaje</label>
                <textarea id="message" name="message" rows="5" placeholder="Cuéntame sobre tu proyecto..." required />
              </div>
              <button type="submit" className="contact-submit" disabled={formStatus === 'sending'}>
                <HiMail />
                {formStatus === 'sending' ? 'Enviando...' : formStatus === 'error' ? 'Error al enviar' : 'Enviar mensaje'}
              </button>
              {formStatus === 'error' && (
                <p className="form-feedback form-feedback--error">Hubo un error. Intenta de nuevo o escríbeme directo por email.</p>
              )}
            </form>
          </div>
          <div className="profile-card-section">
            <ProfileCard
              avatarUrl="/lanyard/yo.jpeg"
              name="Paulo"
              title="Full Stack Developer"
              handle="@devjack"
              status="Disponible para proyectos"
              contactText="Contactar"
              onContactClick={() => document.getElementById('name')?.focus()}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
