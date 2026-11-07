// Chapter 3: controllers and routes — route decorators, params and query, status codes and responses.
import { idea, ns, tip, makeLesson } from "./nkit.mjs";

export default function controllers(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "routes", title: "Маршруты", summary: "@Get, @Post, @Patch, @Delete, префикс контроллера, REST-ресурс.",
    skill: ["ns-routes", "Маршруты", "Описывать маршруты REST в контроллерах."],
    now: "Управляем жизнью провайдеров и описываем адреса API.",
    body: [
      ns("Декораторы методов", "Метод и путь", "Префикс в @Controller, метод HTTP и путь в декораторе метода.", "Весь ресурс курсов — в одном классе.", "@Controller(\"courses\")\nexport class CoursesController {\n  @Get() findAll() {}\n  @Get(\":slug\") findOne() {}\n  @Post() create() {}\n  @Patch(\":slug\") update() {}\n  @Delete(\":slug\") remove() {}\n}"),
      idea("REST", "Ресурс и действия", "Существительное в пути, действие — методом: GET читает, POST создаёт, PATCH меняет, DELETE удаляет.", "API понятно без документации."),
      idea("Версии", "/v1/", "Глобальный префикс и версии API (app.enableVersioning) позволяют менять API, не ломая старых клиентов.", "Мобильное приложение старой версии продолжит работать."),
      tip("Ресурс — контроллер, действия — методами HTTP. Версия — в пути.")
    ],
    quizzes: [
      single("rt-patch", "Изменение", "Каким методом частично изменить курс?",
        [["patch", "PATCH /courses/:slug"], ["get", "GET /courses/update"], ["post", "POST /updateCourse"], ["delete", "DELETE"]], "patch",
        "Действие — методом, не словом в пути."),
      single("rt-prefix", "Префикс", "Какой путь у @Get(\":slug\") в @Controller(\"courses\")?",
        [["path", "/courses/:slug"], ["slug", "/:slug"], ["controller", "/controller/courses"], ["get", "/get/courses"]], "path",
        "Префикс + путь метода."),
      single("rt-version", "Версии", "Зачем версии API вроде /v1/?",
        [["compat", "Менять API, не ломая старых клиентов"], ["seo", "Для поисковиков"], ["speed", "Для скорости"], ["none", "Незачем"]], "compat",
        "Старые приложения продолжают работать.")
    ]
  });

  L({
    slug: "params-body", title: "Параметры и тело", summary: "@Param, @Query, @Body, @Headers, преобразование типов ParseIntPipe.",
    skill: ["ns-params", "Данные запроса", "Получать параметры, запрос и тело в контроллере."],
    now: "Описали маршруты и достаём данные из запроса.",
    body: [
      ns("@Param и @Query", "Путь и строка запроса", "@Param(\"slug\") — часть пути, @Query(\"page\") — параметр после ?.", "Фильтры и пагинация.", "@Get(\":id\")\nfindOne(@Param(\"id\", ParseIntPipe) id: number, @Query(\"lang\") lang = \"ru\") {\n  return this.lessons.findOne(id, lang);\n}"),
      ns("@Body", "Тело запроса", "@Body() даёт разобранный JSON тела, обычно в виде DTO-класса.", "Данные для создания записи.", "@Post()\ncreate(@Body() dto: CreateCourseDto) {\n  return this.courses.create(dto);\n}"),
      idea("Типы из строки", "ParseIntPipe", "Всё из пути и строки запроса приходит строками. ParseIntPipe превращает в число или отвечает 400.", "«abc» вместо id не дойдёт до базы."),
      tip("Путь — @Param, фильтры — @Query, данные — @Body с DTO. Числа — через ParseIntPipe.")
    ],
    quizzes: [
      single("pb-query", "Фильтры", "Как получить page из /courses?page=2?",
        [["query", "@Query(\"page\")"], ["param", "@Param(\"page\")"], ["body", "@Body(\"page\")"], ["header", "@Headers(\"page\")"]], "query",
        "Строка запроса."),
      single("pb-type", "Тип", "Каким типом приходит id из пути без преобразования?",
        [["string", "Строкой"], ["number", "Числом"], ["object", "Объектом"], ["null", "null"]], "string",
        "ParseIntPipe превратит в число."),
      single("pb-400", "Неверный id", "Что сделает ParseIntPipe с id = \"abc\"?",
        [["400", "Ответит ошибкой 400"], ["zero", "Превратит в 0"], ["pass", "Пропустит строку дальше"], ["500", "Упадёт с 500"]], "400",
        "Неверный ввод не доходит до базы.")
    ]
  });

  L({
    slug: "responses", title: "Ответы и коды", summary: "@HttpCode, исключения HttpException, NotFoundException, заголовки, пагинация ответа.",
    skill: ["ns-responses", "Ответы", "Возвращать правильные коды и ошибки."],
    now: "Получаем данные запроса и формируем правильные ответы.",
    body: [
      ns("Исключения", "Ошибки с кодом", "throw new NotFoundException() даёт 404, BadRequestException — 400, ForbiddenException — 403.", "Клиент понимает, что пошло не так.", "async findOne(slug: string) {\n  const course = await this.repo.find(slug);\n  if (!course) throw new NotFoundException(`Курс ${slug} не найден`);\n  return course;\n}"),
      ns("@HttpCode", "Свой код", "@HttpCode(204) для удаления без тела.", "Точные коды по стандарту HTTP.", "@Delete(\":slug\")\n@HttpCode(204)\nremove(@Param(\"slug\") slug: string) {\n  return this.courses.remove(slug);\n}"),
      idea("Пагинация", "Страницы и курсор", "Большие списки отдают частями: { items, nextCursor } или с номером страницы.", "Ответ не растёт до мегабайт."),
      tip("Ошибки — исключениями Nest с правильным кодом. Списки — частями.")
    ],
    quizzes: [
      single("rs-404", "Не найдено", "Как вернуть 404 из сервиса?",
        [["throw", "throw new NotFoundException()"], ["return", "return null и надеяться"], ["res", "res.status(404) в сервисе"], ["log", "console.log"]], "throw",
        "Nest превратит исключение в ответ."),
      single("rs-204", "Удаление", "Какой код уместен для успешного удаления без тела ответа?",
        [["204", "204 No Content"], ["200", "Только 200"], ["404", "404"], ["500", "500"]], "204",
        "@HttpCode(204)."),
      single("rs-page", "Большие списки", "Как отдавать список из миллиона записей?",
        [["pages", "Частями: страницы или курсор"], ["all", "Всё одним ответом"], ["csv", "Только CSV-файлом"], ["none", "Никак"]], "pages",
        "{ items, nextCursor }.")
    ]
  });
}
