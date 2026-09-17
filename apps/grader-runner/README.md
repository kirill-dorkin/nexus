# Trusted grader runner

Security-critical executable that runs learner code only inside the dedicated grader sandbox. It is not a Web/API/Worker/Gateway process and has no production credentials or database access.

The first profile mode is `js-sum-v1`: exactly `/workspace/source/main.js` is evaluated by a constrained embedded ECMAScript runtime and must define `solve(input)`. Hidden challenge cases are compiled into the trusted runner image. The runtime does not install Node.js host APIs such as `process`, `require`, filesystem, network, workers, or child-process spawning.

Learner `console.log` and `console.error` are captured into bounded in-memory buffers. They are never written directly to container stdout/stderr. Successful runner completion writes exactly one bounded grader protocol-v1 JSON document to stdout; trusted-runner configuration or internal failures exit non-zero so Gateway records infrastructure `system_error` rather than learner failure.

Production builds use Go 1.26.8, `CGO_ENABLED=0`, `-buildvcs=false`, `-trimpath`, an empty build id, a `scratch` final image, and `SOURCE_DATE_EPOCH=0`. VCS stamping is disabled so a repository commit that binds the checked-in profile digest cannot itself change otherwise identical runner bytes. The Kubernetes/gVisor provider remains disabled by default until the exact image digest is published and the real-cluster verification gate is complete.
