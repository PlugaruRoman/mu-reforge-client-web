import { describe, expect, it, vi } from 'vitest';
import { autorun, runInAction } from 'mobx';

const sfx = vi.hoisted(() => ({ playSfx: vi.fn(), setSfxListener: vi.fn(), clearSfxListener: vi.fn() }));
vi.mock('../sound/listener', () => sfx);

const { MuWindows } = await import('./windowManager');
const { getUiViewport } = await import('./components/ui_stage');
const { AppState } = await import('./uiState');
const { playUiSound } = await import('@/controllers/sound/sfx');

describe('MuWindows open state', () => {
  it('starts closed and reacts to the first open of an unseen id', () => {
    const seen: boolean[] = [];
    const stop = autorun(() => seen.push(MuWindows.isOpen('test_window')));

    MuWindows.setOpen('test_window', true);
    MuWindows.setOpen('test_window', false);
    stop();

    expect(seen).toEqual([false, true, false]);
  });
});

// HideAll (NewUISystem.cpp:1608), run on a map change (WSclient.cpp:2285).
describe('MuWindows.closeAll', () => {
  it('runs every stacked closer and drops every open flag', () => {
    const closed: string[] = [];
    MuWindows.setOpen('inventory', true);
    MuWindows.register('vault', undefined, () => void closed.push('vault'));
    MuWindows.register('chat', undefined, () => false);
    MuWindows.register('trade', undefined, () => void closed.push('trade'));

    MuWindows.closeAll();

    expect(closed).toEqual(['trade', 'vault']);
    expect(MuWindows.isOpen('inventory')).toBe(false);
    for (const id of ['vault', 'chat', 'trade']) MuWindows.unregister(id);
  });

  // HideAll calls each window's Hide (ClosingProcess), which plays nothing; Escape's click is the window's own.
  it('closes in silence', () => {
    MuWindows.register('quick_command', undefined, () => playUiSound('click'));
    sfx.playSfx.mockClear();
    MuWindows.closeAll();
    expect(sfx.playSfx).not.toHaveBeenCalled();
    MuWindows.closeTop();
    expect(sfx.playSfx).toHaveBeenCalled();
    MuWindows.unregister('quick_command');
  });

  it('reaches the windows the hidden interface unmounted', () => {
    const closed: string[] = [];
    MuWindows.register('vault', undefined, () => void closed.push('vault'));
    runInAction(() => (AppState.hudHidden = true));
    MuWindows.unregister('vault');
    MuWindows.closeAll();
    expect(closed).toEqual(['vault']);
    MuWindows.closeAll();
    expect(closed).toEqual(['vault']);
    runInAction(() => (AppState.hudHidden = false));
  });
});

// The bar never registers a size, yet a screen narrower than 640 px (a phone) must shrink it to fit.
describe('MuWindows.fitScaleOf', () => {
  it('fits the bottom bar to the viewport width', () => {
    expect(MuWindows.fitScaleOf('bottom-bar')).toBeCloseTo((getUiViewport().width - 24) / 640);
    expect(MuWindows.fitScaleOf('never_registered')).toBe(3);
  });
});

// A Mu Reforge window opens, fits and is dragged above the bottom bar, not over the potions.
describe('MuWindows stage-sized windows', () => {
  it('keep the bottom bar clear', () => {
    const { height } = getUiViewport();
    const bar = 51 * MuWindows.scaleOf('bottom-bar');
    MuWindows.sizeToStage('rf_test');
    MuWindows.register('rf_test', { width: 230, height: 300 });
    const scale = MuWindows.scaleOf('rf_test');
    expect(300 * scale).toBeLessThanOrEqual(height - bar);
    expect(MuWindows.centeredAt('rf_test', 230, 300).y + 300 * scale).toBeLessThanOrEqual(height - bar + 1);
    MuWindows.moveTo('rf_test', 0, height);
    expect((MuWindows.placement('rf_test').y ?? Infinity) + 300 * scale).toBeLessThanOrEqual(height - bar + 0.001);
    MuWindows.reset('rf_test');
    MuWindows.unregister('rf_test');
  });

  it('leave a classic window free to go over the bar', () => {
    const { height } = getUiViewport();
    MuWindows.register('classic_test', { width: 190, height: 100 });
    MuWindows.moveTo('classic_test', 0, height);
    expect((MuWindows.placement('classic_test').y ?? Infinity) + 100 * MuWindows.scaleOf('classic_test')).toBeCloseTo(height);
    MuWindows.reset('classic_test');
    MuWindows.unregister('classic_test');
  });
});
