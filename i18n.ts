
import { Language, TranslationSchema } from './types';

export const translations: Record<Language, TranslationSchema> = {
  [Language.EN]: {
    title: 'VOX-CASSETTE-88',
    tools: {
      pencil: 'DRAW',
      eraser: 'ERASE',
      paint: 'PAINT',
      picker: 'PICK',
      duplicate: 'CLONE',
      clear: 'WIPE',
      ai_assist: 'AI ASSIST'
    },
    ui: {
      export: 'EXPORT',
      save: 'STORE',
      load: 'RECALL',
      undo: 'UNDO',
      redo: 'REDO',
      colors: 'SPECTRUM',
      gridSize: 'DIMENSION',
      language: 'LANG',
      ai_prompt_placeholder: 'Describe a scene...',
      ai_button: 'PROCESS',
      ai_append: 'APPEND',
      ai_replace: 'REWRITE',
      ai_discard: 'DISCARD',
      ai_preview_title: 'PREVIEW READY',
      ai_preview_color: 'OVERRIDE COLOR',
      outlines: 'OUTLINES'
    }
  },
  [Language.CN]: {
    title: '体素磁带-88',
    tools: {
      pencil: '绘制',
      eraser: '擦除',
      paint: '上色',
      picker: '吸色',
      duplicate: '克隆',
      clear: '清空',
      ai_assist: 'AI 辅助'
    },
    ui: {
      export: '导出',
      save: '保存',
      load: '读取',
      undo: '撤销',
      redo: '重做',
      colors: '色谱',
      gridSize: '尺寸',
      language: '语言',
      ai_prompt_placeholder: '描述一个场景...',
      ai_button: '处理',
      ai_append: '追加',
      ai_replace: '替换',
      ai_discard: '丢弃',
      ai_preview_title: '预览就绪',
      ai_preview_color: '覆写颜色',
      outlines: '轮廓'
    }
  }
};
