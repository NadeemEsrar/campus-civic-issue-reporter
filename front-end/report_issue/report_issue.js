// "Report an Issue" page (student/faculty only). Same shared wiring as the
// dashboards, minus the feed: after a successful submit, send the user back
// to the dashboard so they can see their new report in the feed.
document.addEventListener('DOMContentLoaded', async () => {
  const auth = requireAuth(['student', 'faculty']);
  if (!auth) return; // requireAuth already redirected

  wireAccountMenu(auth.user);
  wireNotifications();
  await wireReportForm(() => {
    window.location.href = '../student_faculty/student_faculty.html';
  });
});
