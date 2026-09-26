'use strict';
function meetsTargets(result){
 return result.studentsRun===result.studentsRequested && result.studentsFailed===0 && result.totalRequests>0 &&
 result.overallErrorRate<0.005 && ['start','session','submit'].every(key=>result.phases[key].count>0&&result.phases[key].p95<500);
}
module.exports={meetsTargets};
