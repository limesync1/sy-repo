import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleRouteMap, type GoogleRouteStop } from "../GoogleRouteMap";

const mocks = vi.hoisted(() => ({ load: vi.fn(), clear: vi.fn(), pins: [] as any[], maps: [] as any[], importLibrary: vi.fn() }));
vi.mock("@/lib/google-maps-loader", () => ({
  loadGoogleMaps: mocks.load,
  googleMapsMapId: () => "test-map-id",
  onGoogleMapsAuthFailure: () => () => {},
  GoogleMapsLoadError: class extends Error {},
}));
vi.mock("../RouteMapLine", () => ({ resolveMapColor: () => "teal" }));

class AdvancedPin {
  map: unknown;
  position: unknown;
  title: string;
  zIndex: number;
  options: any;
  content: Node | undefined;
  listeners = new Map<string, () => void>();
  constructor(options: any) {
    this.options = options; this.map = options.map; this.position = options.position;
    this.title = options.title; this.zIndex = options.zIndex;
    mocks.pins.push(this);
  }
  replaceChildren(content: Node) { this.content = content; }
  addListener(name: string, listener: () => void) { this.listeners.set(name, listener); }
}

const stops: GoogleRouteStop[] = [
  { id: "one", n: 1, pos: [56, 9], state: "next", highlighted: false },
  { id: "two", n: 2, pos: [56.1, 9.1], state: "future", highlighted: false },
];
const makeProps = () => ({
  stops, start: [55.9, 9] as [number, number], overview: [], previewLine: [], legLine: [], hintLine: null,
  userPos: null, routeStarted: false, moving: false, track: { subscribe: vi.fn(() => () => {}) } as any,
  speedMps: 0, followActive: false, fitEnabled: false, flyTo: null, night: false,
  onInteract: vi.fn(), onRecenter: vi.fn(), onSelectStop: vi.fn(), onFailure: vi.fn(),
});

beforeEach(() => {
  mocks.pins.length = 0; mocks.maps.length = 0; vi.clearAllMocks();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400);
  const maps = {
    Map: class {
      options: unknown;
      moveCamera = vi.fn();
      constructor(_el: unknown, options: unknown) { this.options = options; mocks.maps.push(this); }
      addListener() {}
      setMapTypeId() {}
      getHeading() { return 0; }
      getZoom() { return 13; }
      getRenderingType() { return "VECTOR"; }
    },
    importLibrary: mocks.importLibrary,
    Polyline: class { setMap() {} },
    RenderingType: { VECTOR: "VECTOR", RASTER: "RASTER" },
    ColorScheme: { DARK: "DARK", LIGHT: "LIGHT" },
    CollisionBehavior: { REQUIRED: "REQUIRED" },
    event: { clearInstanceListeners: mocks.clear, addListenerOnce: vi.fn(), trigger: vi.fn() },
  };
  mocks.importLibrary.mockResolvedValue({ AdvancedMarkerElement: AdvancedPin });
  vi.stubGlobal("google", { maps });
  mocks.load.mockResolvedValue({ maps });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Google advanced stop pins", () => {
  it("loads the marker library, anchors pins at addresses and keeps them geographic during camera movement", async () => {
    const props = makeProps(); render(<GoogleRouteMap {...props} />);
    await waitFor(() => expect(mocks.pins).toHaveLength(3));
    expect(mocks.importLibrary).toHaveBeenCalledWith("marker");
    expect(mocks.maps[0].options.mapId).toBe("test-map-id");
    const pin = mocks.pins[0];
    expect(pin.options).toMatchObject({ position: { lat: 56, lng: 9 }, anchorLeft: "-22px", anchorTop: "-52px", gmpClickable: true, collisionBehavior: "REQUIRED" });
    expect(pin.content).toBeInstanceOf(HTMLImageElement);
    expect(pin.content.width).toBe(44);
    act(() => mocks.maps[0].moveCamera({ center: { lat: 57, lng: 10 }, heading: 90, tilt: 45 }));
    expect(pin.position).toEqual({ lat: 56, lng: 9 });
    act(() => pin.listeners.get("click")?.());
    expect(props.onSelectStop).toHaveBeenCalledWith("one");
  });

  it("updates completion, undo, highlighting, coordinates and theme without recreating pins", async () => {
    const props = makeProps(); const view = render(<GoogleRouteMap {...props} />);
    await waitFor(() => expect(mocks.pins).toHaveLength(3));
    const pin = mocks.pins[0]; const startPin = mocks.pins[2]; const initialContent = pin.content;
    view.rerender(<GoogleRouteMap {...props} night stops={[{ ...stops[0], state: "done", pos: [56.2, 9.2] }, stops[1]]} />);
    expect(mocks.pins).toHaveLength(3);
    expect(pin.title).toBe("Stop 1 (udført)");
    expect(pin.position).toEqual({ lat: 56.2, lng: 9.2 });
    expect(pin.zIndex).toBe(5);
    expect(pin.content).not.toBe(initialContent);
    view.rerender(<GoogleRouteMap {...props} stops={[{ ...stops[0], highlighted: true }, stops[1]]} />);
    expect(pin.title).toBe("Stop 1"); expect(pin.zIndex).toBe(40);
    expect(mocks.pins[2]).toBe(startPin);
    expect(mocks.pins).toHaveLength(3);
  });

  it("detaches removed pins and clears listeners on unmount", async () => {
    const props = makeProps(); const view = render(<GoogleRouteMap {...props} />);
    await waitFor(() => expect(mocks.pins).toHaveLength(3));
    view.rerender(<GoogleRouteMap {...props} stops={[stops[0]]} start={null} />);
    expect(mocks.pins[1].map).toBeNull(); expect(mocks.pins[2].map).toBeNull();
    view.unmount();
    expect(mocks.pins[0].map).toBeNull();
    for (const pin of mocks.pins) expect(mocks.clear).toHaveBeenCalledWith(pin);
  });

  it("reports marker library failures through the existing fallback", async () => {
    mocks.importLibrary.mockRejectedValue(new Error("unavailable"));
    const props = makeProps(); render(<GoogleRouteMap {...props} />);
    await waitFor(() => expect(props.onFailure).toHaveBeenCalledOnce());
    expect(mocks.pins).toHaveLength(0);
  });

  it("keeps the compact labelled recenter action available after manual map movement", async () => {
    const props = makeProps();
    const view = render(<GoogleRouteMap {...props} routeStarted userPos={[56, 9]} />);
    const button = await view.findByRole("button", { name: "Centrér kortet på min position" });
    expect(button.textContent).toContain("Centrér");
    expect(button.classList.contains("route-map-recenter")).toBe(true);
    fireEvent.click(button);
    expect(props.onRecenter).toHaveBeenCalledOnce();
  });
});