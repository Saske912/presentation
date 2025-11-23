<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const zoomLevels = new Map<Element, number>()

const applyZoom = (container: Element, level: number) => {
  const svg = container.querySelector('svg')
  if (!svg) return

  zoomLevels.set(container, level)
  svg.style.transform = `scale(${level})`
  svg.style.transformOrigin = 'top left'
  svg.style.transition = 'transform 0.2s ease'
}

const createZoomControls = (container: Element) => {
  if (container.querySelector('.mermaid-zoom-controls')) return

  console.log('Adding zoom controls')

  const controls = document.createElement('div')
  controls.className = 'mermaid-zoom-controls'
  controls.innerHTML = `
    <button class="zoom-btn zoom-in" title="Увеличить">+</button>
    <button class="zoom-btn zoom-reset" title="Сбросить">⟲</button>
    <button class="zoom-btn zoom-out" title="Уменьшить">−</button>
    <span class="zoom-level">100%</span>
  `
  container.appendChild(controls)

  const currentZoom = () => zoomLevels.get(container) || 1
  const updateZoomDisplay = () => {
    const level = currentZoom()
    const display = controls.querySelector('.zoom-level')
    if (display) display.textContent = `${Math.round(level * 100)}%`
  }

  controls.querySelector('.zoom-in')?.addEventListener('click', (e) => {
    e.stopPropagation()
    const newLevel = Math.min(currentZoom() + 0.1, 3)
    applyZoom(container, newLevel)
    updateZoomDisplay()
  })

  controls.querySelector('.zoom-out')?.addEventListener('click', (e) => {
    e.stopPropagation()
    const newLevel = Math.max(currentZoom() - 0.1, 0.3)
    applyZoom(container, newLevel)
    updateZoomDisplay()
  })

  controls.querySelector('.zoom-reset')?.addEventListener('click', (e) => {
    e.stopPropagation()
    applyZoom(container, 1)
    updateZoomDisplay()
  })

  updateZoomDisplay()
}

const handleWheel = (e: WheelEvent, container: Element) => {
  if (!e.ctrlKey && !e.metaKey) return

  e.preventDefault()
  e.stopPropagation()

  const currentLevel = zoomLevels.get(container) || 1
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newLevel = Math.max(0.3, Math.min(3, currentLevel + delta))

  applyZoom(container, newLevel)

  const controls = container.querySelector('.mermaid-zoom-controls')
  const display = controls?.querySelector('.zoom-level')
  if (display) display.textContent = `${Math.round(newLevel * 100)}%`
}

const initDiagrams = () => {
  const diagrams = document.querySelectorAll('.mermaid')
  console.log(`Found ${diagrams.length} mermaid diagrams`)
  
  diagrams.forEach((diagram) => {
    if (!zoomLevels.has(diagram)) {
      zoomLevels.set(diagram, 1)
      createZoomControls(diagram)
      diagram.addEventListener('wheel', (e) => handleWheel(e as WheelEvent, diagram), {
        passive: false,
      })
    }
  })
}

let intervalId: number | null = null

onMounted(() => {
  console.log('Layout mounted, initializing mermaid zoom')
  setTimeout(initDiagrams, 300)
  setTimeout(initDiagrams, 1000)
  intervalId = window.setInterval(initDiagrams, 2000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<template>
  <div class="slidev-layout">
    <slot />
  </div>
</template>

<style scoped>
.slidev-layout {
  padding: 1rem 2rem 3rem 2rem;
  min-height: 100vh;
  height: auto;
  max-height: none;
  box-sizing: border-box;
  overflow: visible;
  display: block;
}
</style>
