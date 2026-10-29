import {test,expect} from "@playwright/test";
import {evaluatedPlacementScore,meetsPlacementATSThreshold,hasAppliedPlacementEvidence} from "../src/placement-eligibility";

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


test("keywords, courses and project titles alone cannot qualify",()=>{
 for(const row of [
  {evidence_level:"declared",evidence_source:"skills",evidence_text:"Machine Learning TensorFlow PyTorch"},
  {evidence_level:"raw_only",evidence_source:"raw_text",evidence_text:"Built a model in TensorFlow"},
  {evidence_level:"certification",evidence_source:"entries",evidence_text:"Completed a TensorFlow course"},
  {evidence_level:"applied",evidence_source:"entries",evidence_text:"Machine Learning"},
 ]) expect(hasAppliedPlacementEvidence([{...row,priority:"mandatory",match_status:"FULL_MATCH"}])).toBe(false);
});

test("applied evidence must cover at least half the weighted requirements",()=>{
 const applied={priority:"mandatory",match_status:"FULL_MATCH",evidence_level:"applied",evidence_source:"entries",evidence_text:"Built Python services"};
 const declared={priority:"mandatory",match_status:"FULL_MATCH",evidence_level:"declared",evidence_source:"skills",evidence_text:"TensorFlow"};
 expect(hasAppliedPlacementEvidence([applied,declared])).toBe(true);
 expect(hasAppliedPlacementEvidence([applied,declared,declared,declared])).toBe(false);
 expect(hasAppliedPlacementEvidence([{...applied,priority:"preferred"},declared])).toBe(false);
 expect(hasAppliedPlacementEvidence(undefined)).toBe(false);
});
