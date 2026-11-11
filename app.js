'use strict';

// Endpoint público: lista países y devuelve únicamente los campos que utiliza la interfaz.
const API_URL = 'https://countries.dev/countries?fields=name,capital,region,population,flag,alpha2Code';

const elements = {
  apiStatus: document.querySelector('#apiStatus'),
  apiStatusText: document.querySelector('#apiStatusText'),
  searchInput: document.querySelector('#searchInput'),
  regionFilter: document.querySelector('#regionFilter'),
  resetFilters: document.querySelector('#resetFilters'),
  resultsCount: document.querySelector('#resultsCount'),
  feedback: document.querySelector('#feedback'),
  resultsGrid: document.querySelector('#resultsGrid'),
  retryWrap: document.querySelector('#retryWrap'),
  retryButton: document.querySelector('#retryButton')
};

const numberFormatter = new Intl.NumberFormat('es-MX');
const regionNames = {
  Africa: 'África',
  Americas: 'América',
  Asia: 'Asia',
  Europe: 'Europa',
  Oceania: 'Oceanía',
  Antarctic: 'Antártida'
};

let countries = [];

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function setApiStatus(state, message) {
  elements.apiStatus.className = `api-status ${state}`.trim();
  elements.apiStatusText.textContent = message;
}

function setControlsEnabled(enabled) {
  elements.searchInput.disabled = !enabled;
  elements.regionFilter.disabled = !enabled;
  elements.resetFilters.disabled = !enabled;
}

function showFeedback(message, type = 'info') {
  elements.feedback.hidden = false;
  elements.feedback.className = `feedback ${type}`.trim();
  elements.feedback.textContent = message;
}

function hideFeedback() {
  elements.feedback.hidden = true;
  elements.feedback.textContent = '';
}

function explainApiError(error) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return 'La API rechazó la solicitud (400). Comprueba los parámetros e inténtalo de nuevo.';
      case 404:
        return 'El recurso solicitado no está disponible (404). Revisa el endpoint configurado.';
      case 429:
        return 'Se alcanzó temporalmente el límite de solicitudes (429). Espera un momento y vuelve a intentarlo.';
      default:
        if (error.status >= 500) {
          return `El servicio externo presenta un problema (${error.status}). Inténtalo de nuevo más tarde.`;
        }
        return `No fue posible consultar la API (HTTP ${error.status}). Inténtalo nuevamente.`;
    }
  }

  if (error instanceof TypeError) {
    return 'No se pudo establecer conexión con la API. Verifica tu conexión a internet o inténtalo más tarde.';
  }

  return 'Ocurrió un problema inesperado al cargar la información. Vuelve a intentarlo.';
}

async function loadCountries() {
  setApiStatus('loading', 'Consultando servicio…');
  setControlsEnabled(false);
  elements.retryWrap.hidden = true;
  elements.resultsGrid.replaceChildren();
  elements.resultsCount.textContent = 'Cargando información…';
  showFeedback('Estamos solicitando la información pública de países.');

  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new ApiError('La respuesta no contiene JSON válido.', response.status);
    }

    if (!response.ok) {
      throw new ApiError(data?.error || 'La API respondió con un error.', response.status);
    }

    if (!Array.isArray(data)) {
      throw new Error('La estructura JSON recibida no es una lista de países.');
    }

    countries = data.filter((country) => country && typeof country.name === 'string');
    countries.sort((a, b) => a.name.localeCompare(b.name, 'es'));

    setControlsEnabled(true);
    hideFeedback();
    setApiStatus('success', 'API conectada');
    renderCountries();
  } catch (error) {
    console.error('Error al consultar countries.dev:', error);
    countries = [];
    elements.resultsGrid.replaceChildren();
    elements.resultsCount.textContent = 'No fue posible cargar los países';
    setApiStatus('error', 'Sin conexión');
    showFeedback(explainApiError(error), 'error');
    elements.retryWrap.hidden = false;
  }
}

