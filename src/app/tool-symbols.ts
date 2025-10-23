import { Symbol as SvgSymbol } from '@svgdotjs/svg.js';

// symbols are +/- SYMBOL_SIZE units in each direction from center
const SYMBOL_SIZE = 50; 

export interface ToolSymbolConfig {
  id: string;
  color: string;
  createContent: (symbol: SvgSymbol) => void;
}

export const TOOL_SYMBOLS: Record<string, ToolSymbolConfig> = {
  predict: {
    id: 'predict-symbol',
    color: '#ff6b6b', // Red
    createContent: (symbol: SvgSymbol) => {
      // FIX: Set viewBox to prevent clipping
      symbol.viewbox(-SYMBOL_SIZE, -SYMBOL_SIZE, SYMBOL_SIZE * 2, SYMBOL_SIZE * 2);
      
      // Cross symbol for predict
      symbol.line(-SYMBOL_SIZE, -SYMBOL_SIZE, SYMBOL_SIZE, SYMBOL_SIZE)
        .stroke({ color: '#ff6b6b', width: 14 });
      symbol.line(-SYMBOL_SIZE, SYMBOL_SIZE, SYMBOL_SIZE, -SYMBOL_SIZE)
        .stroke({ color: '#ff6b6b', width: 14 });
    }
  },
  
  track: {
    id: 'track-symbol',
    color: '#4ecdc4', // Teal
    createContent: (symbol: SvgSymbol) => {
      // FIX: Set viewBox to prevent clipping
      symbol.viewbox(-SYMBOL_SIZE, -SYMBOL_SIZE, SYMBOL_SIZE * 2, SYMBOL_SIZE * 2);
      
      // Plus symbol for track
      symbol.line(-SYMBOL_SIZE, 0, SYMBOL_SIZE, 0)
        .stroke({ color: '#4ecdc4', width: 4 });
      symbol.line(0, -SYMBOL_SIZE, 0, SYMBOL_SIZE)
        .stroke({ color: '#4ecdc4', width: 4 });
    }
  },
  
  train: {
    id: 'train-symbol',
    color: '#45b7d1', // Blue
    createContent: (symbol: SvgSymbol) => {
      // FIX: Set viewBox to prevent clipping
      symbol.viewbox(-SYMBOL_SIZE, -SYMBOL_SIZE, SYMBOL_SIZE * 2, SYMBOL_SIZE * 2);
      
      // Square symbol for train - make it more visible
      symbol.rect(SYMBOL_SIZE * 2, SYMBOL_SIZE * 2)
        .move(-SYMBOL_SIZE, -SYMBOL_SIZE)
        .fill('#45b7d1')
        .stroke({ color: '#45b7d1', width: 8 });
    }
  },
  
  'train-end': {
    id: 'train-end-symbol',
    color: '#96ceb4', // Light green
    createContent: (symbol: SvgSymbol) => {
      // FIX: Set viewBox to prevent clipping
      symbol.viewbox(-SYMBOL_SIZE, -SYMBOL_SIZE, SYMBOL_SIZE * 2, SYMBOL_SIZE * 2);
      
      // Triangle symbol for train end
      symbol.polygon(`0,-${SYMBOL_SIZE} -${SYMBOL_SIZE},${SYMBOL_SIZE} ${SYMBOL_SIZE},${SYMBOL_SIZE}`)
        .fill('none')
        .stroke({ color: '#96ceb4', width: 4 });
    }
  },
  
  coupling: {
    id: 'coupling-symbol',
    color: '#feca57', // Yellow
    createContent: (symbol: SvgSymbol) => {
      // FIX: Set viewBox to prevent clipping
      symbol.viewbox(-SYMBOL_SIZE, -SYMBOL_SIZE, SYMBOL_SIZE * 2, SYMBOL_SIZE * 2);
      
      // Diamond symbol for coupling
      symbol.polygon(`0,-${SYMBOL_SIZE} ${SYMBOL_SIZE},0 0,${SYMBOL_SIZE} -${SYMBOL_SIZE},0`)
        .fill('none')
        .stroke({ color: '#feca57', width: 4 });
    }
  }
};

export function getSymbolForTool(tool: string): ToolSymbolConfig | undefined {
  return TOOL_SYMBOLS[tool];
}