import "../styles/skeletonloader.css";

export default function SkeletonLoader() {
  return (
    <div className="skeleton-wrapper">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div className="skeleton-card" key={idx}></div>
      ))}
    </div>
  );
}
