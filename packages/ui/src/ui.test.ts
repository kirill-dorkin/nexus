import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Button,
  ButtonLink,
  Checkbox,
  Disclosure,
  Field,
  Input,
  Progress,
  RadioGroup
} from "./index";

describe("UI native behavior and accessibility contracts", () => {
  it("does not accidentally submit forms and disables a pending mutation", () => {
    expect(renderToStaticMarkup(createElement(Button, null, "Run"))).toContain(
      'type="button"'
    );
    const pending = renderToStaticMarkup(
      createElement(Button, { type: "submit", loading: true }, "Saving")
    );
    expect(pending).toContain('type="submit"');
    expect(pending).toContain('disabled=""');
    expect(pending).toContain('aria-busy="true"');
    expect(
      renderToStaticMarkup(
        createElement(ButtonLink, { href: "/courses" }, "Courses")
      )
    ).toContain('<a href="/courses"');
  });
  it("keeps zero, clamps invalid percentages and leaves unknown progress indeterminate", () => {
    for (const [value, expected] of [
      [0, 0],
      [-5, 0],
      [150, 100],
      [60, 60]
    ]) {
      const markup = renderToStaticMarkup(
        createElement(Progress, { value, label: "Tasks" })
      );
      expect(markup).toContain(`value="${expected}"`);
      expect(markup).toContain('aria-label="Tasks"');
    }
    for (const value of [undefined, NaN, Infinity]) {
      expect(
        renderToStaticMarkup(createElement(Progress, { value, label: "Tasks" }))
      ).not.toContain("value=");
    }
  });
  it("preserves native labelling, error relationships and keyboard primitives", () => {
    const markup = renderToStaticMarkup(
      createElement(Field, {
        htmlFor: "email",
        label: "Email",
        error: "Invalid",
        children: createElement(Input, {
          id: "email",
          "aria-invalid": true,
          "aria-describedby": "email-error"
        })
      })
    );
    expect(markup).toContain('for="email"');
    expect(markup).toContain('id="email-error"');
    expect(markup).toContain('aria-describedby="email-error"');
    expect(
      renderToStaticMarkup(
        createElement(Checkbox, { label: "Hints", name: "hints" })
      )
    ).toContain('type="checkbox"');
    const radios = renderToStaticMarkup(
      createElement(RadioGroup, {
        legend: "Pace",
        name: "pace",
        options: [{ value: "calm", label: "Calm" }]
      })
    );
    expect(radios).toContain("<legend");
    expect(radios).toContain('type="radio" name="pace"');
    expect(
      renderToStaticMarkup(
        createElement(Disclosure, { summary: "Question", children: "Answer" })
      )
    ).toContain("<summary>Question</summary>");
  });
});
