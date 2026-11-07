// Chapter 7: devices and sensors — camera and microphone, geolocation, clipboard, share and vibration.
import { idea, wa, tip, makeLesson } from "./wkit.mjs";

export default function devices(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "camera-mic", title: "Камера и микрофон", summary: "getUserMedia, разрешения, показ в video, запись MediaRecorder, остановка потоков.",
    skill: ["wa-camera", "Камера и микрофон", "Получать доступ к камере и микрофону."],
    now: "Знаем графику и подключаем камеру и микрофон.",
    body: [
      wa("getUserMedia", "Поток с устройства", "navigator.mediaDevices.getUserMedia просит разрешение и возвращает поток, который показывают в video.", "Видеозвонки, сканирование QR, запись ответа голосом.", "const stream = await navigator.mediaDevices.getUserMedia({ video: true });\nvideo.srcObject = stream;\nawait video.play();"),
      idea("Остановить", "Выключить индикатор", "Когда камера не нужна, вызывают track.stop() для каждой дорожки — иначе индикатор камеры горит.", "Пользователь доверяет сайту, который выключает камеру."),
      wa("MediaRecorder", "Записать", "Записывает поток в файл: аудиоответ, видео с экрана.", "Голосовой ответ на задание.", "const recorder = new MediaRecorder(stream);\nconst chunks = [];\nrecorder.ondataavailable = (e) => chunks.push(e.data);\nrecorder.onstop = () => upload(new Blob(chunks, { type: recorder.mimeType }));"),
      idea("Отказ", "Будь готов", "Пользователь может отказать или устройства может не быть — покажи понятное объяснение и альтернативу.", "Ошибка NotAllowedError — не повод для белого экрана."),
      tip("Камера — getUserMedia после действия пользователя. Не нужна — stop() у дорожек.")
    ],
    quizzes: [
      single("cm-stop", "Выключить", "Как выключить камеру, когда она больше не нужна?",
        [["stop", "Вызвать stop() у всех дорожек потока"], ["hide", "Скрыть video"], ["null", "Присвоить null переменной"], ["none", "Никак"]], "stop",
        "Иначе индикатор горит."),
      single("cm-deny", "Отказ", "Что делать, если пользователь запретил доступ к камере?",
        [["explain", "Показать объяснение и альтернативный путь"], ["loop", "Спрашивать снова в цикле"], ["crash", "Показать белый экран"], ["none", "Ничего"]], "explain",
        "NotAllowedError."),
      single("cm-record", "Запись", "Чем записать звук с микрофона в файл?",
        [["recorder", "MediaRecorder"], ["canvas", "Canvas"], ["fetch", "fetch"], ["storage", "localStorage"]], "recorder",
        "Потом Blob можно отправить.")
    ]
  });

  L({
    slug: "geolocation", title: "Геолокация и датчики", summary: "getCurrentPosition и watchPosition, точность, датчики ориентации, приватность.",
    skill: ["wa-geo", "Геолокация", "Получать местоположение и данные датчиков бережно."],
    now: "Подключили камеру и узнаём, где находится пользователь.",
    body: [
      wa("Геолокация", "Где я", "getCurrentPosition — один раз, watchPosition — следить за перемещением. Работает с разрешения пользователя.", "Ближайший пункт выдачи, карта пробежки.", "navigator.geolocation.getCurrentPosition(\n  ({ coords }) => showNearest(coords.latitude, coords.longitude),\n  () => askForCity(),\n  { enableHighAccuracy: false, timeout: 10000 }\n);"),
      idea("Точность и батарея", "Не дороже нужного", "Высокая точность включает GPS и тратит батарею. Для города хватит обычной точности.", "Не сажай телефон без причины."),
      idea("Датчики", "Ориентация и движение", "Событие deviceorientation даёт наклон телефона, devicemotion — ускорение. На iOS нужно разрешение.", "Игры с наклоном, панорамы."),
      idea("Приватность", "Только для дела", "Запрашивай местоположение, когда оно нужно для действия, объясняй зачем и не храни дольше нужного.", "Местоположение — чувствительные данные."),
      tip("Геолокация — по делу, с обычной точностью, с запасным вводом города.")
    ],
    quizzes: [
      single("gl-watch", "Следить", "Как следить за изменением местоположения во время пробежки?",
        [["watch", "watchPosition"], ["get", "getCurrentPosition в бесконечном цикле"], ["fetch", "fetch"], ["none", "Никак"]], "watch",
        "Не забудь clearWatch."),
      single("gl-accuracy", "Точность", "Почему не стоит всегда включать enableHighAccuracy?",
        [["battery", "GPS тратит батарею, а высокая точность часто не нужна"], ["wrong", "Она даёт неверные данные"], ["slow", "Она запрещена"], ["none", "Стоит всегда"]], "battery",
        "Точность — по задаче."),
      single("gl-fallback", "Отказ", "Что предложить, если пользователь не дал доступ к геолокации?",
        [["manual", "Ввести город или адрес вручную"], ["block", "Закрыть сайт"], ["again", "Спрашивать каждую секунду"], ["none", "Ничего"]], "manual",
        "Запасной путь.")
    ]
  });

  L({
    slug: "clipboard-share", title: "Буфер обмена и «Поделиться»", summary: "navigator.clipboard, Web Share API, вибрация и Wake Lock, жесты пользователя.",
    skill: ["wa-share", "Буфер и «Поделиться»", "Копировать, делиться и управлять экраном устройства."],
    now: "Знаем датчики и добавляем привычные действия телефона.",
    body: [
      wa("Clipboard", "Копировать", "navigator.clipboard.writeText копирует текст; чтение буфера требует разрешения.", "Кнопка «Скопировать код» в уроке.", "await navigator.clipboard.writeText(code);\nbutton.textContent = \"Скопировано\";"),
      wa("Web Share", "Системное меню", "navigator.share открывает меню «Поделиться» телефона с мессенджерами и почтой.", "Делиться ссылкой на урок привычным способом.", "await navigator.share({ title: \"Урок Python\", url: location.href });"),
      idea("Жест пользователя", "Только по нажатию", "Буфер, «Поделиться», полноэкранный режим работают только в ответ на действие пользователя.", "Сайт не может сам что-то копировать без спроса."),
      idea("Wake Lock и вибрация", "Экран и отклик", "navigator.wakeLock не даёт экрану погаснуть, navigator.vibrate даёт короткий отклик на телефоне.", "Рецепт на кухне не гаснет, правильный ответ ощущается."),
      tip("Копирование и «Поделиться» — по нажатию. Проверяй поддержку и давай запасной путь.")
    ],
    quizzes: [
      single("cs-copy", "Копировать", "Как скопировать текст в буфер обмена?",
        [["clip", "`navigator.clipboard.writeText(text)`"], ["exec", "Только document.execCommand"], ["storage", "localStorage.setItem"], ["none", "Нельзя"]], "clip",
        "По действию пользователя."),
      single("cs-share", "Поделиться", "Что открывает navigator.share?",
        [["menu", "Системное меню «Поделиться» устройства"], ["email", "Только почту"], ["new", "Новую вкладку"], ["print", "Печать"]], "menu",
        "Проверь поддержку."),
      single("cs-gesture", "Жест", "Почему navigator.share нельзя вызвать при загрузке страницы?",
        [["gesture", "Нужен жест пользователя — нажатие или клик"], ["slow", "Страница медленная"], ["https", "Нужен HTTP"], ["none", "Можно"]], "gesture",
        "Защита от навязчивых сайтов.")
    ]
  });
}
