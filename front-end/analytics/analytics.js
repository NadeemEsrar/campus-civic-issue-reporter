// Analytics page: all roles. Pulls aggregate counts from
// GET /api/analytics/summary and draws them with Chart.js.
//
// Definitions used everywhere on this page:
//   total     = every issue ever reported
//   ongoing % = ongoing  / total
//   completed % = finished / total
// (reported + ongoing + finished always adds up to total.)

const ANALYTICS_COLORS = {
  reported: '#EF4444',
  ongoing: '#F59E0B',
  finished: '#10B981',
  primary: '#091426',
  secondary: '#0058be',
  grid: '#e2e7ff',
  text: '#45474c',
};

const DASHBOARD_BY_ROLE = {
  student: '../student_faculty/student_faculty.html',
  faculty: '../student_faculty/student_faculty.html',
  administrator: '../department_admin/department_admin.html',
  super_admin: '../super_admin/super_admin.html',
};

function pct(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

function statCard(label, value, sub, dotColor) {
  const dot = dotColor
    ? `<span class="inline-block w-2 h-2 rounded-full" style="background:${dotColor}"></span>`
    : '';
  return `
    <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 shadow-sm">
      <div class="flex items-center gap-1.5 text-label-md font-label-md text-on-surface-variant">${dot}${label}</div>
      <div class="text-headline-md font-headline-md text-primary mt-1">${value}</div>
      <div class="text-label-sm font-label-sm text-outline mt-0.5">${sub}</div>
    </div>`;
}

function progressRow(label, count, total, color) {
  const p = pct(count, total);
  return `
    <div>
      <div class="flex justify-between text-body-sm font-body-sm mb-1.5">
        <span class="text-on-surface">${label}</span>
        <span class="text-on-surface-variant"><strong class="text-primary">${count}</strong> of ${total} &middot; ${p}%</span>
      </div>
      <div class="h-2.5 rounded-full bg-surface-container overflow-hidden">
        <div class="h-full rounded-full" style="width:${p}%;background:${color}"></div>
      </div>
    </div>`;
}

function renderOverall(o) {
  document.getElementById('overall-cards').innerHTML = [
    statCard('Total reports', o.total, `${o.high_priority} high priority`),
    statCard('Awaiting action', o.reported, `${pct(o.reported, o.total)}% of all reports`, ANALYTICS_COLORS.reported),
    statCard('Ongoing', o.ongoing, `${pct(o.ongoing, o.total)}% of all reports`, ANALYTICS_COLORS.ongoing),
    statCard('Completed', o.finished, `${pct(o.finished, o.total)}% of all reports`, ANALYTICS_COLORS.finished),
  ].join('');

  document.getElementById('overall-progress').innerHTML = [
    progressRow('Ongoing out of all reports', o.ongoing, o.total, ANALYTICS_COLORS.ongoing),
    progressRow('Completed out of all reports', o.finished, o.total, ANALYTICS_COLORS.finished),
    progressRow('Picked up so far (ongoing + completed)', o.ongoing + o.finished, o.total, ANALYTICS_COLORS.secondary),
  ].join('');

  new Chart(document.getElementById('overall-status-chart'), {
    type: 'doughnut',
    data: {
      labels: ['Awaiting action', 'Ongoing', 'Completed'],
      datasets: [{
        data: [o.reported, o.ongoing, o.finished],
        backgroundColor: [ANALYTICS_COLORS.reported, ANALYTICS_COLORS.ongoing, ANALYTICS_COLORS.finished],
        borderWidth: 2,
        borderColor: '#ffffff',
      }],
    },
    options: {
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { color: ANALYTICS_COLORS.text, usePointStyle: true } },
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} (${pct(ctx.raw, o.total)}%)` },
        },
      },
    },
  });
}

function renderDepartments(departments) {
  const names = departments.map((d) => d.name);
  const axisStyle = { ticks: { color: ANALYTICS_COLORS.text }, grid: { color: ANALYTICS_COLORS.grid } };

  new Chart(document.getElementById('department-status-chart'), {
    type: 'bar',
    data: {
      labels: names,
      datasets: [
        { label: 'Awaiting action', data: departments.map((d) => d.reported), backgroundColor: ANALYTICS_COLORS.reported },
        { label: 'Ongoing', data: departments.map((d) => d.ongoing), backgroundColor: ANALYTICS_COLORS.ongoing },
        { label: 'Completed', data: departments.map((d) => d.finished), backgroundColor: ANALYTICS_COLORS.finished },
      ],
    },
    options: {
      maintainAspectRatio: false,
      indexAxis: 'y',
      scales: {
        x: { ...axisStyle, stacked: true, beginAtZero: true, ticks: { ...axisStyle.ticks, precision: 0 } },
        y: { ...axisStyle, stacked: true, grid: { display: false } },
      },
      plugins: { legend: { position: 'bottom', labels: { color: ANALYTICS_COLORS.text, usePointStyle: true } } },
    },
  });

  new Chart(document.getElementById('department-completion-chart'), {
    type: 'bar',
    data: {
      labels: names,
      datasets: [
        { label: 'Ongoing %', data: departments.map((d) => pct(d.ongoing, d.total)), backgroundColor: ANALYTICS_COLORS.ongoing },
        { label: 'Completed %', data: departments.map((d) => pct(d.finished, d.total)), backgroundColor: ANALYTICS_COLORS.finished },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        y: { ...axisStyle, beginAtZero: true, max: 100, ticks: { ...axisStyle.ticks, callback: (v) => `${v}%` } },
        x: { ...axisStyle, grid: { display: false } },
      },
      plugins: {
        legend: { position: 'bottom', labels: { color: ANALYTICS_COLORS.text, usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const d = departments[ctx.dataIndex];
              const count = ctx.datasetIndex === 0 ? d.ongoing : d.finished;
              return ` ${ctx.dataset.label.replace(' %', '')}: ${count} of ${d.total} (${ctx.raw}%)`;
            },
          },
        },
      },
    },
  });

  document.getElementById('department-cards').innerHTML = departments
    .map((d) => `
      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 shadow-sm flex flex-col gap-4">
        <div class="flex items-start justify-between gap-2">
          <h3 class="text-title-md font-title-md text-primary">${escapeHtml(d.name)}</h3>
          ${d.high_priority ? `<span class="shrink-0 px-2 py-0.5 rounded text-label-sm font-label-sm" style="background:#FEF2F2;color:#991B1B">${d.high_priority} high priority</span>` : ''}
        </div>
        <div class="grid grid-cols-4 gap-2 text-center">
          <div><div class="text-headline-sm font-headline-sm text-primary">${d.total}</div><div class="text-label-sm font-label-sm text-outline">Total</div></div>
          <div><div class="text-headline-sm font-headline-sm" style="color:${ANALYTICS_COLORS.reported}">${d.reported}</div><div class="text-label-sm font-label-sm text-outline">Waiting</div></div>
          <div><div class="text-headline-sm font-headline-sm" style="color:${ANALYTICS_COLORS.ongoing}">${d.ongoing}</div><div class="text-label-sm font-label-sm text-outline">Ongoing</div></div>
          <div><div class="text-headline-sm font-headline-sm" style="color:${ANALYTICS_COLORS.finished}">${d.finished}</div><div class="text-label-sm font-label-sm text-outline">Done</div></div>
        </div>
        ${d.total
          ? progressRow('Ongoing', d.ongoing, d.total, ANALYTICS_COLORS.ongoing) +
            progressRow('Completed', d.finished, d.total, ANALYTICS_COLORS.finished)
          : '<p class="text-body-sm font-body-sm text-outline">No reports for this department yet.</p>'}
      </div>`)
    .join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  const auth = requireAuth(['student', 'faculty', 'administrator', 'super_admin']);
  if (!auth) return;

  wireAccountMenu(auth.user);
  wireNotifications();

  // Nav mirrors each role's own dashboard nav.
  const role = auth.user.role;
  const isReporter = ['student', 'faculty'].includes(role);
  document.getElementById('nav-dashboard').href = DASHBOARD_BY_ROLE[role] || DASHBOARD_BY_ROLE.student;
  document.getElementById('nav-reports').classList.toggle('hidden', isReporter);
  document.getElementById('nav-report-issue').classList.toggle('hidden', !isReporter);

  const errorEl = document.getElementById('analytics-error');
  try {
    const data = await apiFetch('/api/analytics/summary');
    renderOverall(data.overall);
    renderDepartments(data.departments);
    document.getElementById('analytics-updated').textContent =
      `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch (err) {
    errorEl.textContent = `Couldn't load analytics: ${err.message}`;
    errorEl.classList.remove('hidden');
  }
});
