"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { brand } from "@platform/brand";
import { Button, ButtonLink, Radio, Select, buttonClass } from "@platform/ui";
import { AppearanceControl } from "../../../components/appearance/appearance-control";
import { LearningNavigation } from "../../../components/learning/learning-navigation";
import styles from "./hero-lab.module.css";

export type HeroDirection = "editorial" | "path" | "lesson";
const directionNames = {
  editorial: "Редакционная учебная сцена",
  path: "Интерактивный путь обучения",
  lesson: "Живой продуктовый фрагмент"
} as const;

function LabHeader() {
  return <header className={styles.header}>
    <Link href="/" className={styles.brand} aria-label={`${brand.name} — на главную`}>
      <span className={styles.mark} aria-hidden="true">N</span>
      <span>{brand.name}<small>учебная среда</small></span>
    </Link>
    <LearningNavigation />
    <div className={styles.appearance}><AppearanceControl /></div>
  </header>;
}

function Actions({ secondary = "Как устроено обучение", target = "#example" }: {
  secondary?: string; target?: string;
}) {
  return <div className={styles.actions}>
    <ButtonLink href="/courses" size="lg">Выбрать курс <span aria-hidden="true">↗</span></ButtonLink>
    <a className={styles.secondary} href={target}>{secondary}<span aria-hidden="true">↓</span></a>
  </div>;
}

function Copy({ title, children }: { title: string; children: string }) {
  return <div className={styles.copy}>
    <p className={styles.eyebrow}>Образовательная платформа {brand.name}</p>
    <h1>{title.split("|")[0]}{title.includes("|") && <><br /><span>{title.split("|")[1]}</span></>}</h1>
    <p className={styles.description}>{children}</p>
  </div>;
}

function EditorialHero() {
  const [applied, setApplied] = useState(false);
  return <section className={`${styles.hero} ${styles.editorial}`} aria-label={directionNames.editorial}>
    <div className={styles.editorialIntro}>
      <Copy title="Знать — начало.|Уметь — результат.">
        Курсы, в которых вы разбираете тему, пробуете сами и проверяете понимание. Видео, конспекты, задания и квизы — в одной учебной среде.
      </Copy>
      <Actions secondary="Посмотреть пример" />
    </div>
    <div id="example" className={styles.spread}>
      <div className={styles.marginNote}>
        <span className={styles.eyebrow}>Изучить → применить</span>
        <p>Маленькое открытие.<br />Настоящее действие.</p>
        <small>Концептуальный пример <br />JavaScript · работа с текстом</small>
      </div>
      <article className={styles.article}>
        <p className={styles.articleLabel}>Мысль из конспекта</p>
        <h2>Лишние пробелы?<br /><em>Есть метод.</em></h2>
        <p>Метод <code>trim()</code> убирает пробелы по краям строки. Текст внутри остаётся прежним.</p>
        <p className={styles.annotation}>Прочитали правило. Проверьте его в действии ↘</p>
      </article>
      <div className={styles.manuscript}>
        <div className={styles.processorHeading}><span>TEXT / TRANSFORM</span><span>JS</span></div>
        <div className={styles.rawText}><small>Исходная строка</small><code>"<span>··</span>Привет, мир<span>··</span>"</code></div>
        <div className={styles.processBar}><code>.trim()</code><span aria-hidden="true">↓</span>
          <Button variant="secondary" onClick={() => setApplied(!applied)}>{applied ? "Вернуть пробелы" : "Применить метод"}</Button></div>
        <div className={styles.outputText} data-applied={applied} role="status"><small>{applied ? "Результат · пробелы убраны" : "Попробуйте: что изменится?"}</small>
          <code>{applied ? '"Привет, мир"' : '"  Привет, мир  "'}</code></div>
        <small className={styles.demoNote}>Демонстрация. Результат не сохраняется.</small>
      </div>
    </div>
    <p className={styles.endnote}>Понимание появляется, когда вы делаете сами.</p>
  </section>;
}

const stages = [
  { label: "Понять", kind: "Видео + конспект", title: "Понять, как это работает.", text: "В примере JavaScript разбираем trim(): метод удаляет пробелы по краям строки, сохраняя текст внутри.", detail: '"  Привет, мир  "' },
  { label: "Попробовать", kind: "Практическое задание", title: "Превратить мысль в действие.", text: "Примените правило к исходному тексту. Посмотрите, что изменилось, и свяжите результат с объяснением.", detail: 'text.trim() → "Привет, мир"' },
  { label: "Проверить", kind: "Квиз + обратная связь", title: "Разобраться в своей ошибке.", text: "Удалится ли пробел между словами? Нет. Квиз помогает проверить именно понимание, а не факт просмотра урока.", detail: '"Привет, мир" · пробел внутри остался' },
  { label: "Двигаться дальше", kind: "Прогресс обучения", title: "Видеть следующий шаг.", text: "В настоящем записанном курсе прогресс опирается на результаты обязательных заданий. Здесь показан только принцип, без выдуманных процентов.", detail: "Разобрались → Проверили → Следующая тема" }
] as const;

