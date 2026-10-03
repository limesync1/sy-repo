import "leaflet";
declare module "leaflet" {
  interface MapOptions { rotate?: boolean; bearing?: number; rotateControl?: boolean; touchRotate?: boolean; }
  interface Map { setBearing(bearing: number): void; getBearing(): number; }
}
declare module "leaflet-rotate";
