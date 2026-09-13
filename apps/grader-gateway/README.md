# Grader Gateway

Trusted control plane. Он принимает только валидированные evaluation jobs и запускает их через sandbox provider abstraction.

Здесь **не должно быть** production DB credentials, direct domain repositories, user sessions или Docker socket в runtime-контейнере. Student execution считается hostile и живёт ещё за одной границей (gVisor/другая sandbox technology; microVM позже при необходимости).
