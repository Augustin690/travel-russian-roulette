interface Props {
  lng: number;
  lat: number;
  label: string;
}

export default function MapEmbed({ lng, lat, label }: Props) {
  const d = 0.08; // degrees — roughly 8 km bounding box
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-cream/10">
      <iframe
        src={src}
        title={`Map of ${label}`}
        className="absolute inset-0 w-full h-full"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
