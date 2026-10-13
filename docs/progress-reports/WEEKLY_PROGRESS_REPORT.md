# BCAS Integrated Scholarship and Admissions Application and Screening System

**Group No.:** 3
**Weekly Progress Report — Weeks 1 to 16**

> All statuses, dates, and member/role assignments below are inferred/placeholder content drafted from the project's Jira Sprint 1 tickets and the Master Timeline. Replace with your team's real dates, names, and actual status before submitting.

---

## Week 1 — Authentication & Account Management
**Reporting Period:** September 7–19, 2026 | **Date Submitted:** September 23, 2026

**A. Weekly Objective/s**
Develop and implement the Authentication & Account Management module: applicant self-service registration, secure BCrypt/JWT login, logout, session verification, and Admin-only staff provisioning (Evaluator, Support Staff, Academic Head, Admin).

**B. Planned Tasks**
| Task ID | Planned Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| BISAASS-8 | Set up the sign-up feature for new applicants | Coder | Applicants can create their own account |
| BISAASS-9 | Set up a secure way for users to log in | Coder | Users can log in safely to their account |
| BISAASS-10 | Set up the logout feature | Coder | Users can safely end their session |
| BISAASS-11 | Set up a way to check who is currently logged in | Tester | System recognizes the logged-in user |
| BISAASS-12 | Set up account creation for staff (Admin only) | System Analyst | Admins can add new staff accounts |

**C. Actual Accomplishments**
| Task ID | Task Accomplished | Responsible Member/s | Status | Evidence |
|---|---|---|---|---|
| BISAASS-8 | Finished the sign-up feature for new applicants | Coder | Completed | Tested; criteria met |
| BISAASS-9 | Finished the secure login feature | Coder | Completed | Tested valid/invalid logins |
| BISAASS-10 | Finished the logout feature | Coder | Completed | Old session verified ended |
| BISAASS-11 | Finished the logged-in user check | Tester | Completed | Frontend routes correctly |
| BISAASS-12 | Finished staff account creation for Admins | System Analyst | Completed | Admin-only access verified |

**FEATURES STILL UNDER DEVELOPMENT:** None for this module — all Sprint 1 Authentication & Account Management stories (BISAASS-8 to BISAASS-12) are complete.

**D. Problems/Issues Encountered**
| Problem/Issue | Effect on Project | Assigned Member/s | Action/s Taken | Status |
|---|---|---|---|---|
| No significant problems encountered this week. | N/A | N/A | N/A | N/A |

**E. Documentation Progress**
| Documentation Component | Assigned Member/s | Status |
|---|---|---|
| Sprint 1 user stories & acceptance criteria (BISAASS-8 to 12) | Documenter | Completed |
| API documentation for Authentication module | Documenter | In Progress |

**F. Plan for Next Week**
| Priority | Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| High | Begin Scholarship Application Submission module | System Analyst | Initial application form/endpoint |
| Medium | Write tests for Auth module endpoints | Tester | Test suite for auth endpoints |
| Medium | Prepare Sprint 2 documentation | Documenter | Updated technical docs |

---

## Week 2 — Sprint/Development 1
**Reporting Period:** September 20 – October 2, 2026 | **Date Submitted:** October 6, 2026

**A. Weekly Objective/s**
Begin development of the initial applicant-facing modules — account activation/deactivation, dashboard, profile setup, and admission/scholarship application submission.

**B. Planned Tasks**
| Task ID | Planned Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| 13 | Set up the account activation/deactivation toggle | System Analyst | Admins can turn applicant accounts on or off |
| 14 | Build the applicant's main dashboard | Coder | Applicants see an overview after logging in |
| 15 | Build the profile setup and management page | Coder | Applicants can fill in and update their details |
| 16 | Build the admission application submission feature | Coder | Applicants can submit their admission application |
| 17 | Build the scholarship application submission feature | Tester | Applicants can submit their scholarship application |

