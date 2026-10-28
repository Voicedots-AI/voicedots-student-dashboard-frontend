import { test, expect, type Page } from "@playwright/test";

const identity = {
  student: {
    id: "student-1",
    full_name: "Asha Kumar",
    email: "asha@college.edu",
    roll_number: "CS2026001",
    college_name: "Example College of Engineering",
    program: "B.Tech",
    department_code: "CSE",
    graduation_year: 2027,
    cgpa: 8.6,
    photo_url: "/api/student/profile/photo",
    current_resume_submission_id: "resume-main",
  },
};
const readiness = {
  overall_score: null,
  status: "incomplete",
  axis_scores: {},
  not_assessed: ["interview_readiness", "resume_readiness"],
};
const dashboard = { reports: [], attempts: [], readiness, drives: [] };

async function mockStudent(page: Page, options: { signedIn?: boolean } = {}) {
  let signedIn = options.signedIn ?? true;
  let passwordSetupCompleted = false;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/student-me")
      return route.fulfill({
        status: signedIn ? 200 : 401,
        json: signedIn ? identity : { detail: "Authentication required." },
      });
    if (
      path === "/api/auth/student-login" ||
      path === "/api/auth/student-enroll"
    ) {
      signedIn = true;
      return route.fulfill({ json: identity });
    }
    if (path === "/api/auth/student-password-setup-status") return route.fulfill({ json: { status: passwordSetupCompleted ? "completed" : "valid" } });
    if (path === "/api/auth/student-password-setup") { passwordSetupCompleted = true; return route.fulfill({ json: { status: "password_set" } }); }
    if (path === "/api/auth/student-password-link") return route.fulfill({ json: { status: "accepted" } });
    if (path === "/api/auth/student-logout") {
      signedIn = false;
      return route.fulfill({ json: { status: "ok" } });
    }
    const responses: Record<string, unknown> = {
      "/api/student/dashboard": dashboard,
      "/api/student/academics": {status:"not_connected",message:"Academic records are not connected yet."},
      "/api/student/readiness": readiness,
      "/api/student/drives": [],
      "/api/student/reports": { reports: [] },
      "/api/student/calendar/personal-events": { events: [] },
      "/api/student/resume-library": { resumes: [] },
      "/api/student/resume-library/identity-check": { matches:true,candidate_name:"Asha Kumar",student_name:"Asha Kumar" },
      "/api/student/practice/resumable": { attempts: [] },
      "/api/student/coach/latest-recommendation": { available: false, weak_skills: [], message: "Complete a placement interview to receive focused coaching recommendations." },
      "/api/student/coach/training-cycles": { cycles: [] },
      "/api/student/coach/overview": { upcoming_drives: [], plans: [], completed_drive_recommendation: null },
    };
    return route.fulfill({
      status: path in responses ? 200 : 404,
      json: responses[path] || { detail: "Not found." },
    });
  });
}

test('Step 1 ATS card thresholds, missing states and retry remain drive scoped', async ({page}) => {
  await page.setViewportSize({width:1600,height:1100});
  await mockStudent(page);
  const rows = ['green','red','pending','missing','failed'].map(id=>({id, company_name:`Fixture ${id}`,role_title:'Engineer',status:'active',eligibility_status:'eligible',main_resume_available:true}));
  await page.route('**/api/student/drives',route=>route.fulfill({json:rows}));
  let failed = true;
  const requested:string[]=[];
  await page.route('**/api/student/drives/*/ats-fit',route=>{
    const id = new URL(route.request().url()).pathname.split('/')[4]; requested.push(id);
    if(id==='failed'&&failed)return route.fulfill({status:503,json:{detail:'Fixture ATS failure'}});
    return route.fulfill({json:{ats_status:id==='pending'?'processing':'evaluated',ats_fit_score:id==='green'?50:id==='red'?29.1:id==='pending'?88:id==='missing'?null:75,skills:[]}});
  });
  await page.goto('/placements');
  const card=(id:string)=>page.locator(`.drive-card[data-drive-id="${id}"]`);
  await expect(card('green').getByRole('link',{name:'ATS Fit 50%',exact:true})).toBeVisible();
  await expect(card('green')).toHaveCSS('background-color','rgb(255, 255, 255)');
  await expect(card('red').getByRole('link',{name:'ATS Fit 29.1%',exact:true})).toBeVisible();
  await expect(card('red')).toHaveCSS('background-color','rgb(255, 255, 255)');
  for(const id of ['pending','missing','failed'])await expect(card(id).getByRole('link',{name:'ATS Fit Not assessed',exact:true})).toBeVisible();
  await expect(page.locator('.drive-status-badges > .pill')).toHaveCount(5);
  await page.screenshot({path:'test-results/student-fixture-cards.png',fullPage:true});
  failed=false; await card('failed').getByRole('button',{name:'Retry ATS assessment'}).click();
  await expect(card('failed').getByRole('link',{name:'ATS Fit 75%',exact:true})).toBeVisible();
  expect(new Set(requested)).toEqual(new Set(rows.map(row=>row.id)));
});


