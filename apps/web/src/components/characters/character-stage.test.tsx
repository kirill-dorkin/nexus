import { render, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CharacterStage, canDraw3d, usePortraits } from "./character-stage";

describe("CharacterStage", () => {
  it("keeps a decorative place for a character with a body and nothing for the others", () => {
    const { container, rerender } = render(
      <CharacterStage slug="html" level={40} />
    );
    const stage = container.querySelector("[aria-hidden]");
    expect(stage).toHaveAttribute("aria-hidden", "true");
    // No WebGL in the test DOM: the scene is never loaded and the page still works.
    expect(canDraw3d()).toBe(false);
    expect(stage).not.toHaveAttribute("data-ready");
    // The rank preview appears only once the scene is drawn.
    expect(container.querySelector("button")).toBeNull();
    rerender(<CharacterStage slug="vue" level={40} />);
    expect(container.firstElementChild).toBeNull();
  });

  it("leaves roster portraits empty where WebGL is unavailable", () => {
    const { result } = renderHook(() =>
      usePortraits([{ slug: "pc", level: 30 }])
    );
    expect(result.current).toEqual({});
  });
});