**C. Actual Accomplishments**
| Task ID | Task Accomplished | Responsible Member/s | Status | Evidence |
|---|---|---|---|---|
| 13 | Finished the account activation/deactivation toggle | System Analyst | Completed | Tested; criteria met |
| 14 | Finished the applicant dashboard | Coder | Completed | Verified data displays correctly |
| 15 | Finished the profile setup and management page | Coder | Completed | Tested profile updates save correctly |
| 16 | Finished the admission application submission feature | Coder | Completed | Tested full submission flow |
| 17 | Finished the scholarship application submission feature | Tester | Completed | Verified submission and validation |

**FEATURES STILL UNDER DEVELOPMENT:** Application History, Document Checklist, Entrance Exam Schedule Selection, Exam Permit View/Download/Reschedule, Application Tracking, Announcements View, Notification Preferences, Application Confirmation Receipt, and Applicant Settings (items 18–26) — the remaining Applicant Portal features — have not yet been started.

**D. Problems/Issues Encountered**
| Problem/Issue | Effect on Project | Assigned Member/s | Action/s Taken | Status |
|---|---|---|---|---|
| The admission application form did not correctly save uploaded files on first testing | Delayed testing of the submission feature by about a day | Coder | Fixed the file-upload handling and retested the form | Resolved |

**E. Documentation Progress**
| Documentation Component | Assigned Member/s | Status |
|---|---|---|
| Update Chapters 1–3 based on panel revisions | Documenter | In Progress |

**F. Plan for Next Week**
| Priority | Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| High | Build the application history, document checklist, exam schedule selection, exam permit view/download/reschedule, announcements view, and confirmation receipt features | Coder | Most of the remaining Applicant Portal features completed |
| Medium | Build the notification preferences feature | System Analyst | Applicants can choose which notifications to receive |

---

## Week 3 — Sprint/Development 2
**Reporting Period:** October 3 – October 15, 2026 | **Date Submitted:** October 19, 2026

**A. Weekly Objective/s**
Complete the remaining Applicant Portal features so applicants can track, manage, and stay informed about their applications end-to-end.

**B. Planned Tasks**
| Task ID | Planned Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| 18 | Build the application history page | Coder | Applicants can view their past applications |
| 19 | Build the document checklist feature | Coder | Applicants see which documents to upload |
| 20 | Build the exam schedule selection feature | Coder | Applicants can choose an exam schedule |
| 21 | Build the exam permit view/download/reschedule feature | Coder | Applicants can view, download, or reschedule their permit |
| 22 | Build the application status tracking feature | Tester | Applicants can track their status and reasons |
| 23 | Build the announcements page for applicants | Coder | Applicants can view active announcements |
| 24 | Build the notification preferences feature | System Analyst | Applicants can choose which notifications to receive |
| 25 | Build the application confirmation receipt feature | Coder | Applicants can download/print a confirmation receipt |
| 26 | Build the applicant settings page | Tester | Applicants can manage their profile and password |

**C. Actual Accomplishments**
| Task ID | Task Accomplished | Responsible Member/s | Status | Evidence |
|---|---|---|---|---|
| 18 | Finished the application history page | Coder | Completed | Tested; criteria met |
| 19 | Finished the document checklist feature | Coder | Completed | Tested; criteria met |
| 20 | Finished the exam schedule selection feature | Coder | Completed | Tested; criteria met |
| 21 | Finished the exam permit view/download/reschedule feature | Coder | Completed | Tested; criteria met |
| 22 | Finished the application status tracking feature | Tester | Completed | Verified status and reasons display correctly |
| 23 | Finished the announcements page for applicants | Coder | Completed | Tested; criteria met |
| 24 | Finished the notification preferences feature | System Analyst | Completed | Tested opt-in/opt-out settings |
| 25 | Finished the application confirmation receipt feature | Coder | Completed | Tested download/print |
| 26 | Finished the applicant settings page | Tester | Completed | Tested profile and password updates |

**D. Problems/Issues Encountered**
| Problem/Issue | Effect on Project | Assigned Member/s | Action/s Taken | Status |
|---|---|---|---|---|
| No significant problems encountered this week. | N/A | N/A | N/A | N/A |