function PathHero() {
  const [stage, setStage] = useState(0);
  const selected = stages[stage]!;
  return <section className={`${styles.hero} ${styles.path}`} aria-label={directionNames.path}>
    <div className={styles.pathIntro}>
      <Copy title="От первого вопроса|до своего «получилось»!">
        Выберите курс. Пройдите от видео и конспекта к заданию, проверке и своему прогрессу — в удобном для вас темпе.
      </Copy>
      <Actions secondary="Пройти путь в примере" />
    </div>
    <div id="example" className={styles.journey}>
      <p className={styles.articleLabel}>Как устроено обучение / концептуальный пример</p>
      <div className={styles.route} aria-label="Этапы обучения">
        <svg className={styles.routeLine} viewBox="0 0 1000 145" preserveAspectRatio="none" aria-hidden="true">
          <path d="M83 70 C175 70 250 38 361 38 S500 125 639 125 S800 70 917 70" />
        </svg>
        {stages.map((item, index) => <button key={item.label} type="button"
          className={styles.stop} aria-pressed={stage === index}
          onClick={() => setStage(index)} aria-controls="journey-detail">
          <span className={styles.node} aria-hidden="true">{stage === index ? "●" : "·"}</span>
          <strong>{item.label}</strong><small>{item.kind}</small>
        </button>)}
      </div>
      <div id="journey-detail" className={styles.journeyDetail}>
        <div key={stage} className={styles.stageCopy}>
          <h2>{selected.title}</h2><p>{selected.text}</p>
        </div>
        <div className={styles.routeArtifact}>
          <span className={styles.eyebrow}>В примере</span>
          <p key={stage} role="status">{selected.detail}</p>
          <Button variant="secondary" onClick={() => setStage(stage === 3 ? 0 : stage + 1)}>
            {stage === 3 ? "Вернуться к началу" : "Следующий этап"}<span aria-hidden="true">→</span>
          </Button>
        </div>
      </div>
    </div>
    <p className={styles.endnote}>Один связный путь вместо разрозненных материалов.</p>
  </section>;
}

function LessonHero() {
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const id = useId();
  const correct = answer === "edges";
  return <section className={`${styles.hero} ${styles.lesson}`} aria-label={directionNames.lesson}>
    <div className={styles.lessonIntro}>
      <Copy title="Не просто смотрите.|Пробуйте прямо здесь.">
        Внутри каждого курса — видео, структурированные конспекты, задания и квизы. Ваш прогресс показывает результаты практики.
      </Copy>
      <Actions secondary="Попробовать фрагмент" />
    </div>
    <article id="example" className={styles.lessonSheet}>
      <header className={styles.lessonHeading}>
        <p className={styles.articleLabel}>Фрагмент урока / концептуальная демонстрация</p>
        <p className={styles.lessonStatus}>{checked && correct ? "Проверка в примере пройдена" : "Материал → Практика → Проверка"}</p>
      </header>
      <div className={styles.lessonBody}>
        <div className={styles.lessonMaterial}>
          <span className={styles.eyebrow}>Конспект</span>
          <h2>Уберите лишнее.<br /><em>Сохраните смысл.</em></h2>
          <p>Метод <code>trim()</code> удаляет пробелы по краям строки. Пробелы между словами остаются на месте.</p>
          <div className={styles.renameExample}>
            <span className={styles.codeCaption}>JavaScript / пример</span><code><span className={styles.codeKeyword}>const</span> text = <span className={styles.codeString}>"  Привет, мир  "</span>;<br />text.<span className={styles.codeMethod}>trim</span>();</code>
            <strong>→ "Привет, мир"</strong>
          </div>
        </div>
        <form className={styles.lessonPractice} onSubmit={event => { event.preventDefault(); setChecked(true); }}>
          <span className={styles.eyebrow}>Проверка понимания</span>
          <fieldset disabled={checked}>
            <legend>Какие пробелы удалит trim()?</legend>
            <Radio name={id} value="all" label="Все, включая пробел между словами" checked={answer === "all"} onChange={() => setAnswer("all")} />
            <Radio name={id} value="edges" label="Только пробелы по краям строки" checked={answer === "edges"} onChange={() => setAnswer("edges")} />
          </fieldset>
          {checked ? <Button variant="secondary" onClick={() => { setChecked(false); setAnswer(""); }}>Попробовать снова</Button>
            : <Button type="submit" disabled={!answer}>Проверить ответ</Button>}
          <div className={styles.feedback} data-outcome={checked ? correct ? "success" : "retry" : "idle"} role="status">
            {checked ? correct ? "Верно! Пробел между словами сохранился. В курсе результат проверки участвует в прогрессе." : "trim() убирает пробелы только по краям. Между словами пробел остаётся. Попробуйте ещё раз."
              : "Выберите ответ. Здесь можно спокойно ошибаться."}
          </div>
          <small>Учебный пример. Ответ не отправляется и не сохраняется.</small>
        </form>
      </div>
    </article>
    <p className={styles.endnote}>Материал рядом с практикой. Обратная связь рядом с ответом.</p>
  </section>;
}

