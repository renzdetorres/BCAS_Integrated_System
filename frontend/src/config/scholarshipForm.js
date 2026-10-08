// Content of the School Year 2026-2027 Academic Scholarship Application and Consent Form,
// kept in one place so the form page and the staff views read from the same source.

export const SCHOOL_NAME = "Batangas College of Arts and Sciences, Inc.";

export const LEVEL_OPTIONS = ["Grade 7", "Grade 11", "First Year College"];

export const GUARDIAN_ROLE_OPTIONS = ["Parent", "Official guardian"];

// Where each level places the applicant (mirrors the server's ScholarshipFormConstants).
export const DEPARTMENT_FOR_LEVEL = {
  "Grade 7": "High School",
  "Grade 11": "Senior High School",
  "First Year College": "College",
};

export const GRADE_REQUIREMENTS = {
  "Grade 7": {
    heading: "Incoming Grade 7 and Grade 11 (any of the following)",
    items: [
      "In the list of the top 5 students of the graduating / completing batch in any of the first 2 quarters of the current school year",
      "At least 95% General Average in any of the first 2 quarters of the current school year",
      "At least 95% General Average of the final ratings of all the learning areas in the report card (SF 9)",
    ],
  },
  "Grade 11": {
    heading: "Incoming Grade 7 and Grade 11 (any of the following)",
    items: [
      "In the list of the top 5 students of the graduating / completing batch in any of the first 2 quarters of the current school year",
      "At least 95% General Average in any of the first 2 quarters of the current school year",
      "At least 95% General Average of the final ratings of all the learning areas in the report card (SF 9)",
    ],
  },
  "First Year College": {
    heading: "Incoming First Year College",
    items: [
      "In the list of the top 20% of the graduating students in the same strand for the first semester of the current SY",
      "At least 95% General Average for the first semester of the current school year",
      "At least 95% General Average of the first and second semesters in the report card (SF 9)",
    ],
  },
};

export const GRADE_CERTIFICATION_NOTE =
  "Copy of the grades must be certified by the School Principal / School Head / Teacher-in-Charge or the School Registrar.";

export const GRANTS_NOTE =
  "In line with the retention qualifications, the privileges or grants awarded to scholars are subject to adjustment - whether increased, decreased, or terminated - depending on the general average achieved. This evaluation occurs after each semester for college and Senior High School academic scholars, and after each school year for Junior High School academic scholars.";

export const GRANTS = {
  "Grade 7": {
    caption: "For Incoming Grade 7 and Grade 11 Students",
    columns: ["Academic scholarship type", "Privileges / grants", "General average (GA) retention qualifications"],
    rows: [
      ["Diamond", "100% off tuition & miscellaneous fees; free books", "98-100%"],
      ["Gold", "100% off tuition fee", "97%"],
      ["Silver", "50% off tuition fee", "96%"],
      ["Bronze", "25% off tuition fee", "95%"],
      ["IRC Grant", "20% off tuition fee", "94%"],
      ["RMC Grant", "15% off tuition fee", "93%"],
    ],
  },
  "First Year College": {
    caption: "For Incoming First Year College Students",
    columns: ["Academic scholarship type", "Privileges / grants", "First semester general average and other retention qualifications"],
    rows: [
      ["Diamond", "100% off tuition fee and other fees", "At least 95% (1.25) semester average and lowest grade of 89% (1.75) of full semester unit load; no discipline case (until graduation while maintained)"],
      ["Gold", "100% off tuition fee", "94% (1.50) semester average and lowest grade of 86% (2.00) of full semester unit load; no discipline case (until graduation while maintained)"],
      ["Silver", "50% off tuition fee", "93% (1.50) semester average and lowest grade of 83% (2.25) of full semester unit load; no discipline case (until graduation while maintained)"],
      ["Bronze", "25% off tuition fee", "92% (1.50) semester average and lowest grade of 80% (2.50) of full semester unit load; no discipline case (until graduation while maintained)"],
    ],
    footnote:
      "Failure to maintain the grade retention requirement but without a failing grade may still enjoy the discount on tuition fee where qualified.",
  },
};
GRANTS["Grade 11"] = GRANTS["Grade 7"];

