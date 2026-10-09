// The Codex: 36 relics of six extinct civilizations, dark silhouettes until found.

import { ARTIFACTS, CIVILIZATIONS } from './data.js';
import { fill, h } from './ui.js';

export function renderCodexPage(root, app) {
  const { state } = app;
  const found = new Map(state.artifacts.map((entry) => [entry.id, entry]));
  const total = ARTIFACTS.length;
  fill(
    root,
    h(
      'div.page-head',
      {},
      h('div', {}, h('div.eyebrow', {}, 'Codex'), h('h1.page-title', {}, 'Relics of the dead')),
      h('span.num', { style: { fontSize: '22px', fontWeight: 700 } }, `${found.size}/${total}`),
    ),
    h(
      'div.codex-progress',
      {},
      h('div.meter.gold', {}, h('i', { style: { width: `${(found.size / total) * 100}%` } })),
    ),
    CIVILIZATIONS.map((civ) => {
      const artifacts = ARTIFACTS.filter((artifact) => artifact.civ === civ.id);
      const count = artifacts.filter((artifact) => found.has(artifact.id)).length;
      return h(
        `section.civ${count === artifacts.length ? '.complete' : ''}`,
        { style: { '--civ': civ.color } },
        h(
          'div.civ-head',
          {},
          h('img', { src: `img/civs/${civ.id}.svg`, alt: '' }),
          h('div', {}, h('div.civ-name', {}, civ.name), h('div.civ-motif', {}, civ.motif)),
          h('span.count', {}, `${count}/${artifacts.length}`),
        ),
        h(
          'div.civ-grid',
          {},
          artifacts.map((artifact) => {
            const entry = found.get(artifact.id);
            const fresh = entry && app.isNewArtifact(artifact.id);
            return h(
              `button.medallion${entry ? '' : '.locked'}${fresh ? '.new' : ''}`,
              { type: 'button', 'aria-label': entry ? artifact.name : 'Unknown relic', onclick: () => app.openArtifact(artifact.id) },
              h('img', { src: `img/artifacts/${artifact.id}.svg`, alt: '', loading: 'lazy' }),
            );
          }),
        ),
      );
    }),
  );
}
