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

const applySequenceStyles = (diagram: Element) => {
  const svg = diagram.querySelector('svg')
  if (!svg) {
    console.log('No SVG found in diagram')
    return false
  }
  
  console.log('Checking diagram:', {
    svgClasses: svg.className.baseVal || svg.className,
    viewBox: svg.getAttribute('viewBox'),
    innerHTML: svg.innerHTML.substring(0, 200)
  })
  
  // Проверяем все возможные признаки sequence диаграммы
  const svgContent = svg.innerHTML || ''
  const svgText = svg.textContent || ''
  const viewBox = svg.getAttribute('viewBox') || ''
  
  // Ищем актеров разными способами
  const hasActorRect = svg.querySelector('rect[class*="actor"]') || svg.querySelector('rect[id*="actor"]')
  const hasActorG = svg.querySelector('g[class*="actor"]') || svg.querySelector('g[id*="actor"]')
  const hasActorText = svgText.includes('Developer') || svgText.includes('Kubernetes') || svgText.includes('Client')
  
  // Ищем сообщения
  const hasMessagePath = svg.querySelector('path[class*="message"]') || svg.querySelector('path[id*="message"]')
  const hasMessageLine = svg.querySelector('line[class*="message"]') || svg.querySelector('line[id*="message"]')
  
  // Sequence диаграммы обычно имеют много вертикальных линий (стрелки между актерами)
  const hasVerticalLines = svg.querySelectorAll('line[stroke]').length > 5
  
  // Проверяем структуру - sequence имеет прямоугольники актеров сверху
  const rects = svg.querySelectorAll('rect')
  const hasTopRects = Array.from(rects).some((r: Element) => {
    const y = parseFloat((r as SVGRectElement).getAttribute('y') || '0')
    return y < 100 // Актеры обычно вверху
  })
  
  const isSequence = (hasActorRect || hasActorG || hasActorText) && 
                    (hasMessagePath || hasMessageLine || hasVerticalLines || hasTopRects)
  
  console.log('Sequence check result:', {
    hasActorRect: !!hasActorRect,
    hasActorG: !!hasActorG,
    hasActorText,
    hasMessagePath: !!hasMessagePath,
    hasMessageLine: !!hasMessageLine,
    hasVerticalLines,
    hasTopRects,
    isSequence
  })
  
  if (isSequence) {
    console.log('✓✓✓ FOUND SEQUENCE DIAGRAM! Applying styles...')
    
    // Добавляем класс
    diagram.classList.add('sequence-diagram')
    
    // Применяем стили к контейнеру
    const container = diagram as HTMLElement
    container.style.setProperty('max-height', '55vh', 'important')
    container.style.setProperty('overflow', 'hidden', 'important')
    
    // Применяем стили к SVG
    const svgEl = svg as HTMLElement
    svgEl.style.setProperty('transform', 'scaleY(0.5)', 'important')
    svgEl.style.setProperty('transform-origin', 'top center', 'important')
    svgEl.style.setProperty('max-height', '55vh', 'important')
    svgEl.style.setProperty('width', '100%', 'important')
    svgEl.style.setProperty('height', 'auto', 'important')
    
    console.log('✓✓✓ Styles APPLIED!', {
      containerMaxHeight: container.style.maxHeight,
      svgTransform: svgEl.style.transform,
      svgMaxHeight: svgEl.style.maxHeight,
      containerClass: container.className
    })
    
    return true
  }
  
  return false
}

const initDiagrams = () => {
  const diagrams = document.querySelectorAll('.mermaid')
  console.log(`Found ${diagrams.length} mermaid diagrams`)
  
  diagrams.forEach((diagram) => {
    // Применяем стили к sequence диаграммам ПЕРЕД добавлением zoom контролов
    applySequenceStyles(diagram)
    
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
  console.log('Layout mounted, initializing mermaid zoom and sequence styles')
  
  // Применяем стили несколько раз с задержками (диаграммы могут рендериться асинхронно)
  setTimeout(initDiagrams, 100)
  setTimeout(initDiagrams, 500)
  setTimeout(initDiagrams, 1000)
  setTimeout(initDiagrams, 2000)
  
  // Периодическая проверка
  intervalId = window.setInterval(() => {
    initDiagrams()
    // Также применяем стили отдельно
    document.querySelectorAll('.mermaid').forEach(applySequenceStyles)
  }, 2000)
  
  // Наблюдаем за изменениями DOM
  const observer = new MutationObserver(() => {
    setTimeout(() => {
      document.querySelectorAll('.mermaid').forEach(applySequenceStyles)
    }, 100)
  })
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
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
