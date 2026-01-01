
import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import VoxelModel from './components/VoxelModel';
import RetroButton from './components/UI/RetroButton';
import { Voxel, ToolType, Vector3, Language } from './types';
import { translations } from './i18n';
import { PALETTE, DEFAULT_COLOR, DEFAULT_GRID_SIZE, MAX_GRID_SIZE, MIN_GRID_SIZE } from './constants';
import { generateVoxelPrompt } from './services/geminiService';
import { Trash2, Eraser, PenTool, Pipette, Save, Download, RotateCcw, RotateCw, Languages, Sparkles, Move3d, Box, Check, X, Layers, Copy, Palette, Target, FolderOpen, RefreshCw } from 'lucide-react';

const STORAGE_KEY = 'vox-cassette-state';

const App: React.FC = () => {
  const [voxels, setVoxels] = useState<Voxel[]>([]);
  const [previewVoxels, setPreviewVoxels] = useState<Voxel[] | null>(null);
  const originalPreviewRef = useRef<Voxel[] | null>(null);
  
  const [currentTool, setCurrentTool] = useState<ToolType>('PENCIL');
  const [currentColor, setCurrentColor] = useState(DEFAULT_COLOR);
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);
  const [showOutlines, setShowOutlines] = useState(true);
  const [history, setHistory] = useState<Voxel[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOverrideColor, setPreviewOverrideColor] = useState<string | null>(null);
  const [hoveredCoord, setHoveredCoord] = useState<Vector3 | null>(null);

  const t = translations[language];

  // History management
  const recordHistory = useCallback((newVoxels: Voxel[]) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push([...newVoxels]);
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  }, [history, historyStep]);

  const undo = () => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      setVoxels([...history[prevStep]]);
      setHistoryStep(prevStep);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setVoxels([...history[nextStep]]);
      setHistoryStep(nextStep);
    }
  };

  const addVoxel = (pos: Vector3, overrideColor?: string) => {
    const exists = voxels.some(v => v.position[0] === pos[0] && v.position[1] === pos[1] && v.position[2] === pos[2]);
    if (!exists) {
      const newVoxels = [...voxels, { position: pos, color: overrideColor || currentColor }];
      setVoxels(newVoxels);
      recordHistory(newVoxels);
    }
  };

  const removeVoxel = (index: number) => {
    const newVoxels = voxels.filter((_, i) => i !== index);
    setVoxels(newVoxels);
    recordHistory(newVoxels);
  };

  const updateVoxelColor = (index: number) => {
    const newVoxels = [...voxels];
    newVoxels[index].color = currentColor;
    setVoxels(newVoxels);
    recordHistory(newVoxels);
  };

  const handlePickColor = (index: number) => {
    setCurrentColor(voxels[index].color);
    setCurrentTool('PENCIL');
  };

  const handleClear = () => {
    if (confirm("Are you sure? This will wipe the tape.")) {
      setVoxels([]);
      recordHistory([]);
    }
  };

  // Persistent Storage logic
  const handleSave = () => {
    const state = {
      voxels,
      currentTool,
      currentColor,
      language,
      gridSize,
      showOutlines
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    alert("MEMORY STORED TO CASSETTE.");
  };

  const handleLoad = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const state = JSON.parse(saved);
      if (state.voxels) setVoxels(state.voxels);
      if (state.currentTool) setCurrentTool(state.currentTool);
      if (state.currentColor) setCurrentColor(state.currentColor);
      if (state.language) setLanguage(state.language);
      if (state.gridSize) setGridSize(state.gridSize);
      if (state.showOutlines !== undefined) setShowOutlines(state.showOutlines);
      
      if (state.voxels) {
        setHistory([state.voxels]);
        setHistoryStep(0);
      }
    } catch (e) {
      console.error("Failed to load state", e);
    }
  }, []);

  const handleAiRequest = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    setPreviewVoxels(null);
    originalPreviewRef.current = null;
    setPreviewOverrideColor(null);
    
    const result = await generateVoxelPrompt(aiPrompt, gridSize);
    if (result) {
      const mapped: Voxel[] = result.map((r: any) => ({
        position: [r.x, r.y, r.z],
        color: r.color
      }));
      originalPreviewRef.current = mapped;
      setPreviewVoxels(mapped);
    }
    setIsGenerating(false);
  };

  const updatePreviewColor = (hex: string | null) => {
    setPreviewOverrideColor(hex);
    if (!originalPreviewRef.current) return;

    if (!hex) {
      setPreviewVoxels([...originalPreviewRef.current]);
      return;
    }

    // Advanced color matching: Shift the hue to the target color while preserving original lightness/shading
    const targetColor = new THREE.Color(hex);
    const targetHsl = { h: 0, s: 0, l: 0 };
    targetColor.getHSL(targetHsl);

    const updated = originalPreviewRef.current.map(v => {
      const voxelColor = new THREE.Color(v.color);
      const voxelHsl = { h: 0, s: 0, l: 0 };
      voxelColor.getHSL(voxelHsl);

      // We adopt the target hue and saturation, but keep original lightness variations (shading)
      // This makes the object look more "natural" in the new color
      const finalColor = new THREE.Color();
      finalColor.setHSL(
        targetHsl.h, 
        Math.max(targetHsl.s, voxelHsl.s * 0.5), // Blend saturation to keep some character
        voxelHsl.l // Maintain original shading
      );

      return { 
        ...v, 
        color: `#${finalColor.getHexString()}` 
      };
    });

    setPreviewVoxels(updated);
  };

  const applyPreview = (mode: 'replace' | 'append') => {
    if (!previewVoxels) return;
    let newVoxels: Voxel[];
    if (mode === 'replace') {
      newVoxels = [...previewVoxels];
    } else {
      newVoxels = [...voxels, ...previewVoxels];
    }
    setVoxels(newVoxels);
    recordHistory(newVoxels);
    setPreviewVoxels(null);
    originalPreviewRef.current = null;
    setPreviewOverrideColor(null);
  };

  const discardPreview = () => {
    setPreviewVoxels(null);
    originalPreviewRef.current = null;
    setPreviewOverrideColor(null);
  };

  // Initial load
  useEffect(() => {
    handleLoad();
  }, [handleLoad]);

  // Initial history
  useEffect(() => {
    if (history.length === 0) recordHistory(voxels);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-[#e5e5e5] select-none overflow-hidden lg:flex-row">
      {/* Sidebar - Controls */}
      <aside className="w-full lg:w-80 bg-[#2a2a2a] border-b-4 lg:border-b-0 lg:border-r-4 border-black p-4 flex flex-col gap-6 z-10 overflow-y-auto">
        <div className="bg-[#0a0a0a] p-3 border-2 border-[#444] rounded shadow-inner">
          <h1 className="text-xl font-bold tracking-tighter text-[#33ff00] crt-flicker text-center uppercase">
            {t.title}
          </h1>
          <p className="text-[10px] text-[#33ff00] opacity-60 text-center font-mono">STATION v8.8.1 // SECTOR_7</p>
        </div>

        {/* Toolbar */}
        <div className="grid grid-cols-2 gap-2">
          <RetroButton active={currentTool === 'PENCIL'} onClick={() => setCurrentTool('PENCIL')}>
            <PenTool size={16} /> {t.tools.pencil}
          </RetroButton>
          <RetroButton active={currentTool === 'ERASER'} onClick={() => setCurrentTool('ERASER')}>
            <Eraser size={16} /> {t.tools.eraser}
          </RetroButton>
          <RetroButton active={currentTool === 'PAINT'} onClick={() => setCurrentTool('PAINT')}>
            <Sparkles size={16} /> {t.tools.paint}
          </RetroButton>
          <RetroButton active={currentTool === 'PICKER'} onClick={() => setCurrentTool('PICKER')}>
            <Pipette size={16} /> {t.tools.picker}
          </RetroButton>
          <RetroButton active={currentTool === 'DUPLICATE'} onClick={() => setCurrentTool('DUPLICATE')}>
            <Copy size={16} /> {t.tools.duplicate}
          </RetroButton>
          <RetroButton variant="danger" onClick={handleClear}>
            <Trash2 size={16} /> {t.tools.clear}
          </RetroButton>
        </div>

        {/* Dimension Slider & Outlines */}
        <div className="bg-[#1a1a1a] p-3 border border-[#444] flex flex-col gap-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-2">
                <Move3d size={12} /> {t.ui.gridSize}
              </label>
              <span className="text-xs font-mono text-[#33ff00]">{gridSize}x{gridSize}</span>
            </div>
            <input 
              type="range" 
              min={MIN_GRID_SIZE} 
              max={MAX_GRID_SIZE} 
              step={2}
              value={gridSize} 
              onChange={(e) => setGridSize(parseInt(e.target.value))}
              className="w-full h-1 bg-[#444] rounded-lg appearance-none cursor-pointer accent-[#33ff00]"
            />
          </div>
          
          <RetroButton 
            active={showOutlines} 
            onClick={() => setShowOutlines(!showOutlines)}
            className="w-full"
          >
            <Box size={14} /> {t.ui.outlines}: {showOutlines ? 'ON' : 'OFF'}
          </RetroButton>
        </div>

        {/* Palette */}
        <div>
          <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">{t.ui.colors}</label>
          <div className="grid grid-cols-5 gap-1 p-2 bg-[#1a1a1a] border border-[#444]">
            {PALETTE.map(color => (
              <button
                key={color}
                className={`w-full aspect-square border-2 ${currentColor === color ? 'border-white scale-110 z-10' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
              />
            ))}
          </div>
          <div className="mt-2 flex gap-2 items-center bg-[#1a1a1a] p-1 border border-[#444]">
             <input 
              type="color" 
              value={currentColor} 
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-10 h-8 bg-transparent cursor-pointer"
            />
            <span className="text-xs font-mono">{currentColor.toUpperCase()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
           <div className="grid grid-cols-2 gap-2">
            <RetroButton onClick={undo}><RotateCcw size={14} /> {t.ui.undo}</RetroButton>
            <RetroButton onClick={redo}><RotateCw size={14} /> {t.ui.redo}</RetroButton>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <RetroButton onClick={handleSave} className="w-full"><Save size={16} /> {t.ui.save}</RetroButton>
            <RetroButton onClick={handleLoad} className="w-full"><FolderOpen size={16} /> {t.ui.load}</RetroButton>
          </div>
          <RetroButton className="w-full"><Download size={16} /> {t.ui.export}</RetroButton>
        </div>

        {/* AI Assistant */}
        <div className="p-3 bg-[#333] border-l-4 border-[#33ff00] flex flex-col gap-2 relative">
          <label className="text-[10px] font-bold text-[#33ff00]">{t.tools.ai_assist}</label>
          <textarea 
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            disabled={previewVoxels !== null}
            placeholder={t.ui.ai_prompt_placeholder}
            className={`bg-[#1a1a1a] text-[#33ff00] text-xs p-2 border border-[#444] focus:outline-none resize-none h-20 placeholder:opacity-30 ${previewVoxels ? 'opacity-50' : ''}`}
          />
          
          {previewVoxels ? (
            <div className="flex flex-col gap-2 bg-[#1a1a1a] p-2 border border-[#33ff00]">
              <div className="text-[9px] text-[#33ff00] font-bold animate-pulse text-center mb-1">
                {t.ui.ai_preview_title}
              </div>

              {/* Preview Color Override Picker */}
              <div className="mb-2 p-2 bg-[#2a2a2a] border border-[#444] rounded">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9px] font-bold text-gray-400 block uppercase">
                    <Palette size={10} className="inline mr-1" /> {t.ui.ai_preview_color}
                  </label>
                  <button 
                    onClick={() => updatePreviewColor(null)}
                    className="text-[8px] text-[#33ff00] underline uppercase hover:opacity-80"
                  >
                    <RefreshCw size={8} className="inline mr-0.5" /> Reset
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <input 
                    type="color" 
                    value={previewOverrideColor || (originalPreviewRef.current && originalPreviewRef.current.length > 0 ? originalPreviewRef.current[0].color : DEFAULT_COLOR)} 
                    onChange={(e) => updatePreviewColor(e.target.value)}
                    className="w-8 h-6 bg-transparent cursor-pointer"
                  />
                  <div className="grid grid-cols-6 gap-0.5 flex-1">
                    {PALETTE.slice(0, 12).map(color => (
                      <button
                        key={`prev-pal-${color}`}
                        className={`w-full aspect-square border ${previewOverrideColor === color ? 'border-white scale-110 z-10' : 'border-black opacity-60'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => updatePreviewColor(color)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1">
                <RetroButton variant="success" onClick={() => applyPreview('replace')} className="text-[10px] h-10 px-1">
                  <Check size={12} /> {t.ui.ai_replace}
                </RetroButton>
                <RetroButton variant="success" onClick={() => applyPreview('append')} className="text-[10px] h-10 px-1">
                  <Layers size={12} /> {t.ui.ai_append}
                </RetroButton>
                <RetroButton variant="danger" onClick={discardPreview} className="text-[10px] h-10 px-1">
                  <X size={12} /> {t.ui.ai_discard}
                </RetroButton>
              </div>
            </div>
          ) : (
            <RetroButton 
              variant="success" 
              onClick={handleAiRequest}
              className={isGenerating ? 'animate-pulse' : ''}
              disabled={isGenerating}
            >
              <Sparkles size={14} /> {isGenerating ? '...' : t.ui.ai_button}
            </RetroButton>
          )}
        </div>

        {/* Settings */}
        <div className="mt-auto flex justify-between items-center border-t border-[#444] pt-4">
          <RetroButton onClick={() => setLanguage(l => l === Language.EN ? Language.CN : Language.EN)}>
            <Languages size={16} /> {t.ui.language}
          </RetroButton>
          <span className="text-[10px] opacity-40 font-mono">VOX-OS V.2</span>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 relative bg-black flex items-center justify-center cursor-crosshair">
        <VoxelModel 
          voxels={voxels} 
          previewVoxels={previewVoxels || []}
          onAddVoxel={addVoxel} 
          onRemoveVoxel={removeVoxel}
          onUpdateVoxelColor={updateVoxelColor}
          onPickColor={handlePickColor}
          onHoverCoord={setHoveredCoord}
          currentTool={currentTool}
          currentColor={currentColor}
          gridSize={gridSize}
          showOutlines={showOutlines}
        />
        
        {/* Viewport UI Overlays */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none opacity-50 font-mono">
          <div className="bg-[#2a2a2a] p-2 border border-black text-[10px]">
            VOX_COUNT: {voxels.length.toString().padStart(4, '0')}
          </div>
          <div className="bg-[#2a2a2a] p-2 border border-black text-[10px]">
            TOOL: {currentTool}
          </div>
          <div className="bg-[#2a2a2a] p-2 border border-black text-[10px]">
            DIM: {gridSize}x{gridSize}
          </div>
          {hoveredCoord && (
            <div className="bg-[#2a2a2a] p-2 border border-[#33ff00] text-[10px] text-[#33ff00] flex items-center gap-1">
              <Target size={10} /> {hoveredCoord[0]}, {hoveredCoord[1]}, {hoveredCoord[2]}
            </div>
          )}
          {previewVoxels && (
            <div className="bg-[#33ff00] text-black p-2 border border-black text-[10px] font-bold animate-pulse">
              MODE: AI_PREVIEW
            </div>
          )}
        </div>

        {/* Mobile quick tools */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 lg:hidden flex gap-2 bg-[#2a2a2a] p-2 border-2 border-black rounded shadow-2xl overflow-x-auto max-w-[90vw]">
          <button onClick={() => setCurrentTool('PENCIL')} className={`p-2 flex-shrink-0 ${currentTool === 'PENCIL' ? 'bg-[#33ff00] text-black' : 'bg-transparent text-white'}`}><PenTool /></button>
          <button onClick={() => setCurrentTool('ERASER')} className={`p-2 flex-shrink-0 ${currentTool === 'ERASER' ? 'bg-[#ff6b6b] text-white' : 'bg-transparent text-white'}`}><Eraser /></button>
          <button onClick={() => setCurrentTool('PAINT')} className={`p-2 flex-shrink-0 ${currentTool === 'PAINT' ? 'bg-[#ffb000] text-black' : 'bg-transparent text-white'}`}><Sparkles /></button>
          <button onClick={() => setCurrentTool('PICKER')} className={`p-2 flex-shrink-0 ${currentTool === 'PICKER' ? 'bg-[#33ff00] text-black' : 'bg-transparent text-white'}`}><Pipette /></button>
          <button onClick={() => setCurrentTool('DUPLICATE')} className={`p-2 flex-shrink-0 ${currentTool === 'DUPLICATE' ? 'bg-[#33ff00] text-black' : 'bg-transparent text-white'}`}><Copy /></button>
        </div>
      </main>
    </div>
  );
};

export default App;
