/* eslint-disable @next/next/no-img-element */

/* Cover karya yang tidak memotong gambar: gambar utuh (contain) di atas
   versi blur-nya sendiri, jadi poster portrait maupun landscape tetap penuh.
   `zoom` — gambar depan sedikit membesar saat parent `.group` di-hover.
   Lapisan blur sengaja tidak ikut di-scale: blur besar yang ikut bergerak
   memaksa repaint tiap frame dan bikin hover patah-patah. */
export function KaryaCover({
  src,
  alt,
  className = "aspect-[4/3]",
  zoom = false,
}: {
  src: string;
  alt: string;
  className?: string;
  zoom?: boolean;
}) {
  return (
    <div className={`relative w-full overflow-hidden bg-paper ${className}`}>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-xl"
      />
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`relative h-full w-full object-contain ${
          zoom ? "transform-gpu transition-transform duration-700 ease-[cubic-bezier(.32,.72,0,1)] will-change-transform group-hover:scale-[1.04]" : ""
        }`}
        onError={(e) => {
          (e.target as HTMLImageElement).style.visibility = "hidden";
        }}
      />
    </div>
  );
}
