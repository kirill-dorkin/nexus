"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { Theme, Flex, Heading, Text } from "@radix-ui/themes";
import { ArrowRight, ArrowDown, Check, Code, CursorClick } from "@phosphor-icons/react/dist/ssr";
import { brand } from "@platform/brand";
import { Button, ButtonLink, Input, Radio } from "@platform/ui";
import { LearningNavigation } from "../../../components/learning/learning-navigation";
import { AppearanceControl } from "../../../components/appearance/appearance-control";
import "@radix-ui/themes/styles.css";
import styles from "./home-lab.module.css";

const steps = ["Разобраться", "Попробовать", "Проверить"];

function LearningScene() {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("Мой первый сайт");
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const id = useId();
  const correct = answer === "h1";
  return <div className={styles.workbench} id="learning-example">
    <div className={styles.workbenchBar}>
      <div className={styles.stepControls} aria-label="Этапы учебного примера">
        {steps.map((label, index) => <button type="button" key={label} aria-pressed={step === index} aria-controls="learning-demo" onClick={() => setStep(index)}>{label}{index < 2 && <ArrowRight size={14} aria-hidden="true" />}</button>)}
      </div>
      <span className={styles.exampleLabel}>Учебный пример · HTML</span>
    </div>
    <div className={styles.demo} id="learning-demo">
      <div className={styles.source}>
        <p className={styles.sourceLabel}><Code size={17} aria-hidden="true" /> Структура страницы</p>
        <pre><code><span className={styles.syntaxTag}>{"<h1>"}</span>{title}<span className={styles.syntaxTag}>{"</h1>"}</span>{"\n"}<span className={styles.syntaxTag}>{"<p>"}</span>{"Я учусь создавать сайты."}<span className={styles.syntaxTag}>{"</p>"}</span></code></pre>
        <div className={styles.lessonControl}>
          {step === 0 ? <><h2>Одна строка — главный заголовок.</h2><p>Тег <code>h1</code> обозначает главную тему страницы. Посмотрите, как этот код выглядит на странице.</p><Button variant="secondary" onClick={() => setStep(1)}>Изменить заголовок <CursorClick size={18} aria-hidden="true" /></Button></>
            : step === 1 ? <><label htmlFor={`${id}-title`}>Ваш заголовок</label><Input id={`${id}-title`} value={title} maxLength={90} onChange={event => setTitle(event.target.value)} aria-describedby={`${id}-hint`} /><p id={`${id}-hint`}>Измените текст. Результат обновится сразу.</p><Button variant="secondary" onClick={() => setStep(2)}>Проверить понимание <ArrowRight size={18} aria-hidden="true" /></Button></>
            : <form onSubmit={event => { event.preventDefault(); setChecked(true); }}><fieldset disabled={checked}><legend>Какой тег задаёт главный заголовок?</legend><Radio name={`${id}-answer`} label="h1" value="h1" checked={answer === "h1"} onChange={() => setAnswer("h1")} /><Radio name={`${id}-answer`} label="p" value="p" checked={answer === "p"} onChange={() => setAnswer("p")} /></fieldset>
              <Button variant="secondary" type={checked ? "button" : "submit"} disabled={!checked && !answer} onClick={checked ? () => { setChecked(false); setAnswer(""); } : undefined}>{checked ? "Попробовать снова" : "Проверить ответ"}</Button>
              <p className={styles.answerFeedback} role="status">{checked ? correct ? "Верно. h1 — главный заголовок; p — абзац." : "p обозначает абзац. Главный заголовок задаёт h1. Попробуйте ещё раз." : "Можно ошибиться — объяснение поможет разобраться."}</p></form>}
        </div>
      </div>
      <div className={styles.result}>
        <p className={styles.resultLabel}>Так выглядит ваша страница</p>
        <div className={styles.renderedDocument} key={title}>
          <h2>{title || "Заголовок пока пустой"}</h2><p>Я учусь создавать сайты.</p>
          <div className={styles.documentRule} aria-hidden="true" />
          <p className={styles.resultAnnotation}>{checked && correct ? <><Check size={20} aria-hidden="true" /> Правило проверено в примере</> : <>Прочитайте код. Измените текст. Увидьте связь.</>}</p>
        </div>
        <p className={styles.demoDisclaimer}>Концептуальная демонстрация. Ответы и прогресс не сохраняются.</p>
      </div>
    </div>
  </div>;
}

export function HomeLab({ children }: { children: ReactNode }) {
  return <Theme appearance="inherit" accentColor="violet" radius="large" scaling="100%" panelBackground="solid" hasBackground={false} className={styles.theme}>
    <div className={styles.page} data-home-preview>
      <a className={styles.skip} href="#home-content">Перейти к содержимому</a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label={`${brand.name} — на главную`}><span className={styles.brandMark} aria-hidden="true">N</span><span>{brand.name}<small>учиться · понимать · делать</small></span></Link>
        <LearningNavigation />
      </header>
      <div className={styles.previewNotice}><span>Новая главная · дизайн Preview</span><Link href="/">Текущая версия <ArrowRight size={14} aria-hidden="true" /></Link></div>
      <main id="home-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.heroIntro}>
            <div><Heading as="h1" id="home-title" className={styles.title}>Понимать глубже.<br /><span>Делать увереннее.</span></Heading>
              <Text as="p" className={styles.lead}>{brand.name} — образовательная платформа, где видео и конспекты становятся практикой. Задания, квизы и прогресс помогают двигаться дальше.</Text></div>
            <Flex direction="column" align="start" gap="3" className={styles.heroActions}><ButtonLink href="/courses" size="lg">Выбрать курс <ArrowRight size={20} aria-hidden="true" /></ButtonLink><a href="#learning-example" className={styles.textLink}>Попробовать пример <ArrowDown size={18} aria-hidden="true" /></a></Flex>
          </div>
          <LearningScene />
          <p className={styles.heroFootnote}>Видео и конспект дают основу. Практика и обратная связь помогают её освоить.</p>
        </section>
        {children}
      </main>
      <footer className={styles.footer}><div className={styles.footerBrand}><strong>{brand.name}</strong><p>Понимание через практику.</p></div><nav aria-label="Меню внизу страницы"><Link href="/courses">Курсы</Link><Link href="/blog">Блог</Link><Link href="/studio">Для авторов</Link></nav><p className={styles.footerNote}>Выберите курс.<br />Двигайтесь в своём темпе.</p></footer>
      <aside className={styles.appearanceDock} aria-label="Оформление интерфейса"><AppearanceControl /></aside>
    </div>
  </Theme>;
}
