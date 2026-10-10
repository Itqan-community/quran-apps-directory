"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

export function ScreenshotSwiper({
  images,
  alt,
  title,
  dir,
}: {
  images: string[];
  alt: string;
  title: string;
  dir: "ltr" | "rtl";
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: true, direction: dir });
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (emblaApi) {
      setSelected(emblaApi.selectedScrollSnap());
      setCount(emblaApi.scrollSnapList().length);
    }
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    const init = () => setCount(emblaApi.scrollSnapList().length);
    requestAnimationFrame(init);
  }, [emblaApi, images]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((v) => (v === null ? null : (v + 1) % images.length));
      if (e.key === "ArrowLeft") setLightbox((v) => (v === null ? null : (v - 1 + images.length) % images.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, images.length]);

  return (
    <div className="screenshots-section">
      <div className="section-header">
        <h2>{title}</h2>
        <div className="carousel-nav-buttons">
          <button
            type="button"
            className="nav-btn"
            onClick={scrollPrev}
            disabled={images.length < 2}
            aria-label="Previous"
          >
            <svg width="11" height="20" viewBox="0 0 11 20" fill="none" aria-hidden="true">
              <path
                d="M10.617 0.924C10.888 1.195 10.888 1.635 10.617 1.906L1.802 10.72L10.617 19.535C10.888 19.806 10.888 20.246 10.617 20.517C10.346 20.788 9.906 20.788 9.635 20.517L0.566 11.448C0.164 11.046 0.164 10.395 0.566 9.993L9.635 0.924C9.906 0.653 10.346 0.653 10.617 0.924Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            type="button"
            className="nav-btn"
            onClick={scrollNext}
            disabled={images.length < 2}
            aria-label="Next"
          >
            <svg width="11" height="20" viewBox="0 0 11 20" fill="none" aria-hidden="true">
              <path
                d="M0.383 20.076C0.112 19.805 0.112 19.365 0.383 19.094L9.198 10.28L0.383 1.465C0.112 1.194 0.112 0.754 0.383 0.483C0.654 0.212 1.094 0.212 1.365 0.483L10.434 9.552C10.836 9.954 10.836 10.605 10.434 11.007L1.365 20.076C1.094 20.347 0.654 20.347 0.383 20.076Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="default-screenshot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/Elements.svg"
            alt={`${alt} ${title}`}
            className="carousel-image default-image"
          />
        </div>
      ) : (
        <>
          <div ref={emblaRef} className="screens-swiper">
            <div className="flex">
              {images.map((src, i) => (
                <div key={i} className="swiper-slide shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${alt} screenshot ${i + 1}`}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="carousel-image clickable"
                    onClick={() => setLightbox(i)}
                  />
                </div>
              ))}
            </div>
          </div>
          {count > 1 && (
            <div className="swiper-pagination">
              {Array.from({ length: count }, (_, i) => (
                <button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`swiper-pagination-bullet ${i === selected ? "swiper-pagination-bullet-active" : ""}`}
                />
              ))}
            </div>
          )}
        </>
      )}

      {lightbox !== null && images[lightbox] && (
        <div
          className="lightbox-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightbox(null);
          }}
        >
          <button onClick={() => setLightbox(null)} className="lightbox-close" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          {images.length > 1 && (
            <>
              <button
                onClick={() => setLightbox((lightbox - 1 + images.length) % images.length)}
                className="lightbox-nav-btn prev"
                aria-label="Previous"
              >
                <svg width="12" height="20" viewBox="0 0 11 20" fill="none" aria-hidden="true">
                  <path d="M10.617 0.924C10.888 1.195 10.888 1.635 10.617 1.906L1.802 10.72L10.617 19.535C10.888 19.806 10.888 20.246 10.617 20.517C10.346 20.788 9.906 20.788 9.635 20.517L0.566 11.448C0.164 11.046 0.164 10.395 0.566 9.993L9.635 0.924C9.906 0.653 10.346 0.653 10.617 0.924Z" fill="currentColor" />
                </svg>
              </button>
              <button
                onClick={() => setLightbox((lightbox + 1) % images.length)}
                className="lightbox-nav-btn next"
                aria-label="Next"
              >
                <svg width="12" height="20" viewBox="0 0 11 20" fill="none" aria-hidden="true">
                  <path d="M0.383 20.076C0.112 19.805 0.112 19.365 0.383 19.094L9.198 10.28L0.383 1.465C0.112 1.194 0.112 0.754 0.383 0.483C0.654 0.212 1.094 0.212 1.365 0.483L10.434 9.552C10.836 9.954 10.836 10.605 10.434 11.007L1.365 20.076C1.094 20.347 0.654 20.347 0.383 20.076Z" fill="currentColor" />
                </svg>
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[lightbox]} alt={`${alt} screenshot ${lightbox + 1}`} />
        </div>
      )}
    </div>
  );
}