**E. Documentation Progress**
| Documentation Component | Assigned Member/s | Status |
|---|---|---|
| Update system design/development documentation | Documenter | In Progress |

**F. Plan for Next Week**
| Priority | Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| High | Start the Admin/Registrar module | System Analyst | Core admin features underway |

---

## Week 4 — Sprint/Development 3
**Reporting Period:** October 16 – October 28, 2026 | **Date Submitted:** November 1, 2026

**A. Weekly Objective/s**
Build the core Admin/Registrar functions for managing applications and exam scheduling.

**B. Planned Tasks**
| Task ID | Planned Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| 27 | Build the admin dashboard | Coder | Admins see applicant totals and analytics |
| 28 | Build the admin application list feature | Coder | Admins can search and filter applications |
| 29 | Build the exam schedule management feature | System Analyst | Admins can manage Saturday/weekday exam schedules |
| 30 | Build the exam permit generation & release feature | Coder | Admins can generate and release exam permits |
| 31 | Build the application status oversight feature | System Analyst | Admins can oversee and update application statuses |
| 32 | Build the scholarship slot management feature | Coder | Admins can manage scholarship slots |
| 33 | Build the reservation management feature | Coder | Admins can manage reservations |
| 34 | Build the admin document oversight view | Tester | Admins can view applicant documents |

**C. Actual Accomplishments**
| Task ID | Task Accomplished | Responsible Member/s | Status | Evidence |
|---|---|---|---|---|
| 27 | Finished the admin dashboard | Coder | Completed | Verified totals and analytics display |
| 28 | Finished the admin application list feature | Coder | Completed | Tested search and filter |
| 29 | Finished the exam schedule management feature | System Analyst | Completed | Tested schedule setup |
| 30 | Finished the exam permit generation & release feature | Coder | Completed | Tested permit generation |
| 31 | Finished the application status oversight feature | System Analyst | Completed | Tested status updates |
| 32 | Finished the scholarship slot management feature | Coder | Completed | Tested slot management |
| 33 | Finished the reservation management feature | Coder | Completed | Tested reservation flow |
| 34 | Finished the admin document oversight view | Tester | Completed | Verified document visibility |

**D. Problems/Issues Encountered**
| Problem/Issue | Effect on Project | Assigned Member/s | Action/s Taken | Status |
|---|---|---|---|---|
| No significant problems encountered this week. | N/A | N/A | N/A | N/A |

**E. Documentation Progress**
| Documentation Component | Assigned Member/s | Status |
|---|---|---|
| General documentation update | Documenter | In Progress |

**F. Plan for Next Week**
| Priority | Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| High | Finish Admin/Registrar module; begin Evaluator workflow | System Analyst | Admin module complete; Evaluator features started |

---

## Week 5 — Sprint/Development 4
**Reporting Period:** October 29 – November 10, 2026 | **Date Submitted:** November 14, 2026

**A. Weekly Objective/s**
Complete the Admin/Registrar module and start the Evaluator dashboard and screening flow, integrating with the modules already built.

**B. Planned Tasks**
| Task ID | Planned Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| 35 | Build the records archive feature | Coder | Admins can archive and retrieve past records |
| 36 | Build the admin announcements management feature | Coder | Admins can post and manage announcements |
| 37 | Build the admin-registrar reporting feature | System Analyst | Admins can generate reports |
| 38 | Build the admin account management feature | Coder | Admins can edit staff accounts |
| 39 | Build the notification management feature | Coder | Admins can configure system-triggered emails |
| 40 | Build the admin settings page | Tester | Admins can configure system-level settings |
| 41 | Build the evaluator dashboard | Coder | Evaluators see an overview of scholarship applications |
| 42 | Build the scholarship screening feature | Coder | Evaluators can screen scholarship applications |

