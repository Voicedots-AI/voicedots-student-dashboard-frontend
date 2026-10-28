import {test,expect} from '@playwright/test';
import {mockPerformance,releasedReport} from './performance-fixtures';

test('Placements card footer owns drive actions and Overview has no drive section',async({page})=>{
 await page.setViewportSize({width:1600,height:1100});
 const report=releasedReport('drive-score',68.5,2,{drive_id:'closed-drive'});
 const hidden=releasedReport('hidden',99,0,{drive_id:'closed-drive',status:'completed',report:{status:'awaiting_release',overall_score:99}});
 await mockPerformance(page,{reportRows:[report,hidden,releasedReport('unrelated',91,1,{drive_id:'other-drive'})]});
 await page.route('**/api/student/drives',r=>r.fulfill({json:[
  {id:'open-drive',company_name:'Open Company',role_title:'Engineer',status:'active',eligibility_status:'eligible',interview_action:'start',main_resume_available:true},
  {id:'closed-drive',company_name:'Completed Company',role_title:'Analyst',status:'closed',eligibility_status:'eligible',interview_status:'closed'},
  {id:'not-eligible',company_name:'Excluded Company',role_title:'Engineer',status:'active',eligibility_status:'ineligible'}
 ]}));
 const atsRequests:string[]=[];
 await page.route('**/api/student/drives/*/ats-fit',r=>{atsRequests.push(r.request().url());const id=new URL(r.request().url()).pathname.split('/')[4];return r.fulfill({json:{ats_status:'evaluated',ats_fit_score:id==='open-drive'?84.2:38.2,skills:[]}})});
 await page.goto('/placements');
 const open=page.locator('.drive-card[data-drive-id="open-drive"]'),closed=page.locator('.drive-card[data-drive-id="closed-drive"]');
 await expect(page.getByText('Click and view',{exact:true})).toHaveCount(0);
 expect(await open.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(480);
 await expect(open.getByRole('button',{name:'View opportunity',exact:true})).toBeVisible();
 await expect(open.getByRole('link',{name:'ATS Fit 84.2%'})).toHaveAttribute('href','/ats-fit?drive=open-drive');
 await expect(open.getByRole('link',{name:'Start Interview'})).toHaveAttribute('href','/practice?drive=open-drive');
 await expect(open.getByRole('link',{name:'AI Coach Advice & Progress'})).toHaveAttribute('href','/coach?drive=open-drive&view=progress');
 await expect(open.locator('.placement-feature-unavailable').filter({hasText:'Score Card'})).toBeVisible();
 await expect(closed.getByRole('link',{name:'Score Card 68.5%'})).toHaveAttribute('href','/reports/session-drive-score');
 await expect(closed).not.toContainText('99%');await expect(closed).not.toContainText('91%');
 await expect(closed.locator('.placement-feature-unavailable').filter({hasText:'Interview closed'})).toBeVisible();
 await expect(page.locator('.drive-card[data-drive-id="not-eligible"]').getByText('Not eligible',{exact:true})).toBeVisible();
 await expect(page.locator('.drive-card[data-drive-id="not-eligible"]').getByRole('link',{name:'Start Interview'})).toHaveCount(0);
 await page.screenshot({path:'test-results/placement-fixture.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.goto('/');await expect(page.getByRole('heading',{name:'Student Assessment Intelligence'})).toBeVisible();
 await expect(page.locator('.upcoming-ats')).toHaveCount(0);await expect(page.locator('.placement-drive-footer')).toHaveCount(0);
});

test('AI Coach progress link restores the existing saved plan and leaves the review placeholder inactive',async({page})=>{
 await mockPerformance(page,{reportRows:[]});
 const plan={id:'saved-plan',drive_id:'closed-drive',company_name:'Completed Company',role_title:'Analyst',target_date:'2027-01-01',plan:{goal:'Saved preparation goal',summary:'Saved plan summary',discussion_starters:[],daily_roadmap:[{day:1,session_id:'saved-session',title:'Saved lesson',focus:'Evidence',activities:['Review saved feedback'],success_check:'Explain the approach'}]}};
 await page.route('**/api/student/coach/overview',r=>r.fulfill({json:{upcoming_drives:[],completed_placements:[{drive_id:'closed-drive',company_name:'Completed Company',role_title:'Analyst',feedback_status:'available',has_coaching_plan:true}],plans:[plan],main_resume:{submission_id:'resume-main',label:'Main Resume'}}}));
 await page.route('**/api/student/coach/drives/closed-drive/context',r=>r.fulfill({json:{company_name:'Completed Company',role_title:'Analyst',job_description:'Recorded job description',preparation_mode:'improvement'}}));
 await page.route('**/api/student/coach/latest-recommendation',r=>r.fulfill({json:{available:false,weak_skills:[]}}));
 let coachWrites=0;await page.route('**/api/student/coach/**',r=>{if(r.request().method()!=='GET')coachWrites++;return r.fallback()});
 await page.goto('/coach?drive=closed-drive&view=progress');
 await expect(page.locator('.coach-approved-page')).toHaveAttribute('data-stage','4');
 await expect(page.getByRole('heading',{name:'Saved lesson'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Post-interview review Coming soon'})).toBeDisabled();
 await expect(page.getByRole('navigation',{name:'AI Coach stages'}).getByRole('button')).toHaveCount(5);
 expect(coachWrites).toBe(0);
 await page.screenshot({path:'test-results/coach-fixture.png',fullPage:true});
});


test('an unavailable requested coaching drive never silently selects a different drive',async({page})=>{
 await mockPerformance(page,{reportRows:[]});
 await page.route('**/api/student/coach/overview',r=>r.fulfill({json:{upcoming_drives:[{drive_id:'another-drive',company_name:'Other Company',role_title:'Other role'}],completed_placements:[],plans:[],main_resume:{submission_id:'resume-main',label:'Main Resume'}}}));
 await page.route('**/api/student/coach/latest-recommendation',r=>r.fulfill({json:{available:false,weak_skills:[]}}));
 const contexts:string[]=[];await page.route('**/api/student/coach/drives/*/context',r=>{contexts.push(r.request().url());return r.fulfill({json:{}})});
 await page.goto('/coach?drive=unavailable-drive&view=progress');
 await expect(page.getByRole('status')).toContainText('This placement is not available for coaching yet');
 await expect(page.getByLabel('Placement opportunity')).toHaveValue('');expect(contexts).toHaveLength(0);
});

test('interview deadline closes cards and an open opportunity without refreshing',async({page})=>{
 await page.clock.install({time:new Date('2026-10-29T09:59:59Z')});
 await page.clock.pauseAt(new Date('2026-10-29T10:00:00Z'));
 await mockPerformance(page,{reportRows:[]});
 const drive={id:'deadline-drive',company_name:'Deadline Company',role_title:'Engineer',status:'active',eligibility_status:'eligible',interview_status:'open',interview_action:'start',main_resume_available:true,window_end_at:'2026-10-29T10:00:05Z'};
 await page.route('**/api/student/drives',r=>r.fulfill({json:[drive,{...drive,id:'expired-drive',company_name:'Expired Company',interview_status:'expired',window_end_at:undefined}]}));
 await page.route('**/api/student/drives/*/ats-fit',r=>r.fulfill({json:{ats_status:'evaluated',ats_fit_score:60,skills:[]}}));
 await page.route('**/api/student/drives/deadline-drive/interview-context',r=>r.fulfill({json:{drive_id:drive.id,company_name:drive.company_name,role_title:'Engineer',action:'start',can_start:true,main_resume_available:true,interview_window:'open',interview_window_end_at:drive.window_end_at,attempt_number:1,max_attempts:2,attempts_used:0,attempts_remaining:2}}));
 await page.goto('/placements');
 const card=page.locator('.drive-card[data-drive-id="deadline-drive"]');
 await expect(card.getByText('Open now',{exact:true})).toBeVisible();
 await expect(card.getByRole('link',{name:'Start Interview'})).toBeVisible();
 await expect(page.locator('.drive-card[data-drive-id="expired-drive"]').getByText('Expired',{exact:true})).toBeVisible();
 await card.getByRole('button',{name:'View opportunity',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog.getByRole('button',{name:'Start Interview',exact:true})).toBeVisible();
 await page.clock.fastForward(6000);
 await expect(dialog.getByRole('button',{name:'Start Interview',exact:true})).toHaveCount(0);
 await expect(card.getByText('Closed',{exact:true})).toBeAttached();
 await expect(card.getByRole('link',{name:'Start Interview'})).toHaveCount(0);
 await expect(card.locator('..').locator('..')).toContainText('Closed & past');
});

test('neutral cards show coloured ATS at the top and drive-specific JD gaps upfront',async({page})=>{
 await mockPerformance(page,{reportRows:[]});
 await page.route('**/api/student/drives',r=>r.fulfill({json:[{id:'gap-drive',company_name:'JD Company',role_title:'AI Engineer',status:'active',interview_action:'start',eligibility_status:'eligible',main_resume_available:true},{id:'strong-drive',company_name:'Strong Company',role_title:'Engineer',status:'active',interview_action:'start',eligibility_status:'eligible',main_resume_available:true}]}));
 await page.route('**/api/student/drives/*/ats-fit',r=>r.fulfill({json:r.request().url().includes('gap-drive')?{ats_status:'evaluated',ats_fit_score:29.1,skills:[{skill:'Python',priority:'mandatory',match_status:'NO_EVIDENCE'},{skill:'Model deployment',priority:'core',match_status:'NO_EVIDENCE'},{skill:'Optional tool',priority:'preferred',match_status:'NO_EVIDENCE'},{skill:'SQL',priority:'mandatory',match_status:'FULL_MATCH'}]}:{ats_status:'evaluated',ats_fit_score:81,skills:[]}}));
 await page.route('**/api/student/drives/gap-drive/interview-context',r=>r.fulfill({json:{drive_id:'gap-drive',company_name:'JD Company',role_title:'AI Engineer',action:'start',can_start:true,main_resume_available:true,interview_window:'open',eligibility:{status:'eligible'},attempt_number:1,max_attempts:2,attempts_used:0,attempts_remaining:2}}));
 await page.goto('/placements');
 const card=page.locator('.drive-card[data-drive-id="gap-drive"]'),strong=page.locator('.drive-card[data-drive-id="strong-drive"]');
 await expect(card.locator('.drive-card-top').getByRole('link',{name:'ATS Fit 29.1%',exact:true})).toBeVisible();
 await expect(card).toHaveCSS('background-color','rgb(255, 255, 255)');
 await expect(strong).toHaveCSS('background-color','rgb(255, 255, 255)');
 await expect(card.locator('.placement-ats-label')).toHaveCSS('color','rgb(159, 18, 57)');
 await expect(strong.locator('.placement-ats-label')).toHaveCSS('color','rgb(6, 95, 70)');
 await expect(card.locator('.placement-skill-notice')).toContainText('Python, Model deployment');
 await expect(card.locator('.placement-skill-notice')).not.toContainText('Optional tool');
 await expect(card.locator('.placement-skill-notice')).not.toContainText('SQL');
 await expect(strong.locator('.placement-skill-notice')).toHaveCount(0);
 await expect(card.locator('.placement-drive-footer .placement-ats-label')).toHaveCount(0);
 await expect(card.getByRole('link',{name:'Start Interview'})).toHaveCount(0);
 await expect(card.locator('.drive-status-badges').getByText('Not eligible',{exact:true})).toBeVisible();
 await expect(card.locator('.drive-status-badges').getByText('Eligible',{exact:true})).toHaveCount(0);
 await expect(strong.locator('.drive-status-badges').getByText('Eligible',{exact:true})).toBeVisible();
 await expect(card.getByRole('button',{name:'View opportunity',exact:true})).toBeVisible();
 await card.getByRole('button',{name:'View opportunity',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Required JD skills not evidenced: Python, Model deployment');
 await expect(page.getByRole('dialog').getByRole('button',{name:'Start Interview',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Close opportunity details',exact:true}).click();
 await page.setViewportSize({width:390,height:844});
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/student-card-jd-gaps-mobile.png',fullPage:true});
});
