/** Skeleton shown while /galeri data is loading (film strip = default view). */
export default function GaleriLoading() {
  return (
    <>
      {/* Collections bar skeleton */}
      <div className="border-b border-line bg-background">
        <div className="flex h-14 items-center gap-2 px-4 md:px-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-24 shrink-0 animate-pulse rounded-sm bg-surface"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Film strip skeleton: thumbnail rail | stage | KATALOG panel */}
      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[clamp(150px,16vw,240px)_1fr_340px] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[clamp(150px,16vw,240px)_1fr_360px]">
        {/* Thumbnail rail — horizontal strip on mobile, column on desktop */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-line p-3 lg:flex-col lg:gap-3 lg:overflow-y-auto lg:border-r lg:border-t-0 lg:p-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] w-16 shrink-0 animate-pulse rounded-sm bg-surface lg:w-full"
              style={{ animationDelay: `${i * 70}ms` }}
            />
          ))}
        </div>

        {/* Stage */}
        <div className="min-h-[48vh] flex-1 bg-surface/30 lg:min-h-0" />

        {/* KATALOG panel */}
        <div className="flex flex-col gap-4 border-t border-line p-6 lg:border-l lg:border-t-0">
          <div className="h-3 w-16 animate-pulse rounded-sm bg-surface" />
          <div className="h-12 w-24 animate-pulse rounded-sm bg-surface" />
          <div className="h-9 w-3/4 animate-pulse rounded-sm bg-surface" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-full animate-pulse rounded-sm bg-surface"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      </div>

      <div className="mt-auto" />
    </>
  );
}
