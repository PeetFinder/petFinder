// Guest dashboard — preview; data from MySQL when available
const GUEST_DEFAULT_LOST_PETS = [
  { id: 'report_buddy', name: 'Buddy', species: 'Dog', breed: 'Golden Retriever', location: 'Barangay San Miguel', dateLost: 'Oct 20, 2023' },
  { id: 'report_luna', name: 'Luna', species: 'Cat', breed: 'Siamese Mix', location: 'Poblacion Area', dateLost: 'May 12, 2026' },
  { id: 'report_max', name: 'Max', species: 'Dog', breed: 'Aspin', location: 'Barangay San Juan', dateLost: 'Apr 28, 2026' },
  { id: 'report_coco', name: 'Coco', species: 'Bird', breed: 'Cockatiel', location: 'Bagumbayan', dateLost: 'May 30, 2026' }
];

let guestReportsCache = GUEST_DEFAULT_LOST_PETS.slice();

function redirectGuestToAuth(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  window.location.href = 'auth.html';
}

function mergeGuestReports(reports) {
  const fromDb = Array.isArray(reports) ? reports.slice() : [];
  const ids = {};
  fromDb.forEach(function (r) {
    if (r && r.id) ids[r.id] = true;
  });
  GUEST_DEFAULT_LOST_PETS.forEach(function (d) {
    if (!ids[d.id]) fromDb.push(d);
  });
  return fromDb;
}

function openGuestPetPreview(reportId) {
  const report = guestReportsCache.find(function (r) { return r.id === reportId; });
  if (!report) return;

  const modal = document.getElementById('guestPetPreviewModal');
  if (!modal) return;

  document.getElementById('guestPreviewPetName').textContent = report.name || '—';
  document.getElementById('guestPreviewPetSpecies').textContent = report.species || '—';
  document.getElementById('guestPreviewPetBreed').textContent = report.breed || '—';
  document.getElementById('guestPreviewPetLocation').textContent = report.location || '—';
  document.getElementById('guestPreviewPetDate').textContent = report.dateLost || report.dateLostDisplay || '—';
  document.getElementById('guestPreviewPetSpeciesBadge').textContent = String(report.species || 'PET').toUpperCase();

  modal.style.display = 'flex';
}

function closeGuestPetPreview() {
  const modal = document.getElementById('guestPetPreviewModal');
  if (modal) modal.style.display = 'none';
}

function renderGuestLostPetReports(reports) {
  const container = document.getElementById('guestLostPetReportsContainer');
  if (!container) return;

  guestReportsCache = mergeGuestReports(reports);
  const list = guestReportsCache.length ? guestReportsCache : GUEST_DEFAULT_LOST_PETS;

  container.innerHTML = list.map(function (report) {
    const dateLost = report.dateLost || report.dateLostDisplay || '—';
    return `
      <div class="col">
        <div class="card custom-card h-100 p-3">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <span class="badge bg-light text-muted guest-lock-badge fw-bold">GUEST PREVIEW</span>
          </div>
          <div class="pet-img-box mb-3"><span class="pet-species-fallback">${String(report.species || 'PET').toUpperCase()}</span></div>
          <div class="mb-3 small">
            <h5 class="fw-bold mb-2">${report.name}</h5>
            <p class="mb-1 text-muted"><strong>Species:</strong> ${report.species}</p>
            <p class="mb-2 text-muted"><strong>Breed:</strong> ${report.breed || '—'}</p>
            <p class="mb-1"><span class="meta-label">Location</span> <span class="fw-semibold">${report.location || '—'}</span></p>
            <p class="mb-0 text-secondary">Lost: ${dateLost}</p>
          </div>
          <div class="d-flex gap-2 mt-auto">
            <button type="button" class="btn btn-sm btn-outline-sage fw-bold w-50 py-1.5" style="font-size: 12px;"
              onclick="openGuestPetPreview('${report.id}')">View Details</button>
            <button type="button" class="btn btn-sm btn-coral fw-bold w-50 py-1.5" style="font-size: 12px;"
              onclick="redirectGuestToAuth(event)">Sighting</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function enterGuestMode() {
  sessionStorage.removeItem('petfinderLoggedIn');
  localStorage.removeItem('currentUser');
  sessionStorage.setItem('petfinderGuestMode', 'true');
}

function initGuestDashboard() {
  enterGuestMode();
  renderGuestLostPetReports(GUEST_DEFAULT_LOST_PETS);

  if (!window.PetFinderAPI) return;

  PetFinderAPI.init().then(function (ok) {
    if (!ok) return;
    PetFinderAPI.getReports().then(function (res) {
      renderGuestLostPetReports(res.reports || []);
    }).catch(function () {});
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initGuestDashboard();

  document.querySelectorAll('[data-guest-auth]').forEach(function (el) {
    el.addEventListener('click', redirectGuestToAuth);
  });
});
