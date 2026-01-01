
import React, { useRef, useCallback, useState } from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Bounds, Edges, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { Voxel, ToolType, Vector3 } from '../types';

interface VoxelModelProps {
  voxels: Voxel[];
  previewVoxels?: Voxel[];
  onAddVoxel: (pos: Vector3, color?: string) => void;
  onRemoveVoxel: (index: number) => void;
  onUpdateVoxelColor: (index: number) => void;
  onPickColor: (index: number) => void;
  onHoverCoord?: (pos: Vector3 | null) => void;
  currentTool: ToolType;
  currentColor: string;
  gridSize: number;
  showOutlines: boolean;
}

const VoxelBox: React.FC<{ 
  voxel: Voxel; 
  index: number;
  showOutlines: boolean;
  isPreview?: boolean;
  currentTool: ToolType;
  onClick?: (e: ThreeEvent<MouseEvent>, index: number) => void; 
  onHover?: (pos: Vector3 | null) => void;
}> = ({ voxel, index, showOutlines, isPreview, currentTool, onClick, onHover }) => {
  const [hovered, setHovered] = useState(false);

  const getEmissive = () => {
    if (!isPreview && hovered) {
      if (currentTool === 'ERASER') return '#ff3333';
      if (currentTool === 'PAINT') return '#ffffff';
      if (currentTool === 'PICKER') return '#33ff00';
      if (currentTool === 'DUPLICATE') return '#00ccff';
    }
    return voxel.color;
  };

  const getEmissiveIntensity = () => {
    if (isPreview) return 0.5;
    if (hovered) return 0.8;
    return 0.1;
  };

  return (
    <mesh 
      position={voxel.position} 
      onClick={onClick ? (e) => onClick(e, index) : undefined}
      onPointerOver={(e) => { 
        e.stopPropagation(); 
        setHovered(true); 
        onHover?.(voxel.position);
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover?.(null);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color={voxel.color} 
        roughness={isPreview ? 0.3 : 0.6} 
        metalness={isPreview ? 0.5 : 0.1}
        emissive={getEmissive()}
        emissiveIntensity={getEmissiveIntensity()}
        transparent={isPreview}
        opacity={isPreview ? 0.6 : 1.0}
      />
      {showOutlines && (
        <Edges
          threshold={15}
          color={isPreview ? "#ffffff" : (hovered && currentTool === 'ERASER' ? "#ff0000" : "#000000")}
          lineWidth={isPreview ? 1 : 1.5}
        />
      )}
    </mesh>
  );
};

const InteractiveGrid: React.FC<{ 
  onAdd: (pos: Vector3) => void; 
  onHover: (pos: Vector3 | null) => void;
  gridSize: number 
}> = ({ onAdd, onHover, gridSize }) => {
  const handleGridClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const point = e.point;
    const pos: Vector3 = [
      Math.floor(point.x + 0.5),
      Math.floor(point.y + 0.5),
      Math.floor(point.z + 0.5)
    ];
    onAdd(pos);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const point = e.point;
    onHover([
      Math.floor(point.x + 0.5),
      Math.floor(point.y + 0.5),
      Math.floor(point.z + 0.5)
    ]);
  };

  return (
    <group>
      {/* Dense Background Infinite Grid */}
      <Grid 
        position={[0, -0.52, 0]} 
        infiniteGrid 
        fadeDistance={150} 
        cellSize={1} 
        sectionSize={10} 
        sectionThickness={1.2} 
        sectionColor="#1a331a" 
        cellColor="#081108"
      />
      
      {/* Outer Glow Grid */}
      <Grid 
        position={[0, -0.53, 0]} 
        infiniteGrid 
        fadeDistance={200} 
        cellSize={50} 
        sectionSize={100} 
        sectionThickness={2} 
        sectionColor="#2d5c2d" 
        cellColor="transparent"
      />
      
      {/* Main Interaction Plane and Grid */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.5, 0]} 
        onClick={handleGridClick}
        onPointerMove={handlePointerMove}
        onPointerOut={() => onHover(null)}
      >
        <planeGeometry args={[gridSize, gridSize]} />
        <meshBasicMaterial transparent opacity={0} />
        <Grid 
          infiniteGrid={false} 
          fadeDistance={50} 
          cellSize={1} 
          sectionSize={4} 
          sectionColor="#33ff00" 
          sectionThickness={1.5}
          cellColor="#222"
          args={[gridSize, gridSize]}
        />
      </mesh>
    </group>
  );
};