export function HeroLab({ direction }: { direction: HeroDirection }) {
  return <div className={styles.lab}>
    <a href="#hero-main" className={styles.skip}>Перейти к содержимому</a>
    <LabHeader />
    <p className={styles.conceptLabel}>Концепция · {directionNames[direction]} · Главная страница не изменена</p>
    <main id="hero-main" tabIndex={-1}>
      {direction === "editorial" ? <EditorialHero /> : direction === "path" ? <PathHero /> : <LessonHero />}
    </main>
    <footer className={styles.footer}>
      <span>{brand.name} · Учитесь в своём темпе</span>
      <Link href="/blog">Читать блог</Link>
      <Link href="/ui/hero-lab" target="_top">Сравнить концепции</Link>
    </footer>
  </div>;
}

export function HeroReview() {
  const [direction, setDirection] = useState<HeroDirection | "current">("editorial");
  const [width, setWidth] = useState("responsive");
  const [scale, setScale] = useState("1");
  const [reload, setReload] = useState(0);
  const [frameHeight, setFrameHeight] = useState(1500);
  const frameRef = useRef<HTMLIFrameElement>(null);
  function fitFrame(frame: HTMLIFrameElement) {
    const document = frame.contentDocument;
    const height = Math.max(0, ...Array.from(document?.body.children ?? [])
      .map(node => node.getBoundingClientRect().height));
    if (height) setFrameHeight(Math.max(900, Math.min(5000, height + 40)));
  }
  useEffect(() => {
    if (frameRef.current) fitFrame(frameRef.current);
  }, [width]);
  const source = direction === "current" ? "/" : `/ui/hero-lab?view=${direction}`;
  return <main className={styles.review}>
    <header className={styles.reviewIntro}>
      <div><Link href="/" className={styles.reviewBrand}>{brand.name} / Hero Lab</Link>
        <h1>Больше характера. Больше практики.</h1>
        <p>Три переработанные концепции с опорой на String Lab. Это примеры: ответы и прогресс не сохраняются. Главная страница сохранена.</p></div>
      <AppearanceControl />
    </header>
    <div className={styles.reviewControls}>
      <label>Композиция<Select aria-label="Композиция" value={direction} onChange={e => setDirection(e.target.value as HeroDirection | "current")}>
        {Object.entries(directionNames).map(([value, name]) => <option value={value} key={value}>{name}</option>)}
        <option value="current">Текущая главная — для аудита</option>
      </Select></label>
      <label>Масштаб просмотра<Select aria-label="Масштаб просмотра" value={scale} onChange={e => setScale(e.target.value)}>
        <option value="1">100%</option><option value="0.75">75%</option><option value="0.5">50%</option>
      </Select></label>
      <label>Ширина примера<Select aria-label="Ширина примера" value={width} onChange={e => setWidth(e.target.value)}>
        <option value="responsive">По ширине окна</option>
        {[320, 390, 768, 1440].map(value => <option value={value} key={value}>{value} px</option>)}
      </Select></label>
      <Button variant="secondary" onClick={() => setReload(reload + 1)}>Перезапустить пример</Button>
      <a href={source} className={buttonClass({ variant: "ghost" })}>Открыть отдельно ↗</a>
    </div>
    <p className={styles.reviewHint}>При фиксированной ширине ниже — настоящий viewport iframe. Широкий пример прокручивается горизонтально только в этой лаборатории.</p>
    <div className={styles.frameRail} style={{ height: `${frameHeight * Number(scale)}px` }}>
      <div className={styles.frameStage} style={{ width: width === "responsive" ? "100%" : `${Number(width) * Number(scale)}px`, height: `${frameHeight * Number(scale)}px` }}>
      <iframe ref={frameRef} key={`${direction}-${reload}`} src={source} title={direction === "current" ? "Текущая главная" : directionNames[direction]}
        onLoad={event => {
          const frame = event.currentTarget;
          fitFrame(frame);
          void frame.contentDocument?.fonts.ready.then(() => fitFrame(frame));
        }}
        className={styles.frame} style={{ width: width === "responsive" ? "100%" : `${width}px`, height: `${frameHeight}px`, transform: `scale(${scale})` }} />
      </div>
    </div>
  </main>;
}