**C. Actual Accomplishments**
| Task ID | Task Accomplished | Responsible Member/s | Status | Evidence |
|---|---|---|---|---|
| 35 | Finished the records archive feature | Coder | Completed | Tested archive and retrieval |
| 36 | Finished the admin announcements management feature | Coder | Completed | Tested posting/editing announcements |
| 37 | Finished the admin-registrar reporting feature | System Analyst | Completed | Verified report generation |
| 38 | Finished the admin account management feature | Coder | Completed | Tested account edits |
| 39 | Finished the notification management feature | Coder | Completed | Tested email configuration |
| 40 | Finished the admin settings page | Tester | Completed | Tested system-level settings |
| 41 | Finished the evaluator dashboard | Coder | Completed | Verified overview displays correctly |
| 42 | Finished the scholarship screening feature | Coder | Completed | Tested screening flow |

**D. Problems/Issues Encountered**
| Problem/Issue | Effect on Project | Assigned Member/s | Action/s Taken | Status |
|---|---|---|---|---|
| No significant problems encountered this week. | N/A | N/A | N/A | N/A |

**E. Documentation Progress**
| Documentation Component | Assigned Member/s | Status |
|---|---|---|
| Preliminary testing records | Documenter | In Progress |

**F. Plan for Next Week**
| Priority | Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| High | Build the full scholarship workflow and Academic Head features | System Analyst | Working integrated prototype |

---

## Week 6 — Sprint/Development 5
**Reporting Period:** November 11 – November 23, 2026 | **Date Submitted:** November 27, 2026

**A. Weekly Objective/s**
Complete the scholarship evaluation workflow and Academic Head decision-making features, reaching a working integrated prototype.

**B. Planned Tasks**
| Task ID | Planned Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| 43 | Set up the scholarship workflow stages | System Analyst | Applications move through each scholarship stage |
| 44 | Set up the scholarship eligibility rules engine | System Analyst | System automatically checks eligibility rules |
| 45 | Build the read-only scholarship slots view for evaluators | Coder | Evaluators can view available scholarship slots |
| 46 | Build the evaluator settings page | Coder | Evaluators can manage their own account settings |
| 47 | Build the final decision feature for the Academic Head | Coder | Academic Head can approve or reject applications |
| 48 | Build scholarship slot and announcement management for the Academic Head | Coder | Academic Head can manage slots and announcements |
| 49 | Build the department-level report filtering feature | Tester | Academic Head can filter reports by department |
| 50 | Build the Academic Head settings page | Coder | Academic Head can manage their own account settings |

**C. Actual Accomplishments**
| Task ID | Task Accomplished | Responsible Member/s | Status | Evidence |
|---|---|---|---|---|
| 43 | Finished the scholarship workflow stages | System Analyst | Completed | Tested stage transitions |
| 44 | Finished the scholarship eligibility rules engine | System Analyst | Completed | Tested eligibility checks |
| 45 | Finished the read-only scholarship slots view for evaluators | Coder | Completed | Verified slot visibility |
| 46 | Finished the evaluator settings page | Coder | Completed | Tested settings updates |
| 47 | Finished the final decision feature for the Academic Head | Coder | Completed | Tested approve/reject flow |
| 48 | Finished scholarship slot and announcement management for the Academic Head | Coder | Completed | Tested management flow |
| 49 | Finished the department-level report filtering feature | Tester | Completed | Verified filtering accuracy |
| 50 | Finished the Academic Head settings page | Coder | Completed | Tested settings updates |

**D. Problems/Issues Encountered**
| Problem/Issue | Effect on Project | Assigned Member/s | Action/s Taken | Status |
|---|---|---|---|---|
| No significant problems encountered this week. | N/A | N/A | N/A | N/A |

**E. Documentation Progress**
| Documentation Component | Assigned Member/s | Status |
|---|---|---|
| Testing/debugging documentation | Documenter | In Progress |

**F. Plan for Next Week**
| Priority | Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| High | Build the Support Staff module and remaining cross-cutting features | System Analyst | Full feature backlog complete |

---

## Week 7 — Sprint/Development 6
**Reporting Period:** November 24 – December 6, 2026 | **Date Submitted:** December 10, 2026

**A. Weekly Objective/s**
Complete the Support Staff module and the remaining cross-cutting features, bringing the full feature backlog to completion.

