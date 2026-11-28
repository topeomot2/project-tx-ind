import fc from "fast-check";

// fast-check 4 keeps a property's error as `cause`, out of the failure
// message. Put it in the message, so a failing property shows why (and the
// RED check can see NotImplemented).
fc.configureGlobal({ includeErrorInReport: true });
