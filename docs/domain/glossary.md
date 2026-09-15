# Domain Glossary

Это нормативный словарь. Если код и glossary расходятся, сначала принимается архитектурное решение, затем меняется терминология.

| Термин | Определение |
|---|---|
| `Program` | Стабильная identity образовательной программы. |
| `ProgramVersion` | Опубликованная immutable версия программы, пинящая точные версии курсов. |
| `Course` | Стабильная identity курса. |
| `CourseVersion` | Конкретная immutable редакция курса. Не знает о группах/расписании/преподавателе. |
| `LessonVersion` | Конкретное содержимое урока, собранное из typed blocks. |
| `Skill` | Наблюдаемая способность ученика с stable ID. |
| `Concept` | Термин/идея предметной области; отвечает «что это?». |
| `Misconception` | Типичная устойчивая неправильная mental model. |
| `ActivityVersion` | Конкретная версия учебной активности и её validators/policies. |
| `Validator` | Версионированное определение проверки, выбранное immutable binding внутри `ActivityVersion`; exact key/version задаёт стабильную семантику и trust/recording policy, но не обязан сам исполнять student code внутри API. |
| `Attempt` | Одна историческая попытка пройти конкретную `ActivityVersion`; начинается до отправки ответа, а retry создаёт новый Attempt. |
| `Submission` | Immutable artifact/answer, который ученик фиксирует в рамках одного Attempt. Не является самим Attempt. |
| `ValidationResult` | Immutable raw результат exact Validator version для exact `Submission`/`ActivityVersion`, включая attribution, status и idempotency. Не является `LearningEvidence`; system/infrastructure error не является learner failure. |
| `LearningEvent` | Canonical append-only нормализованное значимое учебное событие learner lifecycle. Хранится отдельно от integration outbox, не содержит raw learner/validator payload и не является telemetry. |
| `LearningEvidence` | Append-only нормализованное доказательство по конкретному skill и Submission. Имеет явное provenance (`manual` или exact `ValidationResult`); raw validator payload и infrastructure failure не являются Evidence. |
| `MasteryModelVersion` | Версия алгоритма/параметров расчёта mastery. |
| `StudentSkillState` | Derived projection текущего mastery/confidence/review state. |
| `Enrollment` | Факт участия пользователя в обучении; всегда относится к одному `LearningOffering`. Не покупка и не платеж. |
| `LearningOffering` | Обязательный universal delivery context. Self-paced — offering с соответствующей effective configuration, а не обход delivery-слоя. |
| `Assignment` | Durable delivery-инструкция: exact `ActivityVersion` назначена аудитории внутри одного `LearningOffering`. Не является Attempt, Submission, Evidence или способом выдать доступ. |
| `CourseRun` | Конкретное проведение `CourseVersion` внутри offering, когда нужен отдельный execution lifecycle. |
| `GroupSet` | Измерение группирования (intake/current class/remediation/lab). |
| `Group` | Организационная группа внутри GroupSet. |
| `Team` | Проектная команда с собственным lifecycle; не разновидность Group. |
| `Capability` | Постоянная продуктовая возможность. |
| `Policy` | Правила поведения capability в конкретном scope. |
| `FeatureFlag` | Временный технический rollout реализации. |
| `Entitlement` | Право доступа. Не равно Purchase и не равно Enrollment. |
| `Recommendation` | Объяснимый вычисленный следующий учебный шаг. |
| `ProgressionGate` | Условие допуска к следующему этапу по skill/assessment/project evidence. |
