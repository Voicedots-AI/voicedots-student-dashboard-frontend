import {test,expect} from '@playwright/test';
import {mockPerformance,releasedReport} from './performance-fixtures';

test('drive Progress uses the same shared chart and completion metrics as the client portal',async({page})=>{
 const report=releasedReport('shared-progress',42,1,{drive_id:'drive-one',report:{overall_score:42,score_breakdown:{technical:40,communication:44}}});
 await mockPerformance(page,{reportRows:[report]});
 await page.route('**/api/student/drives',r=>r.fulfill({json:[{id:'drive-one',company_name:'First Company',role_title:'Engineer',status:'active',interview_status:'completed',interview_action:'completed',main_resume_available:true}]}));
 await page.route('**/api/student/coach/journey-access?**',r=>r.fulfill({json:{unlocked:true}}));
 await page.route('**/api/student/coach/improvement-journey?**',r=>r.fulfill({json:{drive_id:'drive-one',company_name:'First Company',role_title:'Engineer',interview_result:{overall_score:42,competencies:[]},improvement_plan:{focus_areas:[],weekly_roadmap:[]},daily_schedule:[],weekly_metrics:{goals:[]},learning_resources:{syllabus_topics:[],question_bank:[]},reattempt_plan:[],progress_tracking:{modules_completed:3,questions_completed:4,questions_total:10,mock_interviews_completed:1,mock_interviews_total:3},placement_readiness:{competencies:[],recommended_steps:[],target_drives:[]}}}));
 await page.goto('/placement/progress?drive=drive-one&company=First%20Company&role=Engineer');
 const progress=page.getByRole('region',{name:'Progress Tracking',exact:true});
 await expect(progress.getByRole('heading',{name:'My Improvement Journey'})).toBeVisible();
 await expect(progress.locator('.s8-metric-value').nth(0)).toHaveText('3');await expect(progress.locator('.s8-metric-value').nth(1)).toHaveText('4 / 10');await expect(progress.locator('.s8-metric-value').nth(2)).toHaveText('1 / 3');
 await expect(progress).toContainText('1 recorded attempt');await expect(progress.getByRole('button',{name:/Overall score/})).toContainText('42');
});
