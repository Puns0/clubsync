import { AppError } from '../core/errors.js';

export function checkEligibility(
  userYear: number,
  userDepartment: string,
  eligibleYears: number[],
  eligibleDepartments: string[]
): { eligible: boolean; reason?: string } {
  if (eligibleYears.length > 0 && !eligibleYears.includes(userYear)) {
    return { eligible: false, reason: `Year ${userYear} is not eligible for this event` };
  }
  
  if (eligibleDepartments.length > 0 && !eligibleDepartments.includes(userDepartment)) {
    return { eligible: false, reason: `Department ${userDepartment} is not eligible for this event` };
  }
  
  return { eligible: true };
}

export function assertEligibility(
  userYear: number,
  userDepartment: string,
  eligibleYears: number[],
  eligibleDepartments: string[]
) {
  const result = checkEligibility(userYear, userDepartment, eligibleYears, eligibleDepartments);
  if (!result.eligible) {
    throw new AppError('NOT_ELIGIBLE', result.reason!);
  }
}
