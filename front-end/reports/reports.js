document.addEventListener('DOMContentLoaded', async () => {
  // Anyone logged in can view Reports. Role-specific card behavior (upvote
  // button vs. status dropdown) is decided inside initUnivPulsePage /
  // initIssuesFeed based on the real role. The submission form no longer
  // lives here; it's on report_issue/report_issue.html.
  const auth = await initUnivPulsePage(['student', 'faculty', 'administrator', 'super_admin']);
  if (!auth) return;

  const role = auth.user.role;

  // "Dashboard" should go back to the dashboard for this user's role.
  const dashboardByRole = {
    student: '../student_faculty/student_faculty.html',
    faculty: '../student_faculty/student_faculty.html',
    administrator: '../department_admin/department_admin.html',
    super_admin: '../super_admin/super_admin.html',
  };
  const dashLink = document.getElementById('nav-dashboard');
  if (dashLink && dashboardByRole[role]) dashLink.href = dashboardByRole[role];

  // Only students/faculty can report issues, so only they see that link.
  const reportLink = document.getElementById('nav-report-issue');
  if (reportLink) reportLink.classList.toggle('hidden', !['student', 'faculty'].includes(role));
});
