import { defineMermaidSetup } from '@slidev/types'

export default defineMermaidSetup(() => {
  return {
    theme: 'dark',
    themeVariables: {
      // Dark theme colors
      primaryColor: '#1e293b',
      secondaryColor: '#0f172a',
      tertiaryColor: '#334155',
      
      // Node colors
      mainBkg: '#1e293b',
      secondBkg: '#0f172a',
      tertiaryBkg: '#334155',
      
      // Text colors
      primaryTextColor: '#f1f5f9',
      secondaryTextColor: '#cbd5e1',
      textColor: '#f1f5f9',
      
      // Border colors
      primaryBorderColor: '#3b82f6',
      secondaryBorderColor: '#8b5cf6',
      tertiaryBorderColor: '#10b981',
      
      // Line colors
      lineColor: '#8b5cf6',
      
      // Sequence diagram
      actorBkg: '#1e293b',
      actorBorder: '#3b82f6',
      actorTextColor: '#f1f5f9',
      actorLineColor: '#8b5cf6',
      signalColor: '#8b5cf6',
      signalTextColor: '#f1f5f9',
      labelBoxBkgColor: '#1e293b',
      labelBoxBorderColor: '#3b82f6',
      labelTextColor: '#f1f5f9',
      loopTextColor: '#f1f5f9',
      noteBkgColor: '#1e293b',
      noteTextColor: '#f1f5f9',
      noteBorderColor: '#10b981',
      activationBorderColor: '#3b82f6',
      activationBkgColor: '#334155',
      
      // Flowchart
      cScale0: '#3b82f6',
      cScale1: '#8b5cf6',
      cScale2: '#10b981',
      
      // Font sizes (уменьшено еще больше для больших диаграмм)
      fontSize: '7px',  // уменьшили для sequence диаграмм
    },
    flowchart: {
      useMaxWidth: false,
      htmlLabels: true,
      curve: 'basis',
      padding: 6,           // еще уменьшили с 9
      nodeSpacing: 25,     // еще уменьшили с 30
      rankSpacing: 25,     // еще уменьшили с 30
      diagramPadding: 4,   // еще уменьшили с 6
    },
    sequence: {
      diagramMarginX: 12,    // увеличили горизонтальные отступы (шире)
      diagramMarginY: 0,     // НУЛЕВЫЕ вертикальные отступы
      actorMargin: 40,       // УВЕЛИЧИЛИ расстояние между актерами (шире, чтобы текст помещался)
      width: 150,           // УВЕЛИЧИЛИ ширину актеров (было 120, теперь еще шире для одной строки)
      height: 25,           // УВЕЛИЧИЛИ высоту актеров (было 10, теперь повыше)
      boxMargin: 2,       // минимальные отступы
      boxTextMargin: 0,   // минимальные отступы текста
      noteMargin: 2,      // МИНИМАЛЬНЫЕ заметки
      messageMargin: 0.8,   // ЕЩЕ БОЛЬШЕ сжали расстояние между сообщениями!
      mirrorActors: true,
      bottomMarginAdj: 2,    // НУЛЕВОЙ нижний отступ
      useMaxWidth: true,     // автоматическое масштабирование
      rightAngles: false,
      // Размеры шрифтов согласно документации Mermaid
      actorFontSize: 7,      // размер шрифта для актеров (было 14 по умолчанию)
      messageFontSize: 7,    // размер шрифта для сообщений (было 16 по умолчанию)
      noteFontSize: 7,       // размер шрифта для заметок (было 14 по умолчанию)
      wrap: false,          // ОТКЛЮЧИЛИ перенос текста - текст в одну строку!
    },
    gantt: {
      useMaxWidth: true,
    },
  }
})


