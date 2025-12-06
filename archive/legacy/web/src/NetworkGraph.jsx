import { useEffect, useRef } from 'react'

export default function NetworkGraph({ data }) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    
    const w = rect.width
    const h = rect.height
    const cx = w / 2
    const cy = h / 2

    // 노드 데이터
    const identity = { x: cx, y: cy, r: 35, color: '#ffd700', label: 'YOU' }
    
    const worlds = [
      { x: cx + 100, y: cy - 60, r: 25, color: '#4fc3f7', label: 'Seoul' },
      { x: cx + 110, y: cy + 50, r: 25, color: '#81c784', label: 'Clark' },
      { x: cx - 110, y: cy + 30, r: 25, color: '#ffb74d', label: 'Kathmandu' },
    ]
    
    const packs = [
      { x: cx - 90, y: cy - 70, r: 18, color: '#e91e63', label: 'school' },
      { x: cx - 70, y: cy + 90, r: 18, color: '#3f51b5', label: 'visa' },
      { x: cx + 50, y: cy + 95, r: 18, color: '#00bcd4', label: 'cmms' },
      { x: cx, y: cy - 95, r: 18, color: '#9c27b0', label: 'memory' },
    ]

    let time = 0

    function drawNode(node, icon) {
      // 글로우
      const glow = ctx.createRadialGradient(node.x, node.y, node.r * 0.5, node.x, node.y, node.r * 1.8)
      glow.addColorStop(0, node.color + '60')
      glow.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.r * 1.8, 0, Math.PI * 2)
      ctx.fillStyle = glow
      ctx.fill()

      // 원
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
      ctx.fillStyle = node.color
      ctx.fill()

      // 아이콘
      ctx.fillStyle = '#fff'
      ctx.font = `${node.r * 0.8}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(icon, node.x, node.y)

      // 라벨
      ctx.font = '11px sans-serif'
      ctx.fillStyle = '#ccc'
      ctx.fillText(node.label, node.x, node.y + node.r + 12)
    }

    function drawConnection(from, to, animated = true) {
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      ctx.stroke()

      if (animated) {
        const progress = (Math.sin(time * 3 + from.x * 0.01) + 1) / 2
        const px = from.x + (to.x - from.x) * progress
        const py = from.y + (to.y - from.y) * progress
        ctx.beginPath()
        ctx.arc(px, py, 3, 0, Math.PI * 2)
        ctx.fillStyle = '#4fc3f7'
        ctx.fill()
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h)
      
      // 배경 그라디언트
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h))
      bg.addColorStop(0, '#1a1a2e')
      bg.addColorStop(1, '#0d0d1a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // 연결선
      worlds.forEach(world => drawConnection(identity, world))
      packs.forEach(pack => drawConnection(identity, pack))

      // 노드 그리기
      worlds.forEach(world => drawNode(world, '🌍'))
      packs.forEach(pack => {
        const icons = { school: '📚', visa: '✈️', cmms: '🏭', memory: '🧠' }
        drawNode(pack, icons[pack.label] || '📦')
      })
      drawNode(identity, '⭐')

      time += 0.02
      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => cancelAnimationFrame(animationRef.current)
  }, [data])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '300px',
        borderRadius: '12px'
      }}
    />
  )
}
