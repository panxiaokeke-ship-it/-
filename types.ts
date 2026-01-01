
export type Vector3 = [number, number, number];

export interface Voxel {
  position: Vector3;
  color: string;
}

export type ToolType = 'PENCIL' | 'ERASER' | 'PAINT' | 'PICKER' | 'DUPLICATE';

export enum Language {
  EN = 'en',
  CN = 'cn'
}

export interface TranslationSchema {
  title: string;
  tools: {
    pencil: string;
    eraser: string;
    paint: string;
    picker: string;
    duplicate: string;
    clear: string;
    ai_assist: string;
  };
  ui: {
    export: string;
    save: string;
    load: string;
    undo: string;
    redo: string;
    colors: string;
    gridSize: string;
    language: string;
    ai_prompt_placeholder: string;
    ai_button: string;
    ai_append: string;
    ai_replace: string;
    ai_discard: string;
    ai_preview_title: string;
    ai_preview_color: string;
    outlines: string;
  };
}