**B. Planned Tasks**
| Task ID | Planned Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| 51 | Build the document verification screen | Coder | Support staff can view submitted documents |
| 52 | Build the document review actions feature | Coder | Support staff can approve, reject, or flag documents |
| 53 | Build the applicant records search feature | Coder | Support staff can search applicant records |
| 54 | Build the document archive browse screen | Coder | Support staff can browse archived documents |
| 55 | Build the support staff settings page | Coder | Support staff can manage their own account settings |
| 56 | Set up the application status history/audit trail | System Analyst | System keeps a history of all status changes |
| 57 | Set up rules to enforce proper scholarship workflow transitions | System Analyst | System prevents invalid workflow transitions |
| 58 | Set up the document review lifecycle | Tester | Documents move correctly through each review stage |
| 59 | Build the email notification dispatch feature | Coder | System sends emails for all key events |

**C. Actual Accomplishments**
| Task ID | Task Accomplished | Responsible Member/s | Status | Evidence |
|---|---|---|---|---|
| 51 | Finished the document verification screen | Coder | Completed | Tested; criteria met |
| 52 | Finished the document review actions feature | Coder | Completed | Tested approve/reject/flag |
| 53 | Finished the applicant records search feature | Coder | Completed | Tested search accuracy |
| 54 | Finished the document archive browse screen | Coder | Completed | Tested browsing/filtering |
| 55 | Finished the support staff settings page | Coder | Completed | Tested settings updates |
| 56 | Finished the application status history/audit trail | System Analyst | Completed | Verified history logging |
| 57 | Finished the scholarship workflow transition rules | System Analyst | Completed | Tested invalid-transition blocking |
| 58 | Finished the document review lifecycle | Tester | Completed | Tested all lifecycle states |
| 59 | Finished the email notification dispatch feature | Coder | Completed | Tested email delivery for all events |

**D. Problems/Issues Encountered**
| Problem/Issue | Effect on Project | Assigned Member/s | Action/s Taken | Status |
|---|---|---|---|---|
| No significant problems encountered this week. | N/A | N/A | N/A | N/A |

**E. Documentation Progress**
| Documentation Component | Assigned Member/s | Status |
|---|---|---|
| Update technical documentation | Documenter | In Progress |

**F. Plan for Next Week**
| Priority | Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| High | Integrate all modules and begin end-to-end testing | Coder | Fully integrated system |

---

## Week 8 — Integration & Testing
**Reporting Period:** December 7 – December 19, 2026 | **Date Submitted:** December 23, 2026

**A. Weekly Objective/s**
Integrate all completed modules (Auth, Applicant, Admin/Registrar, Evaluator, Academic Head, Support Staff) into one working system and run end-to-end tests.

**B. Planned Tasks**
| Task ID | Planned Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| W8-1 | Integrate all modules into a single system build | Coder | One working system combining all modules |
| W8-2 | Run end-to-end tests across all user roles | Tester | Confirmed workflows work correctly across roles |
| W8-3 | Fix issues found during integration | Coder | Fewer bugs between modules |
| W8-4 | Prepare materials for user acceptance testing | Documenter | UAT materials ready |

**C. Actual Accomplishments**
| Task ID | Task Accomplished | Responsible Member/s | Status | Evidence |
|---|---|---|---|---|
| W8-1 | Combined all modules into one system | Coder | Completed | System runs as a single build |
| W8-2 | Completed end-to-end testing across all roles | Tester | Completed | Test results recorded |
| W8-3 | Fixed issues found during integration | Coder | Completed | Verified fixes resolved reported issues |
| W8-4 | Drafted UAT materials | Documenter | In Progress | Draft test scripts/user guides prepared |

**D. Problems/Issues Encountered**
| Problem/Issue | Effect on Project | Assigned Member/s | Action/s Taken | Status |
|---|---|---|---|---|
| No significant problems encountered this week. | N/A | N/A | N/A | N/A |

**E. Documentation Progress**
| Documentation Component | Assigned Member/s | Status |
|---|---|---|
| Prepare UAT materials | Documenter | In Progress |

