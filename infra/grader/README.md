# Grader trust boundary

Student code is hostile by definition.

Every evaluation profile must declare runtime image/version, test suite version, CPU, memory, pids, disk, stdout/stderr and wall-clock limits, filesystem policy and network policy.

Sandbox baseline: ephemeral, non-root, dropped capabilities, read-only base filesystem, temporary writable workspace, network OFF by default, no host mounts, no Docker socket, destroyed after execution. Start with OCI + gVisor-class isolation; consider microVM isolation when public multi-tenant risk/scale justifies it.