test('Student placement button opens the same assessment without a sidebar duplicate', async ({page}) => {
 await page.setViewportSize({width:1600,height:1000});
 await mockStudent(page);
 const drives=['one','two'].map(id=>({id,company_name:`Fixture ${id}`,role_title:'Engineer',status:'active',eligibility_status:'eligible'}));
 await page.route('**/api/student/drives',r=>r.fulfill({json:drives}));
 await page.route('**/api/student/drives/*/interview-context',r=>r.fulfill({json:{drive_id:new URL(r.request().url()).pathname.split('/')[4],attempts:[],action:'not_assigned'}}));
 await page.route('**/api/student/drives/*/ats-fit',r=>{
  const id=new URL(r.request().url()).pathname.split('/')[4];
  return r.fulfill({json:{ats_status:'evaluated',ats_fit_score:id==='one'?81:29.1,skills:[{skill:`Requirement ${id}`,priority:'core',match_status:'FULL_MATCH',evidence_text:`Evidence ${id}`}],resume_sections:{projects:[`Project ${id}`]},resume_parse_ready:true,job_description:`JD ${id}`,verified_requirements_count:1,total_requirements_count:1}});
 });
 await page.goto('/placements');
 const card=page.locator('.drive-card[data-drive-id="two"]');
 await expect(card.getByRole('link',{name:'ATS Fit 29.1%',exact:true})).toBeVisible();
 await expect(card.getByText('Assessment Intelligence',{exact:true})).toHaveCount(0);
 await card.getByRole('button',{name:'View opportunity',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.locator('.opportunity-dialog .drive-ats-panel')).toHaveCount(0);
 await page.getByRole('button',{name:'Close opportunity details',exact:true}).click();
 await card.getByRole('link',{name:'ATS Fit 29.1%',exact:true}).click();
 await expect(page).toHaveURL(/\/ats-fit\?drive=two$/);
 const detail=page.getByRole('region',{name:'ATS Fit Assessment',exact:true});
 await expect(detail).toContainText('29.1');
 await expect(detail).toContainText('Requirement two');
 await expect(detail).not.toContainText('Requirement one');
 await expect(page.locator('.drive-ats-panel')).toHaveCount(1);
 await expect(detail.locator('.student-ats-left')).toHaveCSS('display','flex');
 await expect(detail.locator('.student-ats-right')).toHaveCSS('display','flex');
 await detail.locator('.student-ats-combined>summary').click();
 await expect(detail.getByRole('heading',{name:'Assessment record',exact:true})).toBeVisible();
 await expect(detail.getByRole('heading',{name:'Placement opportunity',exact:true})).toBeVisible();
 await expect(detail.locator('.student-ats-job-description')).toContainText('JD two');
 await expect(detail.locator('.student-ats-combined')).toHaveCSS('overflow-y','visible');

 await page.screenshot({path:'test-results/student-fixture-detail.png',fullPage:true});
 await expect(page.getByRole('navigation',{name:'Student navigation'}).getByRole('link',{name:'ATS Fit',exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:'Back to placements',exact:true}).click();
 await expect(page).toHaveURL(/\/placements$/);
 await page.goto('/ats-fit');
 await expect(page).toHaveURL(/\/placements$/);
 await expect(card.locator('.drive-card-top').getByRole('link',{name:'ATS Fit 29.1%',exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/student-cards-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await expect(card.getByRole('link',{name:'ATS Fit 29.1%',exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/student-cards-mobile.png',fullPage:true});
});