export const DOCUMENTARY_REQUIREMENTS = [
  "Duly signed digital copy of the original or certified true copy of the report card (SF 9)",
  "Duly signed and accomplished scholarship application form",
  "2x2 recent ID photo of the applicant",
];

export const SCREENING_STEPS = [
  "All applicants must comply with the grade qualification requirements.",
  "All qualified applicants will undergo a written examination, panel interview and essay examination.",
  "The applicants will be ranked. Based on the ranking, they are to enjoy the privileges listed in the table.",
];

export const CONSENT_READ_NOTE =
  "Please read this section together with your parent or official guardian. By answering Yes to the questions below, you confirm that your parent/guardian has read it and agrees.";

export const DATA_PRIVACY_CONSENT = [
  `By accomplishing this form, you understand and agree that ${SCHOOL_NAME} will collect, use, and store your personal information and responses.`,
  "This data collection is strictly for the institution's stated goals, vision, and mission, and is conducted in full accordance with the Data Privacy Act of 2012 (Republic Act No. 10173).",
];

export const CONSENT_RATIONALE = [
  "The academic scholarship screening, facilitated by academic heads, will primarily be conducted in person but may also utilize videoconferencing, social media, and office applications as needed.",
  "Scholarship applicants will undergo a panel interview, written examination, and essay examination.",
  "Please be advised that participation in this academic scholarship screening is entirely VOLUNTARY and requires the consent of your parent or official guardian.",
  "For virtual screenings, the entire session will be recorded for official documentation purposes. These recordings will be considered school property. Under no circumstances are scholarship applicants, parents/guardians, or anyone outside the academic scholarship screening committee permitted to capture photos, take screenshots, or record video or audio during the screening.",
  "Scholarship applicants are expected to conduct themselves appropriately. Any inappropriate behavior or gestures may result in removal or disqualification from the screening process.",
];

export const DATA_PRIVACY_NOTICE =
  "By participating in this academic scholarship screening, you consent to BCAS collecting your personal information and that of the scholarship applicant. The personal information gathered will be used solely for the purposes of the screening process and other related activities outlined in these guidelines, in compliance with the Data Privacy Act of 2012.";

export const CONSENT_AND_AGREEMENT = [
  "You confirm that you, the applicant, meet the eligibility requirements to participate in the academic scholarship screening.",
  "You and your parent/guardian acknowledge and permit you, the applicant, to take part in the screening, and both of you agree to adhere to the screening guidelines.",
  "You assure that you, the applicant, will complete the screening tasks independently.",
  "You grant BCAS, along with its subsidiaries, affiliates, licensees, successors, and assigns, the right to create audio, visual, and audiovisual recordings (in any format or media) of your participation in the screening if conducted virtually.",
  "You hereby waive, release, and discharge BCAS and its agents, promoters, employees, officers, directors, affiliates, successors, and assigns from any and all claims, demands, causes of action, lawsuits, damages, and liabilities of any kind, whether known or unknown, in law or equity, that you, your parent/guardian or the applicant have or may have, arising from or related to the applicant's participation in the screening.",
  "This consent and agreement shall remain in effect after the screening concludes. Any amendments to this consent must be mutually agreed upon in writing by both you (with your parent/guardian) and BCAS, explicitly stating that it modifies this consent.",
];

export const CONSENT_QUESTIONS = [
  {
    name: "consentTerms",
    label:
      "Do you confirm that you and your parent/guardian have read, understood, and fully agreed to the terms of this consent form, and that you voluntarily accept and agree to be bound by its provisions?",
  },
  {
    name: "consentParticipation",
    label: "Do you, with the consent of your parent/guardian, agree to take part in the academic scholarship screening?",
  },
  {
    name: "consentCertification",
    label: `All information provided in this form will be handled with the highest level of confidentiality, in accordance with the Data Privacy Act of 2012. Do you certify that the information provided is true and correct to the best of your knowledge, and do you (with your parent/guardian) grant ${SCHOOL_NAME} permission to use your responses for institutional purposes and objectives?`,
  },
];
