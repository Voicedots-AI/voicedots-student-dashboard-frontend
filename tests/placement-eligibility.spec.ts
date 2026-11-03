import {test,expect} from "@playwright/test";
import {evaluatedPlacementScore,meetsPlacementATSThreshold} from "../src/placement-eligibility";

test("the configured ATS cutoff is exact and inclusive",()=>{
  for(const score of [0,13.9,49,55,59.999]) expect(meetsPlacementATSThreshold(evaluatedPlacementScore("evaluated",score),60)).toBe(false);
  for(const score of [60,60.001,82.2,100]) expect(meetsPlacementATSThreshold(evaluatedPlacementScore("evaluated",score),60)).toBe(true);
});

test("missing, malformed and out-of-range scores never allow an interview",()=>{
  for(const score of [null,undefined,"82.2",NaN,Infinity,-1,100.1]) {
    expect(evaluatedPlacementScore("evaluated",score)).toBeNull();
    expect(meetsPlacementATSThreshold(score,60)).toBe(false);
  }
});

test("only an evaluated result can qualify even when a numeric score is returned",()=>{
  for(const status of ["processing","not_assessed","needs_reevaluation","evaluation_failed",""]) {
    expect(meetsPlacementATSThreshold(evaluatedPlacementScore(status,82.2),60)).toBe(false);
  }
});


test("the reported 81.6 percent assessment remains eligible independently of skill guidance",()=>{
 const assessment={ats_status:"evaluated",ats_fit_score:81.6,skills:[{evidence_level:"declared",match_status:"FULL_MATCH"}]};
 expect(meetsPlacementATSThreshold(evaluatedPlacementScore(assessment.ats_status,assessment.ats_fit_score),60)).toBe(true);
});

test("blank ATS minimum does not invent a score restriction",()=>{
 expect(meetsPlacementATSThreshold(null,null)).toBe(true);
 expect(meetsPlacementATSThreshold(0,null)).toBe(true);
 expect(meetsPlacementATSThreshold(0,0)).toBe(true);
 expect(meetsPlacementATSThreshold(null,0)).toBe(false);
});
