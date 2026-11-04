import { strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { describeProblem, readUpload, starterZip } from "./files";

const zipFile = (entries: Record<string, Uint8Array>, name = "work.zip") =>
  new File([zipSync(entries).slice().buffer], name, {
    type: "application/zip"
  });

describe("assignment files (ADR-0073)", () => {
  it("reads a zip of one folder as if the folder were the root", async () => {
    const upload = await readUpload([
      zipFile({
        "page/index.html": strToU8("<h1>Привет</h1>"),
        "page/style.css": strToU8("h1{color:red}"),
        "__MACOSX/page/._index.html": strToU8("junk"),
        "page/.DS_Store": strToU8("junk")
      })
    ]);
    expect(upload.files).toEqual({
      "index.html": "<h1>Привет</h1>",
      "style.css": "h1{color:red}"
    });
    expect(upload.dropped).toEqual([]);
  });

  it("drops binary and oversized entries without inflating them", async () => {
    const upload = await readUpload([
      zipFile({
        "index.html": strToU8("<p>"),
        "logo.png": new Uint8Array([0x89, 0x50, 0xff, 0xfe, 0x00, 0xc3]),
        "big.css": strToU8("a".repeat(201 * 1024))
      })
    ]);
    expect(upload.files).toEqual({ "index.html": "<p>" });
    expect(upload.dropped.sort()).toEqual(["big.css", "logo.png"]);
  });

  it("reads loose files by name", async () => {
    const upload = await readUpload([
      new File(["<h1>"], "index.html"),
      new File(["h1{}"], "style.css")
    ]);
    expect(upload.files).toEqual({ "index.html": "<h1>", "style.css": "h1{}" });
  });

  it("packs the starter files with a README", async () => {
    const zip = unzipSync(
      await starterZip({ "index.html": "<!doctype html>" }, "# Задание")
    );
    expect(Object.keys(zip).sort()).toEqual(["README.md", "index.html"]);
    expect(new TextDecoder().decode(zip["README.md"])).toBe("# Задание");
  });

  it("explains upload problems in plain words", () => {
    expect(describeProblem("missing_entry:index.html", "index.html")).toBe(
      "Нет главного файла index.html."
    );
    expect(describeProblem("not_allowed:app.js", "index.html")).toBe(
      "Файл app.js не нужен в этом задании."
    );
  });
});
