(function() {
  const DATA = JSON.parse(document.getElementById('data').textContent);
  const META = JSON.parse(document.getElementById('meta').textContent);

  for (const r of DATA) {
    r.questionCount = r.stats.questions;
    r.featuresCount = r.features.length;
    r.specialty = r.source.specialty || '';
    const d = META.domains[r.domain] || META.domains.other;
    r.domainLabel = d.label;
    r.domainEmoji = d.emoji;
    r.domainTint  = d.tint;
    const f = META.formTypes[r.formType] || { label: r.formType, glyph: '·' };
    r.formTypeLabel = f.label;
    r.formTypeGlyph = f.glyph;
  }

  function distinct(field) { return [...new Set(DATA.map(r => r[field]))].filter(Boolean).sort(); }
  function fillSelect(id, values, formatter) {
    const sel = document.getElementById(id);
    for (const v of values) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = formatter ? formatter(v) : v;
      sel.appendChild(opt);
    }
  }
  fillSelect('f-domain',   distinct('domain'),    d => (META.domains[d] ? META.domains[d].emoji + ' ' + META.domains[d].label : d));
  fillSelect('f-formType', distinct('formType'),  ft => (META.formTypes[ft] ? META.formTypes[ft].label : ft));
  fillSelect('f-audience', distinct('audience'));
  fillSelect('f-mode',     distinct('answeringMode'));

  const state = { q:'', class:'', loinc:'', domain:'', formType:'', audience:'', mode:'', sort:'title', dir:1 };

  function read() {
    state.q        = document.getElementById('q').value.trim().toLowerCase();
    state.class    = document.getElementById('f-class').value;
    state.loinc    = document.getElementById('f-loinc').value;
    state.domain   = document.getElementById('f-domain').value;
    state.formType = document.getElementById('f-formType').value;
    state.audience = document.getElementById('f-audience').value;
    state.mode     = document.getElementById('f-mode').value;
    render();
  }

  function filtered() {
    return DATA.filter(r => {
      if (state.q) {
        const hay = (r.title + ' ' + r.id + ' ' + (r.specialty || '') + ' ' + (r.parentInstrument || '') + ' ' + r.domain + ' ' + r.domainLabel).toLowerCase();
        if (!hay.includes(state.q)) return false;
      }
      if (state.class    && r.classKind     !== state.class)    return false;
      if (state.loinc === 'yes' && !r.hasLoinc) return false;
      if (state.loinc === 'no'  &&  r.hasLoinc) return false;
      if (state.domain   && r.domain        !== state.domain)   return false;
      if (state.formType && r.formType      !== state.formType) return false;
      if (state.audience && r.audience      !== state.audience) return false;
      if (state.mode     && r.answeringMode !== state.mode)     return false;
      return true;
    });
  }

  function sortRows(rows) {
    const k = state.sort, dir = state.dir;
    return rows.slice().sort((a,b) => {
      const va = a[k], vb = b[k];
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function render() {
    const rows = sortRows(filtered());
    const tb = document.getElementById('tbody');
    tb.innerHTML = '';
    document.getElementById('result-count').textContent =
      rows.length + ' of ' + DATA.length + ' Questionnaire' + (DATA.length === 1 ? '' : 's');
    for (const r of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="title-cell">
          <a href="${esc(r.path)}" target="_blank" rel="noopener">${esc(r.title)}</a>
          <div class="id">${esc(r.id)}</div>
          ${r.parentInstrument ? '<div class="variant">variant of '+esc(r.parentInstrument)+'</div>' : ''}
        </td>
        <td>
          <span class="domain-pill tint-${esc(r.domainTint)}">${r.domainEmoji} ${esc(r.domainLabel)}</span>
        </td>
        <td>
          <div class="pill-group">
            <span class="pill ${r.classKind === 'standardized' ? 'std' : 'local'}">${esc(r.classKind)}</span>
            ${r.hasLoinc ? '<span class="pill loinc">LOINC</span>' : ''}
          </div>
        </td>
        <td><span class="formtype"><span class="glyph">${r.formTypeGlyph}</span> ${esc(r.formTypeLabel)}</span></td>
        <td><span class="audience-tag">${esc(r.audience)}</span><br><span class="audience-tag">${esc(r.answeringMode)}</span></td>
        <td class="stats-cell"><strong>${r.stats.questions}</strong> q · <strong>${r.stats.groups}</strong> grp${r.stats.requiredCount ? ' · '+r.stats.requiredCount+' req' : ''}</td>
        <td class="stats-cell"><span class="feature-chip">${r.features.length}</span></td>
        <td class="source-cell">
          ${r.source.url ? '<a href="'+esc(r.source.url)+'" target="_blank" rel="noopener">'+esc(r.source.host || r.source.url)+'</a>' : '—'}
          ${r.source.alsoSeenCount ? '<div class="variants">+ '+r.source.alsoSeenCount+' variant'+(r.source.alsoSeenCount===1?'':'s')+'</div>' : ''}
        </td>
      `;
      tb.appendChild(tr);
    }
    document.getElementById('empty').style.display = rows.length ? 'none' : 'block';
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.classList.toggle('active', th.dataset.sort === state.sort);
      const a = th.querySelector('.arrow');
      if (a) a.textContent = th.dataset.sort === state.sort ? (state.dir === 1 ? '▾' : '▴') : '▾';
    });
  }

  document.querySelectorAll('input,select').forEach(el => el.addEventListener('input', read));
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      if (state.sort === th.dataset.sort) state.dir = -state.dir;
      else { state.sort = th.dataset.sort; state.dir = 1; }
      render();
    });
  });
  document.getElementById('reset').addEventListener('click', () => {
    document.getElementById('q').value = '';
    document.querySelectorAll('select').forEach(s => s.value = '');
    read();
  });

  read();
})();