function getFilteredCountries() {
  const query = elements.searchInput.value.trim().toLocaleLowerCase('es-MX');
  const selectedRegion = elements.regionFilter.value;

  return countries.filter((country) => {
    const name = country.name.toLocaleLowerCase('es-MX');
    const capital = (country.capital || '').toLocaleLowerCase('es-MX');
    const code = (country.alpha2Code || '').toLocaleLowerCase('es-MX');
    const matchesQuery = !query || name.includes(query) || capital.includes(query) || code.includes(query);
    const matchesRegion = selectedRegion === 'all' || country.region === selectedRegion;
    return matchesQuery && matchesRegion;
  });
}

function createFlag(country) {
  const wrapper = document.createElement('div');
  wrapper.className = 'flag-wrap';
  wrapper.setAttribute('aria-hidden', 'true');

  const flagValue = country.flag || country.flags?.svg || country.flags?.png || '';
  if (typeof flagValue === 'string' && /^https?:\/\//i.test(flagValue)) {
    const image = document.createElement('img');
    image.src = flagValue;
    image.alt = `Bandera de ${country.name}`;
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => {
      wrapper.textContent = country.alpha2Code || '🌐';
      wrapper.style.fontSize = '11px';
      wrapper.style.fontFamily = 'var(--mono)';
    }, { once: true });
    wrapper.append(image);
  } else {
    wrapper.textContent = flagValue || '🌐';
  }

  return wrapper;
}

function createCountryCard(country, index) {
  const article = document.createElement('article');
  article.className = 'country-card';
  article.style.animationDelay = `${Math.min(index * 25, 250)}ms`;

  const top = document.createElement('div');
  top.className = 'card-top';
  top.append(createFlag(country));

  const code = document.createElement('span');
  code.className = 'country-code';
  code.textContent = country.alpha2Code || '—';
  top.append(code);

  const name = document.createElement('h3');
  name.className = 'country-name';
  name.textContent = country.name;

  const capital = document.createElement('p');
  capital.className = 'country-capital';
  capital.textContent = country.capital || 'Capital no disponible';

  const divider = document.createElement('div');
  divider.className = 'card-divider';

  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const region = document.createElement('span');
  region.textContent = regionNames[country.region] || country.region || 'Sin región';

  const population = document.createElement('span');
  population.textContent = Number.isFinite(country.population)
    ? `${numberFormatter.format(country.population)} hab.`
    : 'Población s/d';

  meta.append(region, population);
  article.append(top, name, capital, divider, meta);
  return article;
}

function renderCountries() {
  const filteredCountries = getFilteredCountries();
  const fragment = document.createDocumentFragment();

  filteredCountries.forEach((country, index) => {
    fragment.append(createCountryCard(country, index));
  });

  elements.resultsGrid.replaceChildren(fragment);
  elements.resultsCount.textContent = `Mostrando ${numberFormatter.format(filteredCountries.length)} de ${numberFormatter.format(countries.length)} países`;

  if (filteredCountries.length === 0) {
    showFeedback('No encontramos países con esos criterios. Prueba con otro nombre, capital o región.');
  } else {
    hideFeedback();
  }
}

function resetFilters() {
  elements.searchInput.value = '';
  elements.regionFilter.value = 'all';
  renderCountries();
  elements.searchInput.focus();
}

elements.searchInput.addEventListener('input', renderCountries);
elements.regionFilter.addEventListener('change', renderCountries);
elements.resetFilters.addEventListener('click', resetFilters);
elements.retryButton.addEventListener('click', loadCountries);

document.addEventListener('keydown', (event) => {
  const targetTag = event.target?.tagName?.toLowerCase();
  const isTyping = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || event.target?.isContentEditable;
  if (event.key === '/' && !isTyping && !elements.searchInput.disabled) {
    event.preventDefault();
    elements.searchInput.focus();
  }
});

loadCountries();
