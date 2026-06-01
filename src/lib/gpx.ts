export interface GpxPoint {
  lat: number;
  lon: number;
  ele: number;
}

export interface GpxData {
  points: GpxPoint[];
  distanceKm: number;
  elevationGain: number;
  elevationLoss: number;
}

function haversine(a: GpxPoint, b: GpxPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function parseGpx(xml: string): GpxData {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error("Invalid GPX file");
  const trkpts = Array.from(doc.getElementsByTagName("trkpt"));
  const pts: GpxPoint[] = trkpts.length
    ? trkpts.map((p) => ({
        lat: parseFloat(p.getAttribute("lat") || "0"),
        lon: parseFloat(p.getAttribute("lon") || "0"),
        ele: parseFloat(p.getElementsByTagName("ele")[0]?.textContent || "0"),
      }))
    : Array.from(doc.getElementsByTagName("rtept")).map((p) => ({
        lat: parseFloat(p.getAttribute("lat") || "0"),
        lon: parseFloat(p.getAttribute("lon") || "0"),
        ele: parseFloat(p.getElementsByTagName("ele")[0]?.textContent || "0"),
      }));

  if (pts.length < 2) throw new Error("Not enough track points in GPX");

  let distance = 0;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < pts.length; i++) {
    distance += haversine(pts[i - 1], pts[i]);
    const d = pts[i].ele - pts[i - 1].ele;
    if (d > 0) gain += d;
    else loss += -d;
  }

  return {
    points: pts,
    distanceKm: distance / 1000,
    elevationGain: gain,
    elevationLoss: loss,
  };
}
