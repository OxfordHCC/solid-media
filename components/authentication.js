import {useLocation} from "../_snowpack/pkg/wouter-preact.js";
import {Session} from "../_snowpack/pkg/@inrupt/solid-client-authn-browser.js";
import {HOMEPAGE} from "../env.js";
export const session = new Session();
export function useAuthentication(redirect = true) {
  if (session.info.isLoggedIn)
    return session;
  else {
    let [location, setLocation] = useLocation();
    if (redirect)
      setLocation(`${HOMEPAGE}/login?redirect=${encodeURIComponent(location)}`);
    return null;
  }
}
