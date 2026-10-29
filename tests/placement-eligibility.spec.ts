import {test,expect} from "@playwright/test";
import {evaluatedPlacementScore,meetsPlacementATSThreshold} from "../src/placement-eligibility";

test("interview eligibility includes exactly 50 and blocks scores below it",()=>{
  for(const score of [0,13.9,49,49.999]) expect(meetsPlacementATSThreshold(evaluatedPlacementScore("evaluated",score))).toBe(false);
  for(const score of [50,50.001,82.2,100]) expect(meetsPlacementATSThreshold(evaluatedPlacementScore("evaluated",score))).toBe(true);
});

test("missing, malformed and out-of-range scores never allow an interview",()=>{
  for(const score of [null,undefined,"82.2",NaN,Infinity,-1,100.1]) {
    expect(evaluatedPlacementScore("evaluated",score)).toBeNull();
    expect(meetsPlacementATSThreshold(score)).toBe(false);
  }
});

test("only an evaluated result can qualify even when a numeric score is returned",()=>{
  for(const status of ["processing","not_assessed","needs_reevaluation","evaluation_failed",""]) {
    expect(meetsPlacementATSThreshold(evaluatedPlacementScore(status,82.2))).toBe(false);
  }
});


test("the reported 81.6 percent assessment remains eligible independently of skill guidance",()=>{
 const assessment={ats_status:"evaluated",ats_fit_score:81.6,skills:[{evidence_level:"declared",match_status:"FULL_MATCH"}]};
 expect(meetsPlacementATSThreshold(evaluatedPlacementScore(assessment.ats_status,assessment.ats_fit_score))).toBe(true);
});