**F. Plan for Next Week**
| Priority | Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| High | Refine the integrated system based on testing results | Coder | Near-complete, stable system |

---

## Week 9 — System Refinement
**Reporting Period:** December 20, 2026 – January 1, 2027 | **Date Submitted:** January 5, 2027

**A. Weekly Objective/s**
Refine and stabilize the integrated system — fixing bugs, improving the interface, and reviewing performance/security — to reach a near-complete system.

**B. Planned Tasks**
| Task ID | Planned Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| W9-1 | Fix bugs found during integration testing | Coder | Fewer known issues in the system |
| W9-2 | Improve the look and usability of all modules | Coder | Smoother, easier-to-use interface |
| W9-3 | Review the system's speed and security | Tester | Confirmed system is fast and secure enough |

**C. Actual Accomplishments**
| Task ID | Task Accomplished | Responsible Member/s | Status | Evidence |
|---|---|---|---|---|
| W9-1 | Fixed bugs found during integration testing | Coder | Completed | Verified fixes; retested affected areas |
| W9-2 | Improved the interface across modules | Coder | Completed | Reviewed and approved by team |
| W9-3 | Completed performance and security review | Tester | Completed | No major issues found |

**D. Problems/Issues Encountered**
| Problem/Issue | Effect on Project | Assigned Member/s | Action/s Taken | Status |
|---|---|---|---|---|
| No significant problems encountered this week. | N/A | N/A | N/A | N/A |

**E. Documentation Progress**
| Documentation Component | Assigned Member/s | Status |
|---|---|---|
| Draft UAT Chapter 4.4 | Documenter | In Progress |

**F. Plan for Next Week**
| Priority | Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| High | Conduct the semester-end progress check | System Analyst | Consolidated first-semester progress report |

---

## Week 10 — Semester-End Progress Check
**Reporting Period:** January 2 – January 14, 2027 | **Date Submitted:** January 18, 2027

**A. Weekly Objective/s**
Consolidate first-semester progress, confirm the system is a functional and substantially advanced prototype, and identify remaining gaps for second semester.

**B. Planned Tasks**
| Task ID | Planned Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| W10-1 | Hold an internal walkthrough/demo of the system | Coder | Team agreement on current system state |
| W10-2 | Review progress against the full feature list | System Analyst | Clear picture of what's done vs. remaining |
| W10-3 | List remaining gaps for second semester | System Analyst | Second-semester task list |

**C. Actual Accomplishments**
| Task ID | Task Accomplished | Responsible Member/s | Status | Evidence |
|---|---|---|---|---|
| W10-1 | Held the internal system walkthrough/demo | Coder | Completed | Walkthrough notes recorded |
| W10-2 | Reviewed progress against the full feature list | System Analyst | Completed | Progress summary completed |
| W10-3 | Identified remaining gaps for second semester | System Analyst | Completed | Gap list finalized |

**D. Problems/Issues Encountered**
| Problem/Issue | Effect on Project | Assigned Member/s | Action/s Taken | Status |
|---|---|---|---|---|
| No significant problems encountered this week. | N/A | N/A | N/A | N/A |

**E. Documentation Progress**
| Documentation Component | Assigned Member/s | Status |
|---|---|---|
| Documentation audit; identify remaining gaps | Documenter | Completed |

**F. Plan for Next Week**
| Priority | Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| High | *(End of First Semester)* Begin second-semester Completion Sprint 1 | System Analyst | Remaining major functions addressed |

---

## Week 11 — Completion Sprint 1 *(2nd Semester, Week 1)*
**Reporting Period:** January 15 – January 27, 2027 | **Date Submitted:** January 31, 2027

**A. Weekly Objective/s**
Address the gaps identified in the semester-end audit and complete any remaining major functions carried over from first semester.

**B. Planned Tasks**
| Task ID | Planned Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| W11-1 | Address gaps identified in the Week 10 audit | Coder | Fewer open items on the gap list |
| W11-2 | Complete deferred features from first semester | Coder | All major functions in place |

