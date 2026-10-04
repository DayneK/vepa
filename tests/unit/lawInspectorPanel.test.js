// LRA-10 (AC-38): dev-only law inspector renders inspectLaw/exportLawGraph.
import { describe, it, expect, beforeEach } from 'vitest';
import { installDom } from '../helpers/domStub.js';
import { createLawInspectorPanel, mountLawInspector, shouldMountLawInspector, renderLawDetail } from '../../src/ui/lawInspectorPanel.js';
import { inspectLaw, exportLawGraph } from '../../src/physics/lawGraph.js';

let doc;
beforeEach(() => { doc = installDom(); });

describe('law inspector panel (LRA-10)', () => {
  it('is gated: never mounts in production or without the explicit flag', () => {
    expect(shouldMountLawInspector({ dev: false, search: '?lawInspector' })).toBe(false);
    expect(shouldMountLawInspector({ dev: true, search: '' })).toBe(false);
    expect(shouldMountLawInspector({ dev: true, search: '?lawInspector=1' })).toBe(true);
    expect(shouldMountLawInspector({ dev: true, hash: '#lawInspector' })).toBe(true);
    expect(mountLawInspector(doc, { dev: true, search: '' })).toBe(null);
    expect(doc.getElementById('law-inspector')).toBe(null);
  });

  it('mounts with one option per law from exportLawGraph', () => {
    const panel = mountLawInspector(doc, { dev: true, search: '?lawInspector' });
    expect(doc.getElementById('law-inspector')).toBe(panel.root);
    expect(panel.root.querySelectorAll('option').length).toBe(exportLawGraph().lawCount);
    expect(panel.root.querySelector('.count').textContent).toContain(String(exportLawGraph().lawCount));
  });

  it('renders the selected law from inspectLaw, including incoming edges', () => {
    const { root } = createLawInspectorPanel(doc, { initialLaw: 'HEAT' });
    const rec = inspectLaw('HEAT');
    expect(root.dataset.law).toBe('HEAT');
    expect(root.querySelector('.law-name').textContent).toContain('HEAT');
    expect(root.querySelector('.law-name').textContent).toContain(rec.category);
    expect(root.querySelectorAll('tr[data-rel]').length).toBe(Object.keys(rec.incoming).length);
    const incomingDeps = rec.incoming.dependsOn;
    if (incomingDeps.length) expect(root.querySelector('tr[data-rel=dependsOn] .in').textContent).toContain(incomingDeps[0]);
  });

  it('switches law on change and copies the graph JSON', () => {
    const { root } = createLawInspectorPanel(doc);
    const select = root.querySelector('.law-select');
    select.value = 'GRAV';
    select.dispatch('change');
    expect(root.dataset.law).toBe('GRAV');
    root.querySelector('.copy-json').dispatch('click');
    expect(Number(root.dataset.copied)).toBeGreaterThan(100);
  });

  it('escapes law metadata (adversarial)', () => {
    const html = renderLawDetail({ name: '<x>', id: 1, category: 'c', relationships: { reads: ['<b>'] }, incoming: { dependsOn: [] } });
    expect(html).not.toContain('<x>');
    expect(html).toContain('&lt;b&gt;');
  });
});
