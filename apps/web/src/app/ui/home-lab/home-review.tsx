"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Select } from "@platform/ui";
import { AppearanceControl } from "../../../components/appearance/appearance-control";
import styles from "./home-lab.module.css";

export function HomeReview() {
  const [width, setWidth] = useState("1440");
  const [scale, setScale] = useState("0.75");
  const [height, setHeight] = useState(2800);
  const frame = useRef<HTMLIFrameElement>(null);
  const observer = useRef<ResizeObserver | null>(null);
  function fit() {
    const page = frame.current?.contentDocument?.querySelector<HTMLElement>("[data-home-preview]");
    if (page) setHeight(Math.ceil(page.getBoundingClientRect().height + 80));
  }
  useEffect(() => { fit(); }, [width]);
  useEffect(() => () => observer.current?.disconnect(), []);
  return <main className={styles.review}>
    <header><div><Link href="/ui/home-lab">Новая главная</Link><h1>Проверка композиции</h1><p>Настоящие ширины iframe. Курсы загружаются из существующего каталога.</p></div><AppearanceControl /></header>
    <div className={styles.reviewControls}>
      <label>Ширина<Select aria-label="Ширина" value={width} onChange={event => setWidth(event.target.value)}>{[320,390,768,1440].map(value=><option key={value} value={value}>{value} px</option>)}</Select></label>
      <label>Масштаб<Select aria-label="Масштаб" value={scale} onChange={event => setScale(event.target.value)}><option value="1">100%</option><option value="0.75">75%</option><option value="0.5">50%</option></Select></label>
      <Link href="/ui/home-lab">Открыть отдельно</Link>
    </div>
    <div className={styles.frameRail} style={{height:height*Number(scale)}}><div style={{width:Number(width)*Number(scale),height:height*Number(scale),overflow:"hidden"}}>
      <iframe ref={frame} src="/ui/home-lab" title="Новая главная" style={{width:Number(width),height,transform:`scale(${scale})`}} onLoad={() => {
        observer.current?.disconnect(); fit();
        const page = frame.current?.contentDocument?.querySelector("[data-home-preview]");
        if (page) { observer.current = new ResizeObserver(fit); observer.current.observe(page); }
        void frame.current?.contentDocument?.fonts.ready.then(fit);
      }} />
    </div></div>
  </main>;
}
