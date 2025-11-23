import { defineMermaidSetup } from '@slidev/types'

export default defineMermaidSetup(() => {
  return {
    theme: 'dark',
    themeVariables: {
      // Dark theme colors
      primaryColor: '#1e293b',
      primaryTextColor: '#f1f5f9',
      primaryBorderColor: '#3b82f6',
      lineColor: '#8b5cf6',
      secondaryColor: '#0f172a',
      tertiaryColor: '#334155',
      
      // Node colors
      mainBkg: '#1e293b',
      secondBkg: '#0f172a',
      tertiaryBkg: '#334155',
      
      // Text colors
      primaryTextColor: '#f1f5f9',
      secondaryTextColor: '#cbd5e1',
      
      // Border colors
      primaryBorderColor: '#3b82f6',
      secondaryBorderColor: '#8b5cf6',
      tertiaryBorderColor: '#10b981',
      
      // Line colors
      lineColor: '#8b5cf6',
      textColor: '#f1f5f9',
      
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
      
      // Font sizes
      fontSize: '14px',
    },
    flowchart: {
      useMaxWidth: false,
      htmlLabels: true,
      curve: 'basis',
      padding: 15,
      nodeSpacing: 50,
      rankSpacing: 50,
      diagramPadding: 10,
    },
    sequence: {
      diagramMarginX: 20,
      diagramMarginY: 10,
      actorMargin: 50,
      width: 150,
      height: 60,
      boxMargin: 8,
      boxTextMargin: 5,
      noteMargin: 10,
      messageMargin: 30,
      mirrorActors: true,
      bottomMarginAdj: 1,
      useMaxWidth: false,
      rightAngles: false,
      wrap: true,
    },
    gantt: {
      useMaxWidth: true,
    },
  }
})


