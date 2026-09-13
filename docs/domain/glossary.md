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
| `Attempt` | Одна историческая попытка пройти конкретную `ActivityVersion`; retry создаёт новый Attempt. |
| `Submission` | Immutable artifact/answer, отправленный в рамках Attempt. |
| `LearningEvent` | Append-only значимое учебное событие. Не является telemetry. |
| `LearningEvidence` | Нормализованное доказательство по конкретному skill и source. |
| `MasteryModelVersion` | Версия алгоритма/параметров расчёта mastery. |
| `StudentSkillState` | Derived projection текущего mastery/confidence/review state. |
| `Enrollment` | Факт участия пользователя в обучении; всегда относится к одному `LearningOffering`. Не покупка и не платеж. |
| `LearningOffering` | Обязательный universal delivery context. Self-paced — offering с соответствующей effective configuration, а не обход delivery-слоя. |
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
