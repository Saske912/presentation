import { onMounted } from 'vue'

export default {
  name: 'MermaidZoom',
  setup() {
    onMounted(() => {
      console.log('Mermaid Zoom: Initializing...')
      
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
        // Проверяем, не добавлены ли уже контролы
        if (container.querySelector('.mermaid-zoom-controls')) return

        console.log('Adding zoom controls to diagram')

        const controls = document.createElement('div')
        controls.className = 'mermaid-zoom-controls'
        controls.innerHTML = `
          <button class="zoom-btn zoom-in" title="Увеличить (Ctrl + колесико вверх)">+</button>
          <button class="zoom-btn zoom-reset" title="Сбросить масштаб">⟲</button>
          <button class="zoom-btn zoom-out" title="Уменьшить (Ctrl + колесико вниз)">−</button>
          <span class="zoom-level">100%</span>
        `
        container.appendChild(controls)

        const currentZoom = () => zoomLevels.get(container) || 1
        const updateZoomDisplay = () => {
          const level = currentZoom()
          const display = controls.querySelector('.zoom-level')
          if (display) display.textContent = `${Math.round(level * 100)}%`
        }

        // Кнопка увеличения
        controls.querySelector('.zoom-in')?.addEventListener('click', (e) => {
          e.stopPropagation()
          const newLevel = Math.min(currentZoom() + 0.1, 3)
          applyZoom(container, newLevel)
          updateZoomDisplay()
        })

        // Кнопка уменьшения
        controls.querySelector('.zoom-out')?.addEventListener('click', (e) => {
          e.stopPropagation()
          const newLevel = Math.max(currentZoom() - 0.1, 0.3)
          applyZoom(container, newLevel)
          updateZoomDisplay()
        })

        // Кнопка сброса
        controls.querySelector('.zoom-reset')?.addEventListener('click', (e) => {
          e.stopPropagation()
          applyZoom(container, 1)
          updateZoomDisplay()
        })

        updateZoomDisplay()
      }

      const handleWheel = (e: WheelEvent, container: Element) => {
        // Только если зажат Ctrl или Meta (Command на Mac)
        if (!e.ctrlKey && !e.metaKey) return

        e.preventDefault()
        e.stopPropagation()

        const currentLevel = zoomLevels.get(container) || 1
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        const newLevel = Math.max(0.3, Math.min(3, currentLevel + delta))

        applyZoom(container, newLevel)

        // Обновляем отображение уровня масштаба
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

            // Добавляем обработчик колесика мыши
            diagram.addEventListener('wheel', (e) => handleWheel(e as WheelEvent, diagram), {
              passive: false,
            })
          }
        })
      }

      // Инициализируем сразу
      setTimeout(() => {
        initDiagrams()
      }, 500)

      // Проверяем периодически
      const intervalId = setInterval(() => {
        initDiagrams()
      }, 1000)

      // Наблюдаем за изменениями
      const observer = new MutationObserver(() => {
        setTimeout(initDiagrams, 100)
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      })

      // Cleanup
      return () => {
        clearInterval(intervalId)
        observer.disconnect()
      }
    })
  }
}


