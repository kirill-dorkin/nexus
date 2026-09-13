import pino from "pino";

const log = pino({ name: "worker" });

log.info("worker bootstrap ready; register queue processors as vertical slices are implemented");