**C. Actual Accomplishments**
| Task ID | Task Accomplished | Responsible Member/s | Status | Evidence |
|---|---|---|---|---|
| W11-1 | Addressed gaps identified in the Week 10 audit | Coder | Completed | Gap list updated |
| W11-2 | Completed deferred features from first semester | Coder | Completed | Verified against feature list |

**D. Problems/Issues Encountered**
| Problem/Issue | Effect on Project | Assigned Member/s | Action/s Taken | Status |
|---|---|---|---|---|
| No significant problems encountered this week. | N/A | N/A | N/A | N/A |

**E. Documentation Progress**
| Documentation Component | Assigned Member/s | Status |
|---|---|---|
| Complete Chapters 4.4.1–4.4.3 drafts | Documenter | In Progress |

**F. Plan for Next Week**
| Priority | Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| High | Finish all remaining features (Completion Sprint 2) | Coder | Feature-complete system |

---

## Week 12 — Completion Sprint 2 *(2nd Semester, Week 2)*
**Reporting Period:** January 28 – February 9, 2027 | **Date Submitted:** February 13, 2027

**A. Weekly Objective/s**
Finish all remaining features and reach feature completion ahead of full system testing.

**B. Planned Tasks**
| Task ID | Planned Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| W12-1 | Finish all remaining/outstanding features | Coder | System is feature-complete |
| W12-2 | Test each finished feature individually | Tester | Confirmed each feature works as intended |

**C. Actual Accomplishments**
| Task ID | Task Accomplished | Responsible Member/s | Status | Evidence |
|---|---|---|---|---|
| W12-1 | Finished all remaining/outstanding features | Coder | Completed | Verified against feature list |
| W12-2 | Completed feature-level testing | Tester | Completed | Test results recorded |

**D. Problems/Issues Encountered**
| Problem/Issue | Effect on Project | Assigned Member/s | Action/s Taken | Status |
|---|---|---|---|---|
| No significant problems encountered this week. | N/A | N/A | N/A | N/A |

**E. Documentation Progress**
| Documentation Component | Assigned Member/s | Status |
|---|---|---|
| Finalize UAT instrument/procedure | Documenter | Completed |

**F. Plan for Next Week**
| Priority | Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| High | Run full-system testing and bug fixing | Tester | Stable candidate system |

---

## Week 13 — System Testing & Bug Fixing *(2nd Semester, Week 3)*
**Reporting Period:** February 10 – February 22, 2027 | **Date Submitted:** February 26, 2027

**A. Weekly Objective/s**
Run full-system regression testing and fix critical/major bugs to reach a stable candidate system.

**B. Planned Tasks**
| Task ID | Planned Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| W13-1 | Run full-system regression testing | Tester | Full list of remaining bugs |
| W13-2 | Fix critical and major bugs found | Coder | Fewer critical/major issues |
| W13-3 | Prepare the system for user acceptance testing | Coder | Stable candidate build ready for UAT |

**C. Actual Accomplishments**
| Task ID | Task Accomplished | Responsible Member/s | Status | Evidence |
|---|---|---|---|---|
| W13-1 | Completed full-system regression testing | Tester | Completed | Test results recorded |
| W13-2 | Fixed critical and major bugs found | Coder | Completed | Verified fixes; retested |
| W13-3 | Prepared the stable candidate build | Coder | Completed | Build ready for UAT |

**D. Problems/Issues Encountered**
| Problem/Issue | Effect on Project | Assigned Member/s | Action/s Taken | Status |
|---|---|---|---|---|
| No significant problems encountered this week. | N/A | N/A | N/A | N/A |

**E. Documentation Progress**
| Documentation Component | Assigned Member/s | Status |
|---|---|---|
| Finalize UAT data gathering plan | Documenter | Completed |

**F. Plan for Next Week**
| Priority | Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| High | Conduct User Acceptance Testing | Tester | UAT completed with user feedback |

---

## Week 14 — User Acceptance Testing *(2nd Semester, Week 4)*
**Reporting Period:** February 23 – March 7, 2027 | **Date Submitted:** March 11, 2027

**A. Weekly Objective/s**
Conduct UAT with real users across all roles and gather feedback for final refinement.