const VoxelModel: React.FC<VoxelModelProps> = ({ 
  voxels, previewVoxels = [], onAddVoxel, onRemoveVoxel, onUpdateVoxelColor, onPickColor, onHoverCoord, currentTool, currentColor, gridSize, showOutlines 
}) => {
  const handleVoxelClick = useCallback((e: ThreeEvent<MouseEvent>, index: number) => {
    e.stopPropagation();
    
    switch (currentTool) {
      case 'ERASER':
        onRemoveVoxel(index);
        break;
      case 'PAINT':
        onUpdateVoxelColor(index);
        break;
      case 'PICKER':
        onPickColor(index);
        break;
      case 'PENCIL':
      case 'DUPLICATE':
        const normal = e.face?.normal;
        if (normal) {
          const sourceVoxel = voxels[index];
          const newPos: Vector3 = [
            sourceVoxel.position[0] + normal.x,
            sourceVoxel.position[1] + normal.y,
            sourceVoxel.position[2] + normal.z
          ];
          
          const colorToUse = currentTool === 'DUPLICATE' ? sourceVoxel.color : undefined;
          onAddVoxel(newPos, colorToUse);
        }
        break;
      default:
        break;
    }
  }, [voxels, currentTool, onRemoveVoxel, onAddVoxel, onUpdateVoxelColor, onPickColor]);

  return (
    <Canvas 
      shadows 
      gl={{ antialias: true }}
      camera={{ position: [gridSize * 1.2, gridSize, gridSize * 1.2], fov: 45 }}
      style={{ background: '#050505' }}
    >
      <fog attach="fog" args={['#050505', 30, 180]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[gridSize, gridSize, gridSize]} intensity={1} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <spotLight position={[-gridSize, gridSize * 1.5, gridSize]} angle={0.15} penumbra={1} intensity={1} castShadow />
      
      {/* 
        Removed 'observe' to prevent jittering when adding/removing voxels.
        Automatic fitting on every change was fighting with OrbitControls.
      */}
      <Bounds clip margin={1.2}>
        <group>
          {voxels.map((v, i) => (
            <VoxelBox 
              key={`vox-${v.position[0]}-${v.position[1]}-${v.position[2]}`} 
              voxel={v} 
              index={i} 
              showOutlines={showOutlines}
              currentTool={currentTool}
              onClick={handleVoxelClick}
              onHover={onHoverCoord}
            />
          ))}
          {previewVoxels.map((v, i) => (
            <VoxelBox 
              key={`prev-${v.position[0]}-${v.position[1]}-${v.position[2]}`} 
              voxel={v} 
              index={i} 
              showOutlines={showOutlines}
              currentTool={currentTool}
              isPreview
            />
          ))}
        </group>
      </Bounds>

      <InteractiveGrid 
        onAdd={(pos) => onAddVoxel(pos)} 
        onHover={(pos) => onHoverCoord?.(pos)}
        gridSize={gridSize} 
      />
      
      {/* 3D Coordinate Indicator (Gizmo) in Bottom-Left */}
      <GizmoHelper
        alignment="bottom-left"
        margin={[80, 80]} 
      >
        <GizmoViewport 
          axisColors={['#ff4444', '#33ff00', '#4444ff']} 
          labelColor="#ffffff" 
        />
      </GizmoHelper>

      {/* Robust Camera Controls */}
      <OrbitControls 
        makeDefault 
        enableDamping={true} 
        dampingFactor={0.05}
        rotateSpeed={0.8}
        zoomSpeed={1.2}
        panSpeed={0.8}
        minDistance={2}
        maxDistance={gridSize * 4}
        enablePan={true}
        screenSpacePanning={true}
      />
    </Canvas>
  );
};

export default VoxelModel;
