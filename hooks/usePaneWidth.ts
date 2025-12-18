import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'missioncontent-pane-widths';
const DEFAULT_LEFT_PANE = 320;
const DEFAULT_INSPECTOR = 340;

interface PaneWidths {
    leftPane: number;
    inspector: number;
}

function getStoredWidths(): PaneWidths {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to parse stored pane widths:', e);
    }
    return { leftPane: DEFAULT_LEFT_PANE, inspector: DEFAULT_INSPECTOR };
}

function storeWidths(widths: PaneWidths): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
    } catch (e) {
        console.error('Failed to store pane widths:', e);
    }
}

export function usePaneWidth(pane: 'leftPane' | 'inspector'): [number, (width: number) => void] {
    const [width, setWidthState] = useState(() => getStoredWidths()[pane]);

    // Sync with localStorage on mount (in case another tab changed it)
    useEffect(() => {
        const stored = getStoredWidths();
        setWidthState(stored[pane]);
    }, [pane]);

    const setWidth = useCallback((newWidth: number) => {
        setWidthState(newWidth);
        const current = getStoredWidths();
        storeWidths({ ...current, [pane]: newWidth });
    }, [pane]);

    return [width, setWidth];
}
