import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';

// Toggle this to enable/disable Ramadan landing page redirect
export const RAMADAN_MODE = true;

export const ramadanRedirectGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  console.log('🌙 Ramadan guard triggered', { RAMADAN_MODE, queryParams: route.queryParams });

  if (!RAMADAN_MODE) {
    return true;
  }

  const router = inject(Router);
  const lang = route.paramMap.get('lang') || 'ar';

  if (route.queryParams['from'] === 'ramadan') {
    console.log('🌙 Bypassing redirect (from=ramadan)');
    return true;
  }

  console.log('🌙 Redirecting to ramadan page');
  router.navigate(['/', lang, 'ramadan']);
  return false;
};
