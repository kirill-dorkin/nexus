FROM scratch
COPY --chown=65532:65532 dist/grader-runner /grader-runner
COPY THIRD_PARTY_NOTICES.md /licenses/THIRD_PARTY_NOTICES.md
USER 65532:65532
ENTRYPOINT ["/grader-runner"]