**B. Planned Tasks**
| Task ID | Planned Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| W14-1 | Conduct UAT sessions with users of each role | Tester | Direct feedback from real users |
| W14-2 | Log and prioritize issues/feedback from UAT | System Analyst | Prioritized list of fixes/changes needed |

**C. Actual Accomplishments**
| Task ID | Task Accomplished | Responsible Member/s | Status | Evidence |
|---|---|---|---|---|
| W14-1 | Completed UAT sessions with applicants, admin/registrar, evaluators, academic head, and support staff | Tester | Completed | UAT session notes/results recorded |
| W14-2 | Logged and prioritized feedback from UAT | System Analyst | Completed | Prioritized issue list completed |

**D. Problems/Issues Encountered**
| Problem/Issue | Effect on Project | Assigned Member/s | Action/s Taken | Status |
|---|---|---|---|---|
| No significant problems encountered this week. | N/A | N/A | N/A | N/A |

**E. Documentation Progress**
| Documentation Component | Assigned Member/s | Status |
|---|---|---|
| Complete Chapters 4.4.1–4.4.4 | Documenter | Completed |

**F. Plan for Next Week**
| Priority | Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| High | Finalize the system and documentation based on UAT results | Coder | Final system ready |

---

## Week 15 — Finalization *(2nd Semester, Week 5)*
**Reporting Period:** March 8 – March 20, 2027 | **Date Submitted:** March 24, 2027

**A. Weekly Objective/s**
Implement UAT feedback, finalize the system, and complete the full manuscript.

**B. Planned Tasks**
| Task ID | Planned Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| W15-1 | Implement fixes/changes from UAT feedback | Coder | Final version of the system |
| W15-2 | Finalize the system for release | Coder | System ready for defense |

**C. Actual Accomplishments**
| Task ID | Task Accomplished | Responsible Member/s | Status | Evidence |
|---|---|---|---|---|
| W15-1 | Implemented fixes/changes from UAT feedback | Coder | Completed | Verified against UAT feedback list |
| W15-2 | Finalized the system | Coder | Completed | Final build confirmed |

**D. Problems/Issues Encountered**
| Problem/Issue | Effect on Project | Assigned Member/s | Action/s Taken | Status |
|---|---|---|---|---|
| No significant problems encountered this week. | N/A | N/A | N/A | N/A |

**E. Documentation Progress**
| Documentation Component | Assigned Member/s | Status |
|---|---|---|
| Chapter 5; full manuscript | Documenter | Completed |

**F. Plan for Next Week**
| Priority | Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| High | Prepare for the final defense | Documenter | Final manuscript and presentation ready |

---

## Week 16 — FINAL DEFENSE *(2nd Semester, Week 6)*
**Reporting Period:** March 21 – April 2, 2027 | **Date Submitted:** April 6, 2027

**A. Weekly Objective/s**
Prepare the final manuscript and presentation, and conduct the final defense.

**B. Planned Tasks**
| Task ID | Planned Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| W16-1 | Prepare the final manuscript and defense presentation | Documenter | Complete manuscript and slide deck |
| W16-2 | Rehearse and conduct the final defense | All Members | Successful final defense |

**C. Actual Accomplishments**
| Task ID | Task Accomplished | Responsible Member/s | Status | Evidence |
|---|---|---|---|---|
| W16-1 | Finished the final manuscript and defense presentation | Documenter | Completed | Manuscript and slides finalized |
| W16-2 | Conducted the final defense | All Members | Completed | Defense completed |

**D. Problems/Issues Encountered**
| Problem/Issue | Effect on Project | Assigned Member/s | Action/s Taken | Status |
|---|---|---|---|---|
| No significant problems encountered this week. | N/A | N/A | N/A | N/A |

**E. Documentation Progress**
| Documentation Component | Assigned Member/s | Status |
|---|---|---|
| Final manuscript and presentation | Documenter | Completed |

**F. Plan for Next Week**
| Priority | Task | Assigned Member/s | Expected Output |
|---|---|---|---|
| — | *(Project complete — no further weeks planned)* | — | — |
