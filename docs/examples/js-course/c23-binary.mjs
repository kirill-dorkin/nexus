// Chapter 23: Binary data — ArrayBuffer, typed arrays, DataView, SharedArrayBuffer and Atomics.
import { scene, rule, meth, obj, kw, idea, run, has, task, makeLesson, on } from "./kit.mjs";

const AB = (...m) => on("ArrayBuffer.prototype", ...m);
const TA = (...m) => on("TypedArray.prototype", ...m);
const DV = (...m) => on("DataView.prototype", ...m);
const AT = (...m) => on("Atomics", ...m);
const shared = 'if (typeof SharedArrayBuffer === "undefined") {\n  console.log("SharedArrayBuffer доступен только на страницах с изоляцией (COOP/COEP)");\n} else {\n';

export default function binary(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "array-buffer", title: "ArrayBuffer: сырые байты", summary: "ArrayBuffer, byteLength, slice, ArrayBuffer.isView, изменяемые буферы resizable, maxByteLength, resize и передача transfer, transferToFixedLength, detached.",
    skill: ["js-array-buffer", "ArrayBuffer", "Хранить двоичные данные и управлять буферами."],
    now: "Работаем с сырыми двоичными данными: ArrayBuffer.",
    body: [
      scene("Байты",
        ["you", "Датчик присылает какие-то байты. Это вообще можно прочитать в JavaScript?"],
        ["bro", "Можно. `ArrayBuffer` — кусок памяти, а читать его будем через типизированные массивы и DataView."]),
      obj("ArrayBuffer · byteLength · slice()", "Буфер памяти", "`new ArrayBuffer(16)` — 16 байт, заполненных нулями. Напрямую читать нельзя — только через «представления». `byteLength` — размер, `slice(a, b)` — копия куска.", "Файлы, сеть, аудио, изображения.", "const buf = new ArrayBuffer(8);\nconsole.log(buf.byteLength, buf.slice(2, 6).byteLength);", { covers: ["ArrayBuffer", ...AB("byteLength", "slice")] }),
      meth("ArrayBuffer.isView()", "Представление ли это", "true для типизированных массивов и DataView.", "Принимать и буфер, и представление.", "console.log(ArrayBuffer.isView(new Uint8Array(2)), ArrayBuffer.isView(new ArrayBuffer(2)));", { covers: on("ArrayBuffer", "isView") }),
      meth("resizable · maxByteLength · resize()", "Растущий буфер", "`new ArrayBuffer(4, { maxByteLength: 16 })` — буфер, который можно увеличить `resize(n)` до максимума; `resizable` — можно ли.", "Данные, размер которых растёт.", "const buf = new ArrayBuffer(4, { maxByteLength: 16 });\nbuf.resize(12);\nconsole.log(buf.resizable, buf.byteLength, buf.maxByteLength);", { covers: AB("resizable", "maxByteLength", "resize") }),
      meth("transfer() · transferToFixedLength() · detached", "Передать владение", "`transfer(n)` — новый буфер с теми же данными, а старый «отсоединяется» (`detached` = true, длина 0). `transferToFixedLength` — то же, но новый не растёт.", "Передать данные без копирования.", "const a = new ArrayBuffer(8);\nconst b = a.transfer();\nconst c = b.transferToFixedLength(4);\nconsole.log(a.detached, a.byteLength, b.detached, c.byteLength, c.resizable);", { covers: AB("transfer", "transferToFixedLength", "detached") }),
      rule("ArrayBuffer — только память. Читать и писать её будешь через Uint8Array, Float32Array или DataView.")
    ],
    tasks: [task("Буфер данных", "Создай `buf` — растущий ArrayBuffer на 8 байт с максимумом 64, увеличь его до 32 байт, и `isBinary(x)` — true для буфера или любого представления.", {
      start: "const buf = new ArrayBuffer(8);\nfunction isBinary(x) {\n  return false;\n}\n",
      checks: [run("buf.resizable && buf.maxByteLength === 64 && buf.byteLength === 32", "Буфер вырос до 32"), run("isBinary(buf) && isBinary(new Uint8Array(1)) && !isBinary([1])", "Проверка двоичных данных")],
      solution: "const buf = new ArrayBuffer(8, { maxByteLength: 64 });\nbuf.resize(32);\nfunction isBinary(x) {\n  return x instanceof ArrayBuffer || ArrayBuffer.isView(x);\n}"
    })],
    quizzes: [single("js-ab-read", "Чтение", "Как прочитать байты из ArrayBuffer?", [["view", "Через типизированный массив или DataView"], ["index", "buf[0]"], ["get", "buf.get(0)"], ["json", "JSON.parse(buf)"]], "view", "Сам буфер не даёт доступа к байтам.")]
  });

  L({
    slug: "typed-arrays", title: "Типизированные массивы", summary: "Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float16Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array, BYTES_PER_ELEMENT, from, of, buffer, byteOffset, set и subarray.",
    skill: ["js-typed-arrays", "Типизированные массивы", "Читать и писать двоичные данные числами нужного размера."],
    now: "Читаем и пишем двоичные данные числами нужного размера.",
    body: [
      scene("Размер числа",
        ["bro", "Байт — число от 0 до 255. Два байта — до 65535. Для каждого размера есть свой типизированный массив."]),
      obj("Int8Array · Uint8Array · Uint8ClampedArray · Int16Array", "Маленькие целые", "`Int8Array` −128…127, `Uint8Array` 0…255 (переполнение по кругу), `Uint8ClampedArray` 0…255 с обрезкой (пиксели canvas), `Int16Array` −32768…32767.", "Байты файлов, пиксели, звук.", "console.log(new Uint8Array([300])[0], new Uint8ClampedArray([300])[0], new Int8Array([200])[0], new Int16Array([40000])[0]);", { covers: ["Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array"] }),
      obj("Uint16Array · Int32Array · Uint32Array · Float16Array", "Средние", "`Uint16Array` 0…65535, `Int32Array` и `Uint32Array` — 32-битные целые, `Float16Array` — дробные половинной точности (графика, нейросети).", "Счётчики, цвета, компактные дробные.", "console.log(new Uint16Array([70000])[0], new Uint32Array([-1])[0], new Float16Array([0.1])[0]);", { covers: ["Uint16Array", "Int32Array", "Uint32Array", "Float16Array"] }),
      obj("Float32Array · Float64Array · BigInt64Array · BigUint64Array", "Дробные и огромные", "`Float32Array` — одинарная точность (WebGL), `Float64Array` — как обычные числа, `BigInt64Array`/`BigUint64Array` — 64-битные целые в виде BigInt.", "3D-графика, точные 64-битные значения.", "console.log(new Float32Array([0.1])[0], new Float64Array([0.1])[0], new BigInt64Array([-1n])[0], new BigUint64Array([-1n])[0]);", { covers: ["Float32Array", "Float64Array", "BigInt64Array", "BigUint64Array"] }),
      kw("BYTES_PER_ELEMENT", "Размер элемента", "Сколько байт занимает один элемент: 1, 2, 4 или 8.", "Посчитать нужный размер буфера.", "console.log(Uint8Array.BYTES_PER_ELEMENT, Float32Array.BYTES_PER_ELEMENT, BigInt64Array.BYTES_PER_ELEMENT);", { covers: ["TypedArray.BYTES_PER_ELEMENT"] }),
      meth("TypedArray.from() · TypedArray.of()", "Создание", "Как у Array: из перебираемого (с функцией преобразования) или из аргументов.", "Преобразовать обычный массив.", "console.log(Uint8Array.from([1, 2, 3], (x) => x * 10), Float32Array.of(0.5, 1.5));", { covers: on("TypedArray", "from", "of") }),
      meth("buffer · byteLength · byteOffset · length", "Связь с буфером", "Типизированный массив — окно в буфер: `buffer` — сам буфер, `byteOffset` — где начинается окно, `byteLength` — размер в байтах, `length` — число элементов.", "Несколько представлений одного буфера.", "const buf = new ArrayBuffer(8);\nconst view = new Uint16Array(buf, 2, 2);\nconsole.log(view.buffer === buf, view.byteOffset, view.byteLength, view.length);", { covers: TA("buffer", "byteLength", "byteOffset", "length") }),
      meth("set() · subarray()", "Запись и окно", "`set(array, offset)` копирует значения внутрь; `subarray(a, b)` — новое окно в тот же буфер (без копирования, в отличие от `slice`).", "Склеить пакеты, работать с частью данных.", "const all = new Uint8Array(6);\nall.set([1, 2, 3], 3);\nconst tail = all.subarray(3);\ntail[0] = 9;\nconsole.log(all, tail.length);", { covers: TA("set", "subarray") }),
      rule("`subarray` делит память с исходным массивом, `slice` — копирует. Меняешь окно — меняешь оригинал.")
    ],
    tasks: [task("Пакет данных", "Собери `packet` — Uint8Array из 4 байт: в начало запиши `header` через `set`, а в `body` сохрани `subarray` с индекса 2 (окно, а не копию).", {
      start: "const header = [0xaa, 0xbb];\nconst packet = new Uint8Array(4);\nconst body = packet.slice(2);\n",
      checks: [run("packet[0] === 170 && packet[1] === 187", "Заголовок записан"), run("body.length === 2 && (body[0] = 7, packet[2] === 7)", "body — окно в packet")],
      solution: "const header = [0xaa, 0xbb];\nconst packet = new Uint8Array(4);\npacket.set(header, 0);\nconst body = packet.subarray(2);"
    })],
    quizzes: [single("js-uint8-overflow", "Переполнение", "Что окажется в `new Uint8Array([256])[0]`?", [["0", "0"], ["255", "255"], ["256", "256"], ["err", "Ошибка"]], "0", "Значение берётся по модулю 256.")]
  });

  L({
    slug: "typed-array-methods", title: "Методы типизированных массивов", summary: "У типизированных массивов есть почти все методы обычных: at, includes, indexOf, lastIndexOf, find, findIndex, findLast, findLastIndex, every, some, forEach, map, filter, reduce, reduceRight, join, sort, reverse, fill, copyWithin, slice, keys, values, entries, toReversed, toSorted, with, toString и toLocaleString.",
    skill: ["js-typed-array-methods", "Методы typed arrays", "Обрабатывать двоичные данные привычными методами массивов."],
    now: "Обрабатываем двоичные данные привычными методами массивов.",
    body: [
      scene("Как у массивов",
        ["nika", "Почти все методы массивов есть и у типизированных. Отличие одно: результат — снова типизированный массив того же вида."]),
      meth("at() · includes() · indexOf() · lastIndexOf()", "Доступ и поиск", "Как у массивов.", "Найти значение в данных датчика.", "const t = new Uint8Array([90, 92, 95, 92]);\nconsole.log(t.at(-1), t.includes(95), t.indexOf(92), t.lastIndexOf(92));", { covers: TA("at", "includes", "indexOf", "lastIndexOf") }),
      meth("find() · findIndex() · findLast() · findLastIndex()", "Поиск по условию", "Как у массивов.", "Первый и последний перегрев.", "const t = new Uint8Array([90, 97, 95, 98]);\nconsole.log(t.find((x) => x > 96), t.findIndex((x) => x > 96), t.findLast((x) => x > 96), t.findLastIndex((x) => x > 96));", { covers: TA("find", "findIndex", "findLast", "findLastIndex") }),
      meth("every() · some() · forEach()", "Проверки и перебор", "Как у массивов.", "Все ли показания в норме.", "const t = new Uint8Array([90, 92]);\nconsole.log(t.every((x) => x < 96), t.some((x) => x > 91));\nt.forEach((x, i) => console.log(i, x));", { covers: TA("every", "some", "forEach") }),
      meth("map() · filter() · reduce() · reduceRight()", "Преобразования", "Как у массивов, но `map` и `filter` возвращают типизированный массив того же вида (значения обрежутся по его правилам).", "Пересчитать и отфильтровать данные.", "const t = new Uint8Array([100, 200]);\nconsole.log(t.map((x) => x * 2), t.filter((x) => x > 150), t.reduce((a, b) => a + b, 0), t.reduceRight((a, b) => a + \",\" + b, \"\"));", { covers: TA("map", "filter", "reduce", "reduceRight") }),
      meth("sort() · reverse() · fill() · copyWithin()", "Изменение на месте", "Как у массивов; `sort()` без функции сортирует ЧИСЛА (в отличие от обычных массивов).", "Упорядочить показания.", "const t = new Uint8Array([10, 9, 100]);\nconsole.log(t.sort(), t.reverse(), new Uint8Array(3).fill(7), new Uint8Array([1, 2, 3, 4]).copyWithin(0, 2));", { covers: TA("sort", "reverse", "fill", "copyWithin") }),
      meth("slice() · join() · toString() · toLocaleString()", "Копия и строки", "`slice` — копия (в отличие от `subarray`); строки — как у массивов.", "Вывести данные.", 'const t = new Float32Array([1250.5, 3]);\nconsole.log(t.slice(1), t.join(" | "), t.toString(), t.toLocaleString("ru-RU"));', { covers: TA("slice", "join", "toString", "toLocaleString") }),
      meth("keys() · values() · entries()", "Итераторы", "Индексы, значения и пары — как у массивов.", "Перебор с номерами.", "for (const [i, v] of new Uint8Array([5, 6]).entries()) console.log(i, v);\nconsole.log([...new Uint8Array([5, 6]).keys()], [...new Uint8Array([5, 6]).values()]);", { covers: TA("keys", "values", "entries") }),
      meth("toReversed() · toSorted() · with()", "Копии с изменением", "Как у массивов, оригинал не меняется.", "Неизменяемая обработка данных.", "const t = new Uint8Array([3, 1, 2]);\nconsole.log(t.toSorted(), t.toReversed(), t.with(0, 9), t);", { covers: TA("toReversed", "toSorted", "with") }),
      rule("`sort()` у типизированного массива сортирует числа правильно — функция сравнения не нужна.")
    ],
    tasks: [task("Анализ датчика", "Для `temps` (Uint8Array) посчитай `avg` — среднюю температуру через `reduce`, `hot` — Uint8Array показаний выше 95 через `filter`, и `sorted` — отсортированную копию через `toSorted`.", {
      start: "const temps = new Uint8Array([92, 97, 90, 99]);\nconst avg = 0;\nconst hot = [];\nconst sorted = temps;\n",
      checks: [run("avg === 94.5", "Средняя 94.5"), run("hot instanceof Uint8Array && hot.join() === \"97,99\"", "Перегревы"), run('sorted.join() === "90,92,97,99" && temps[0] === 92', "Копия отсортирована, оригинал цел")],
      solution: "const temps = new Uint8Array([92, 97, 90, 99]);\nconst avg = temps.reduce((a, b) => a + b, 0) / temps.length;\nconst hot = temps.filter((t) => t > 95);\nconst sorted = temps.toSorted();"
    })],
    quizzes: [single("js-ta-map-type", "map", "Что вернёт `new Uint8Array([200]).map((x) => x * 2)`?", [["clip", "Uint8Array [144] — значение обрезано по модулю 256"], ["400", "[400]"], ["arr", "Обычный массив [400]"], ["err", "Ошибку"]], "clip", "Результат того же типа, 400 % 256 = 144.")]
  });

  L({
    slug: "dataview", title: "DataView: байты любого формата", summary: "DataView, buffer, byteLength, byteOffset и методы get и set для Int8, Uint8, Int16, Uint16, Int32, Uint32, Float16, Float32, Float64, BigInt64 и BigUint64 с порядком байтов.",
    skill: ["js-dataview", "DataView", "Читать и писать числа разных размеров в любом месте буфера и с любым порядком байтов."],
    now: "Читаем и пишем числа любого размера и порядка байтов: DataView.",
    body: [
      scene("Смешанный пакет",
        ["you", "В пакете от датчика всё вперемешку: байт, два байта, четыре байта…"],
        ["bro", "DataView читает любое число из любого места буфера. И знает про порядок байтов."]),
      obj("DataView · buffer · byteLength · byteOffset", "Окно с любым форматом", "`new DataView(buffer, offset, length)` — окно в буфер; `buffer`, `byteOffset`, `byteLength` — как у типизированных массивов.", "Разбор двоичных форматов: файлы, протоколы.", "const buf = new ArrayBuffer(16);\nconst dv = new DataView(buf, 4, 8);\nconsole.log(dv.buffer === buf, dv.byteOffset, dv.byteLength);", { covers: ["DataView", ...DV("buffer", "byteLength", "byteOffset")] }),
      meth("getInt8() · setInt8() · getUint8() · setUint8()", "Один байт", "Прочитать или записать байт со знаком или без по смещению.", "Флаги, тип пакета.", "const dv = new DataView(new ArrayBuffer(2));\ndv.setUint8(0, 255);\ndv.setInt8(1, -1);\nconsole.log(dv.getUint8(0), dv.getInt8(0), dv.getUint8(1));", { covers: DV("getInt8", "setInt8", "getUint8", "setUint8") }),
      meth("getInt16() · setInt16() · getUint16() · setUint16()", "Два байта и порядок байтов", "Третий аргумент `littleEndian`: `true` — младший байт первым (как в x86), по умолчанию — старший первым (сетевой порядок).", "Номера, короткие целые в протоколах.", "const dv = new DataView(new ArrayBuffer(4));\ndv.setUint16(0, 1042);\ndv.setInt16(2, -2, true);\nconsole.log(dv.getUint16(0), dv.getUint16(0, true), dv.getInt16(2, true));", { covers: DV("getInt16", "setInt16", "getUint16", "setUint16") }),
      meth("getInt32() · setInt32() · getUint32() · setUint32()", "Четыре байта", "32-битные целые со знаком и без.", "Суммы в копейках, метки времени.", "const dv = new DataView(new ArrayBuffer(8));\ndv.setUint32(0, 4_000_000_000);\ndv.setInt32(4, -5);\nconsole.log(dv.getUint32(0), dv.getInt32(0), dv.getInt32(4));", { covers: DV("getInt32", "setInt32", "getUint32", "setUint32") }),
      meth("getFloat16() · setFloat16() · getFloat32() · setFloat32()", "Дробные 16 и 32 бита", "Дробные половинной и одинарной точности.", "Показания датчиков, графика.", "const dv = new DataView(new ArrayBuffer(6));\ndv.setFloat16(0, 1.5);\ndv.setFloat32(2, 0.1);\nconsole.log(dv.getFloat16(0), dv.getFloat32(2));", { covers: DV("getFloat16", "setFloat16", "getFloat32", "setFloat32") }),
      meth("getFloat64() · setFloat64()", "Дробные 64 бита", "Обычные числа JavaScript без потери точности.", "Точные дробные в бинарных форматах.", "const dv = new DataView(new ArrayBuffer(8));\ndv.setFloat64(0, Math.PI);\nconsole.log(dv.getFloat64(0) === Math.PI);", { covers: DV("getFloat64", "setFloat64") }),
      meth("getBigInt64() · setBigInt64() · getBigUint64() · setBigUint64()", "64-битные целые", "Читают и пишут BigInt.", "Идентификаторы, большие счётчики.", "const dv = new DataView(new ArrayBuffer(8));\ndv.setBigUint64(0, 2n ** 64n - 1n);\nconsole.log(dv.getBigUint64(0), dv.getBigInt64(0));\ndv.setBigInt64(0, -2n);\nconsole.log(dv.getBigInt64(0));", { covers: DV("getBigInt64", "setBigInt64", "getBigUint64", "setBigUint64") }),
      rule("Любой двоичный формат описывается тремя вещами: смещение, размер и порядок байтов. Ровно эти три параметра и передаёшь в DataView.")
    ],
    tasks: [task("Разбор пакета", "Пакет: байт 0 — тип (Uint8), байты 1–2 — номер заказа (Uint16, старший байт первым), байты 3–6 — сумма в копейках (Uint32, младший байт первым). Напиши `parsePacket(buf)` → `{ type, id, kopecks }`.", {
      start: "function parsePacket(buf) {\n  return { type: 0, id: 0, kopecks: 0 };\n}\n",
      checks: [run("(() => { const buf = new ArrayBuffer(7); const dv = new DataView(buf); dv.setUint8(0, 2); dv.setUint16(1, 1042); dv.setUint32(3, 44000, true); const p = parsePacket(buf); return p.type === 2 && p.id === 1042 && p.kopecks === 44000; })()", "Пакет разобран")],
      solution: "function parsePacket(buf) {\n  const dv = new DataView(buf);\n  return { type: dv.getUint8(0), id: dv.getUint16(1), kopecks: dv.getUint32(3, true) };\n}"
    })],
    quizzes: [single("js-endian", "Порядок байтов", "Что значит `littleEndian = true`?", [["low", "Младший байт записан первым"], ["high", "Старший байт первым"], ["small", "Маленькие числа"], ["signed", "Число со знаком"]], "low", "По умолчанию DataView использует старший-первым (big-endian).")]
  });

  L({
    slug: "shared-memory", title: "Общая память и Atomics", summary: "SharedArrayBuffer, grow, growable, maxByteLength, byteLength, slice и Atomics: load, store, add, sub, and, or, xor, exchange, compareExchange, isLockFree, wait, waitAsync, notify, pause.",
    skill: ["js-atomics", "Общая память", "Понимать, как потоки делят память и почему нужны атомарные операции."],
    now: "Общая память потоков и атомарные операции.",
    body: [
      scene("Два потока",
        ["bug", "Два потока одновременно сделают `count++` — и один заказ пропадёт! Хе-хе."],
        ["nika", "Для общей памяти есть атомарные операции: они выполняются целиком, никто не вклинится."]),
      obj("SharedArrayBuffer · byteLength · slice()", "Общий буфер", "Буфер, который могут одновременно видеть несколько потоков (workers). В браузере доступен только на изолированных страницах (заголовки COOP и COEP).", "Параллельные вычисления.", shared + "  const sab = new SharedArrayBuffer(8);\n  console.log(sab.byteLength, sab.slice(0, 4).byteLength);\n}", { covers: ["SharedArrayBuffer", ...on("SharedArrayBuffer.prototype", "byteLength", "slice")] }),
      meth("growable · maxByteLength · grow()", "Растущий общий буфер", "`new SharedArrayBuffer(4, { maxByteLength: 16 })`; общий буфер может только расти: `grow(n)`.", "Общие данные растущего размера.", shared + "  const sab = new SharedArrayBuffer(4, { maxByteLength: 16 });\n  sab.grow(8);\n  console.log(sab.growable, sab.byteLength, sab.maxByteLength);\n}", { covers: on("SharedArrayBuffer.prototype", "growable", "maxByteLength", "grow") }),
      obj("Atomics · load() · store() · add()", "Атомарные чтение, запись, сложение", "`Atomics` — объект с атомарными операциями над целочисленными типизированными массивами: `load`, `store`, `add` (возвращает старое значение). Работают и с обычными буферами.", "Общие счётчики без потерь.", "const counter = new Int32Array(new ArrayBuffer(4));\nAtomics.store(counter, 0, 10);\nconsole.log(Atomics.add(counter, 0, 5), Atomics.load(counter, 0));", { covers: ["Atomics", ...AT("load", "store", "add")] }),
      meth("Atomics.sub() · and() · or() · xor()", "Атомарная арифметика и биты", "Вычитание и побитовые операции, возвращают старое значение.", "Флаги, общие для потоков.", "const a = new Int32Array(new ArrayBuffer(4));\nAtomics.store(a, 0, 0b1100);\nAtomics.or(a, 0, 0b0001);\nAtomics.and(a, 0, 0b1101);\nAtomics.xor(a, 0, 0b1000);\nAtomics.sub(a, 0, 1);\nconsole.log(a[0]);", { covers: AT("sub", "and", "or", "xor") }),
      meth("Atomics.exchange() · compareExchange() · isLockFree()", "Обмен и проверка", "`exchange` — записать и вернуть старое; `compareExchange(arr, i, ожидаемое, новое)` — записать, только если там ожидаемое (основа блокировок); `isLockFree(n)` — работают ли операции размера n без блокировок.", "Свои блокировки и флаги «занято».", "const lock = new Int32Array(new ArrayBuffer(4));\nconsole.log(Atomics.compareExchange(lock, 0, 0, 1), Atomics.compareExchange(lock, 0, 0, 1), Atomics.exchange(lock, 0, 0), Atomics.isLockFree(4));", { covers: AT("exchange", "compareExchange", "isLockFree") }),
      meth("Atomics.wait() · waitAsync() · notify() · pause()", "Ожидание и пробуждение", "`wait` — уснуть, пока значение не изменится (только в worker и с общим буфером), `waitAsync` — то же через промис, `notify` — разбудить ждущих, `pause` — подсказка процессору в цикле ожидания.", "Синхронизация потоков.", 'const a = new Int32Array(new ArrayBuffer(4));\nconsole.log(typeof Atomics.wait, typeof Atomics.waitAsync, Atomics.notify(a, 0, 1));\nAtomics.pause?.();', { covers: AT("wait", "waitAsync", "notify", "pause") }),
      rule("Общая память без Atomics — гонки и потерянные данные. Каждое общее изменение — атомарной операцией.")
    ],
    tasks: [task("Счётчик заказов", "Напиши `nextOrder(counter)`: атомарно увеличивает `counter[0]` на 1 и возвращает новый номер (через `Atomics.add`, который возвращает старое значение).", {
      start: "function nextOrder(counter) {\n  counter[0]++;\n  return counter[0];\n}\n",
      checks: [run("(() => { const c = new Int32Array(new ArrayBuffer(4)); c[0] = 1041; return nextOrder(c) === 1042 && nextOrder(c) === 1043; })()", "Номера идут подряд"), has("Atomics.add", "Через `Atomics.add`")],
      solution: "function nextOrder(counter) {\n  return Atomics.add(counter, 0, 1) + 1;\n}"
    })],
    quizzes: [single("js-atomics-why", "Зачем", "Почему `count++` из двух потоков может потерять увеличение?", [["race", "Чтение и запись — две операции, другой поток может вклиниться между ними"], ["slow", "Это медленно"], ["type", "Из-за типов"], ["never", "Не может"]], "race", "Atomics.add делает это одной неделимой операцией.")]
  });
}
