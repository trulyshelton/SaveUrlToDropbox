import { AuthProviderProps } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";

export const oidcConfig: AuthProviderProps = {
    authority: "https://www.dropbox.com/",
    client_id: "r6vsy2r0ukqeq0i",
    redirect_uri: "http://localhost:5173",
    scope: "openid email files.content.write",
    automaticSilentRenew: true,
    onSigninCallback: () => {
        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        )
    },
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    // ...
};